import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";

interface Body {
  organizationId: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

// El navegador llama acá después de que el dueño acepta el permiso de
// notificaciones — guarda su suscripción para que /api/qr/scan le pueda
// avisar cuando alguien escanea la chapita.
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await request.json()) as Body;
  if (!body?.organizationId || !body?.subscription?.endpoint) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const membership = await db.query.member.findFirst({
    where: eq(schema.member.organizationId, body.organizationId),
  });
  if (!membership) return NextResponse.json({ error: "Organización inválida" }, { status: 403 });

  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(schema.pushSubscriptions.endpoint, body.subscription.endpoint),
  });
  if (existing) {
    return NextResponse.json({ ok: true }); // ya estaba guardada
  }

  await db.insert(schema.pushSubscriptions).values({
    id: randomUUID(),
    organizationId: body.organizationId,
    endpoint: body.subscription.endpoint,
    p256dh: body.subscription.keys.p256dh,
    auth: body.subscription.keys.auth,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
