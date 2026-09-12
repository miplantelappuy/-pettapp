// Envío de email mínimo para el magic link. En desarrollo, si no hay
// RESEND_API_KEY configurada, lo imprime por consola en vez de fallar —
// así se puede probar el flujo de auth localmente sin cuenta de Resend.
export async function sendMagicLinkEmail(email: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[dev] Magic link para ${email}: ${url}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Tu enlace para entrar",
      html: `<p>Tocá para entrar: <a href="${url}">${url}</a></p><p>Vence en 15 minutos.</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`No se pudo enviar el magic link: ${res.status} ${await res.text()}`);
  }
}
