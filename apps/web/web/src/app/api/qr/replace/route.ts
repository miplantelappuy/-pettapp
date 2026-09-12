import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { replaceTag, QrTagError } from "@/lib/qr";

interface ReplaceBody {
  oldPublicToken: string;
  newPublicToken: string;
}

// POST /api/qr/replace
// Chapita perdida/dañada: la mascota conserva perfil, recuerdos e historial
// intactos — solo cambia qué chapita física está vigente.
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as ReplaceBody;
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

  // TODO Fase 1: verificar que oldTag.petId pertenezca a una organización
  // donde `session.user` es miembro, antes de permitir el reemplazo.

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
