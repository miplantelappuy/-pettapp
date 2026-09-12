import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { getStorage } from "@/lib/storage";
import { compressVideo } from "@/lib/video-compress";

export const runtime = "nodejs";

// POST /api/media/upload-video (multipart/form-data: petId, file)
//
// A diferencia de las fotos (subida directa a R2 con URL firmada, ver
// /api/media/upload-url), el video SÍ pasa por este servidor a propósito:
// necesitamos comprimirlo antes de guardarlo. Un video de celular sin tocar
// puede pesar cientos de MB y venir en un códec que no todos los navegadores
// reproducen — de ahí que tardara "muchísimo" en cargar y a veces ni se
// llegara a ver. Con ffmpeg (ver lib/video-compress.ts) lo pasamos a un MP4
// liviano y compatible, sin audio y recortado a un largo razonable.
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024; // tope del video ORIGINAL que se acepta subir

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const petId = form?.get("petId");
  const file = form?.get("file");

  if (typeof petId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "El archivo no es un video" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "El video pesa demasiado (máximo 300MB). Probá con un clip más corto." },
      { status: 400 },
    );
  }

  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const mediaId = randomUUID();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressVideo(buffer);

    const key = `pets/${petId}/${mediaId}.mp4`;
    const storage = getStorage();
    await storage.putObject(key, compressed, "video/mp4");
    const readUrl = await storage.getReadUrl(key);

    await db.insert(schema.petMedia).values({
      id: mediaId,
      petId,
      type: "video",
      storageKey: key,
    });

    return NextResponse.json({ mediaId, key, readUrl }, { status: 201 });
  } catch (err) {
    console.error("[upload-video] fallo al comprimir/subir:", err);
    return NextResponse.json({ error: "No se pudo procesar ese video. Probá con otro archivo." }, { status: 500 });
  }
}
