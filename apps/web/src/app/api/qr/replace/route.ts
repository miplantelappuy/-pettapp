import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { hasPetAccess } from "@/lib/pin";
import { replaceTag, QrTagError } from "@/lib/qr";

interface ReplaceBody {
  oldPublicToken: string;
  newPublicToken: string;
}

// POST /api/qr/replace
// Chapita perdida/dañada: la mascota conserva perfil, recuerdos e historial
// intactos — solo cambia qué chapita física está vigente. Sin UI todavía que
// llame a esto (no hay botón "reemplazar chapita" en ningún lado) pero la
// ruta queda accesible igual, así que el chequeo de dueño de abajo no es
// opcional: sin él, cualquier cuenta logueada podía "robar" la chapita
// activa de la mascota de otra persona con solo saber (o adivinar) los dos
// tokens.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ReplaceBody | null;
  if (!body?.oldPublicToken || !body?.newPublicToken) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const [oldTag, newTag] = await Promise.all([
    db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, body.oldPublicToken) }),
    db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, body.newPublicToken) }),
  ]);
  if (!oldTag || !newTag) {
    return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });
  }
  if (!oldTag.petId) {
    return NextResponse.json({ error: "Esa chapita no está vinculada a ninguna mascota" }, { status: 409 });
  }

  // Mismo criterio de siempre (PIN de la mascota, o sesión + membresía en su
  // organización — ver lib/authz.ts#assertPetOwnership) para decidir quién
  // puede tocar ESTA mascota en particular.
  const petId = oldTag.petId;
  let authorized = await hasPetAccess(petId);
  if (!authorized) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session) {
      const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
      if (pet) {
        const membership = await db.query.member.findFirst({
          where: and(eq(schema.member.organizationId, pet.organizationId), eq(schema.member.userId, session.user.id)),
        });
        authorized = Boolean(membership);
      }
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { oldTagPatch, newTagPatch } = replaceTag(oldTag, newTag);
    await db.transaction(async (tx) => {
      await tx
        .update(schema.qrTags)
        .set({ ...oldTagPatch, replacedByTagId: newTag.id })
        .where(eq(schema.qrTags.id, oldTag.id));
      await tx.update(schema.qrTags).set(newTagPatch).where(eq(schema.qrTags.id, newTag.id));
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof QrTagError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
