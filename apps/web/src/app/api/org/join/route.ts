import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { verifyOrgInviteToken } from "@/lib/pin";

// POST /api/org/join — el otro lado de /api/pets/[petId]/share-link: quien
// abrió el enlace, ya con sesión iniciada, confirma y queda sumado como
// miembro real del hogar de esa mascota (rol "member" — puede gestionar
// todo lo mismo que quien lo invitó, salvo generar/revocar enlaces de
// invitación, que se deja para más adelante si hace falta).
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Necesitás iniciar sesión" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const organizationId = verifyOrgInviteToken(body?.token);
  if (!organizationId) {
    return NextResponse.json({ error: "Este enlace venció o no es válido" }, { status: 400 });
  }

  const org = await db.query.organization.findFirst({ where: eq(schema.organization.id, organizationId) });
  if (!org) return NextResponse.json({ error: "Este enlace venció o no es válido" }, { status: 400 });

  const existing = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, session.user.id)),
  });
  if (!existing) {
    await db.insert(schema.member).values({
      id: randomUUID(),
      organizationId,
      userId: session.user.id,
      role: "member",
    });
  }

  return NextResponse.json({ ok: true });
}
