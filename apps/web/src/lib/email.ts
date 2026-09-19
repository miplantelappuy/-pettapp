// Envío de email mínimo vía la API HTTP de Resend directa (sin su SDK, para
// no sumar una dependencia más) — en desarrollo, si no hay RESEND_API_KEY
// configurada, imprime por consola en vez de fallar, así se puede probar el
// flujo sin cuenta de Resend. Esta misma falta de configuración es la razón
// por la que, en producción, ni el magic link ni los avisos de escaneo por
// mail se mandan todavía — hace falta cargar RESEND_API_KEY y EMAIL_FROM
// como variables de entorno en Railway (con una cuenta de Resend real)
// antes de que cualquiera de los dos funcione de verdad.
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[dev] Email para ${to} ("${subject}"): ${html}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`No se pudo enviar el email: ${res.status} ${await res.text()}`);
  }
}

export async function sendMagicLinkEmail(email: string, url: string) {
  await sendEmail(
    email,
    "Tu enlace para entrar",
    `<p>Tocá para entrar: <a href="${url}">${url}</a></p><p>Vence en 15 minutos.</p>`,
  );
}

export interface ScanNotificationEmail {
  petName: string;
  /** URL absoluta a Google Maps si quien escaneó compartió su ubicación. */
  mapsUrl: string | null;
  /** URL (relativa o absoluta) al panel de Gestionar de esta mascota. */
  manageUrl: string;
}

// Mismo aviso que ya manda el push (ver lib/push.ts), por el mismo evento —
// no reemplaza al push, es un canal adicional para quien prefiera enterarse
// por mail o no tenga notificaciones activadas en el navegador.
export async function sendScanNotificationEmail(to: string, data: ScanNotificationEmail) {
  const subject = data.mapsUrl ? `📍 Ubicación de ${data.petName}` : `🐾 Escanearon la chapita de ${data.petName}`;
  const html = data.mapsUrl
    ? `<p>Alguien compartió dónde escaneó la chapita de <strong>${data.petName}</strong>.</p>
       <p><a href="${data.mapsUrl}">Ver la ubicación en Google Maps</a></p>
       <p><a href="${data.manageUrl}">Ir al panel de ${data.petName}</a></p>`
    : `<p>Alguien acaba de abrir el perfil de emergencia de <strong>${data.petName}</strong>.</p>
       <p><a href="${data.manageUrl}">Ir al panel de ${data.petName}</a></p>`;
  await sendEmail(to, subject, html);
}
