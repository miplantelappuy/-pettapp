import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { sendPushToOrganization } from "@/lib/push";
import { sendScanNotificationEmail } from "@/lib/email";
import { crossSurfaceUrl, absoluteCrossSurfaceUrl } from "@/lib/env";

interface Body {
  token: string;
  lat?: number;
  lng?: number;
}

// Ruta PÚBLICA (sin login) — la llama quien encontró a la mascota, desde el
// perfil de emergencia. Registra el escaneo y avisa a la familia por push.
// Se llama hasta 2 veces por visita: una apenas se abre la página (sin
// ubicación, para avisar YA) y otra si el navegador consigue la ubicación
// del que escaneó (con su permiso explícito vía el propio diálogo del
// navegador) — ver EmergencyActions.tsx.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  if (!body?.token) return NextResponse.json({ error: "Falta token" }, { status: 400 });

  const tag = await db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, body.token) });
  if (!tag || !tag.petId) return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, tag.petId) });
  if (!pet) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });

  const hasGeo = typeof body.lat === "number" && typeof body.lng === "number";

  await db.insert(schema.qrScans).values({
    id: randomUUID(),
    qrTagId: tag.id,
    geoShared: hasGeo,
    lat: hasGeo ? String(body.lat) : null,
    lng: hasGeo ? String(body.lng) : null,
    notified: true,
  });

  try {
    if (hasGeo) {
      // OJO: antes esto apuntaba directo a maps.google.com. Un service
      // worker abriendo una URL de otro origen con clients.openWindow() es
      // poco confiable entre navegadores (en la práctica, al tocar la
      // notificación no pasaba nada) — en cambio, un link normal (<a href>)
      // a Maps SIEMPRE funciona. Por eso ahora la notificación lleva al
      // propio panel de Gestionar, que ya muestra la última ubicación
      // compartida con ese link de verdad (ver ManagePet.tsx).
      await sendPushToOrganization(pet.organizationId, {
        title: `📍 Ubicación de ${pet.name}`,
        body: "Alguien compartió dónde escaneó su chapita. Tocá para verla.",
        url: crossSurfaceUrl(pet.slug, "/gestionar"),
      });
    } else {
      await sendPushToOrganization(pet.organizationId, {
        title: `🐾 Escanearon la chapita de ${pet.name}`,
        body: "Alguien acaba de abrir su perfil de emergencia.",
      });
    }
  } catch (err) {
    // Un fallo al notificar no debe romper el registro del escaneo en sí.
    console.error("No se pudo mandar la notificación push:", err);
  }

  // Mismo evento, canal aparte — un mail además del push, solo si el dueño
  // cargó un email para avisos (ver "Avisos" en Gestionar). Nunca debe
  // romper la respuesta si falla (o si RESEND_API_KEY todavía no está
  // configurada en Railway — ver lib/email.ts).
  if (pet.notifyEmail) {
    try {
      await sendScanNotificationEmail(pet.notifyEmail, {
        petName: pet.name,
        mapsUrl: hasGeo ? `https://maps.google.com/?q=${body.lat},${body.lng}` : null,
        manageUrl: absoluteCrossSurfaceUrl(pet.slug, "/gestionar"),
      });
    } catch (err) {
      console.error("No se pudo mandar el email de aviso:", err);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
