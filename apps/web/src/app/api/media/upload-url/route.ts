import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { getStorage } from "@/lib/storage";

interface Body {
  petId: string;
  contentType: string; // "image/jpeg" | "video/mp4" | ...
  kind: "photo" | "video";
}

// POST /api/media/upload-url
// El navegador sube el archivo DIRECTO a R2 (o al endpoint local en dev) con
// la URL que devuelve esto — el archivo pesado nunca pasa por este servidor.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  if (!body?.petId || !body?.contentType || !body?.kind) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const check = await assertPetOwnership(request, body.petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const mediaId = randomUUID();
  const ext = body.contentType.split("/")[1] ?? "bin";
  const key = `pets/${body.petId}/${mediaId}.${ext}`;

  const storage = getStorage();
  const { uploadUrl } = await storage.getUploadUrl(key, body.contentType);
  // Se devuelve ya resuelta para que el cliente pueda mostrar la foto de
  // inmediato después de subirla, sin tener que volver a pedirle todo a la
  // página (mismo criterio que usa lib/pets-data.ts para el Home/Álbum).
  const readUrl = await storage.getReadUrl(key);

  await db.insert(schema.petMedia).values({
    id: mediaId,
    petId: body.petId,
    type: body.kind,
    storageKey: key,
  });

  // Fase 0/1: sin worker aparte ni cola — se guarda la foto original y se
  // usa directo (Home/Álbum/Gestionar ya muestran la original, ninguna
  // pantalla lee `thumbKey` hoy). Un thumbnail generado aparte solo suma
  // valor cuando haya volumen real de fotos pesadas; hasta entonces, menos
  // piezas moviéndose es mejor.
  return NextResponse.json({ uploadUrl, mediaId, key, readUrl }, { status: 201 });
}
