import { NextResponse, type NextRequest } from "next/server";
import { eq, and, or } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { hasPetAccess } from "@/lib/pin";
import { isAdminEmail } from "@/lib/env";
import { replaceTag, QrTagError } from "@/lib/qr";

interface ReplaceBody {
  // Acepta el código corto ("PET-000123", el que se ve/imprime) o el token
  // largo indistintamente — igual criterio que /api/qr/claim, para que se
  // pueda operar esto a mano con lo que hay a la vista en /app/qr.
  oldPublicToken: string;
  newPublicToken: string;
}

// POST /api/qr/replace
// Chapita perdida/dañada: la mascota conserva perfil, recuerdos e historial
// intactos — solo cambia qué chapita física está vigente. El chequeo de
// dueño de abajo no es opcional: sin él, cualquier cuenta logueada podía
// "robar" la chapita activa de la mascota de otra persona con solo saber
// (o adivinar) los dos códigos.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ReplaceBody | null;
  if (!body?.oldPublicToken || !body?.newPublicToken) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const [oldTag, newTag] = await Promise.all([
    db.query.qrTags.findFirst({
      where: or(eq(schema.qrTags.publicToken, body.oldPublicToken), eq(schema.qrTags.publicCode, body.oldPublicToken)),
    }),
    db.query.qrTags.findFirst({
      where: or(eq(schema.qrTags.publicToken, body.newPublicToken), eq(schema.qrTags.publicCode, body.newPublicToken)),
    }),
  ]);
  if (!oldTag || !newTag) {
    return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });
  }
  if (!oldTag.petId) {
    return NextResponse.json({ error: "Esa chapita no está vinculada a ninguna mascota" }, { status: 409 });
  }

  // Tres caminos válidos: PIN de la mascota, sesión + membresía en su
  // organización (mismo criterio de siempre — ver lib/authz.ts), o una
  // cuenta de operador (ver lib/env.ts#isAdminEmail) — hace falta este
  // tercer camino porque hoy sos vos, no el dueño de cada mascota, quien
  // hace el reemplazo cuando un cliente te avisa que perdió la chapita.
  const petId = oldTag.petId;
  const session = await auth.api.getSession({ headers: request.headers });
  let authorized = await hasPetAccess(petId);
  if (!authorized && session) {
    if (isAdminEmail(session.user.email)) {
      authorized = true;
    } else {
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
