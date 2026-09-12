import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { hasPetAccess } from "@/lib/pin";

interface Body {
  petId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

// El navegador llama acá después de que el dueño acepta el permiso de
// notificaciones — guarda su suscripción para que /api/qr/scan le pueda
// avisar cuando alguien escanea la chapita.
//
// Identificamos SIEMPRE por petId (no por organizationId, que el dueño sin
// cuenta ni sabe que existe) y resolvemos la organización acá adentro. La
// autorización acepta CUALQUIERA de los dos accesos que hoy existen al
// panel de una mascota: el PIN (flujo principal, sin cuenta — /gestionar) o
// una sesión de Better Auth con membresía en esa organización (el flujo
// viejo por email, en /app). Antes esto solo aceptaba sesión, por eso quien
// activa avisos desde /gestionar (el único lugar que Facundo usa) nunca
// llegaba a guardar su suscripción — y entonces nunca le llegaba ningún push,
// aunque la persona que escaneaba la chapita sí compartiera su ubicación.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.petId || !body?.subscription?.endpoint) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, body.petId) });
  if (!pet) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });

  const viaPin = await hasPetAccess(body.petId);
  if (!viaPin) {
    const session = await auth.api.getSession({ headers: request.headers });
    const membership = session
      ? await db.query.member.findFirst({
          where: and(eq(schema.member.organizationId, pet.organizationId), eq(schema.member.userId, session.user.id)),
        })
      : null;
    if (!membership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(schema.pushSubscriptions.endpoint, body.subscription.endpoint),
  });
  if (existing) {
    return NextResponse.json({ ok: true }); // ya estaba guardada
  }

  await db.insert(schema.pushSubscriptions).values({
    id: randomUUID(),
    organizationId: pet.organizationId,
    endpoint: body.subscription.endpoint,
    p256dh: body.subscription.keys.p256dh,
    auth: body.subscription.keys.auth,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
