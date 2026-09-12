import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

interface PatchBody {
  isProfileHero?: boolean;
  caption?: string | null;
  orderIndex?: number;
}

async function loadMediaAndCheckOwnership(request: NextRequest, mediaId: string) {
  const media = await db.query.petMedia.findFirst({ where: eq(schema.petMedia.id, mediaId) });
  if (!media) return { ok: false as const, error: "Foto no encontrada", status: 404 as const };

  const check = await assertPetOwnership(request, media.petId);
  if (!check.ok) return check;

  return { ok: true as const, media };
}

// PATCH /api/pets/media/:mediaId — marcar como foto principal (hero), editar
// pie de foto, o reordenar.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const result = await loadMediaAndCheckOwnership(request, mediaId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = (await request.json()) as PatchBody;

  if (body.isProfileHero === true) {
    // Solo puede haber una foto "hero" — les sacamos la marca a las demás de
    // la misma mascota antes de ponérsela a esta.
    await db
      .update(schema.petMedia)
      .set({ isProfileHero: false })
      .where(and(eq(schema.petMedia.petId, result.media.petId), eq(schema.petMedia.isProfileHero, true)));
  }

  const patch: Record<string, unknown> = {};
  if (body.isProfileHero !== undefined) patch.isProfileHero = body.isProfileHero;
  if (body.caption !== undefined) patch.caption = body.caption;
  if (body.orderIndex !== undefined) patch.orderIndex = body.orderIndex;

  if (Object.keys(patch).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- patch se arma dinámicamente campo por campo
    await db.update(schema.petMedia).set(patch as any).where(eq(schema.petMedia.id, mediaId));
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/pets/media/:mediaId — saca la foto de Recuerdos/Álbum.
// TODO Fase 1+: además borrar el archivo del storage (R2/local), no solo la
// fila — se deja para cuando R2 esté configurado de verdad, para no borrar
// archivos que hoy ni siquiera se están probando en serio.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const result = await loadMediaAndCheckOwnership(request, mediaId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await db.delete(schema.petMedia).where(eq(schema.petMedia.id, mediaId));
  return NextResponse.json({ ok: true });
}
