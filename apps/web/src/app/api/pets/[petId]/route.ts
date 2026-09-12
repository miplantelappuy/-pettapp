import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { albumStyles } from "@/app/surfaces/pet/recuerdos/album-styles/registry";

interface Body {
  templateId?: string;
  bioPhrase?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyPhotoMediaId?: string | null;
}

// PATCH /api/pets/:petId — edición general que hace el dueño desde "Gestionar
// mascota": cambiar de estilo de álbum, la frase emocional, y el contacto de
// emergencia que ve quien escanea la chapita.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = (await request.json()) as Body;
  const patch: Record<string, string | null> = {};

  if (body.templateId !== undefined) {
    if (!albumStyles[body.templateId]) {
      return NextResponse.json({ error: "Estilo de álbum inválido" }, { status: 400 });
    }
    patch.templateId = body.templateId;
  }
  if (body.bioPhrase !== undefined) patch.bioPhrase = body.bioPhrase;
  if (body.emergencyContactName !== undefined) patch.emergencyContactName = body.emergencyContactName;
  if (body.emergencyContactPhone !== undefined) patch.emergencyContactPhone = body.emergencyContactPhone;
  if (body.emergencyPhotoMediaId !== undefined) {
    if (body.emergencyPhotoMediaId !== null) {
      // Solo se puede elegir una foto propia de ESTA mascota (nunca un
      // video ni la de otra mascota) — evita que alguien mande cualquier
      // id de media ajeno a mano.
      const media = await db.query.petMedia.findFirst({ where: eq(schema.petMedia.id, body.emergencyPhotoMediaId) });
      if (!media || media.petId !== petId || media.type !== "photo") {
        return NextResponse.json({ error: "Foto inválida para el perfil de emergencia" }, { status: 400 });
      }
    }
    patch.emergencyPhotoMediaId = body.emergencyPhotoMediaId;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- patch se arma dinámicamente campo por campo
  await db.update(schema.pets).set(patch as any).where(eq(schema.pets.id, petId));
  return NextResponse.json({ ok: true });
}
