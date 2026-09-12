import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { getStorage } from "@/lib/storage";
import { compressVideo } from "@/lib/video-compress";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // misma cota que /api/gifts/upload
const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // misma cota que /api/media/upload-video

// POST /api/pets/[petId]/milestones (multipart/form-data: title, occurredOn, file)
// Un hito del "camino de vida" (sección Crecimiento): foto o video + fecha +
// título corto. Igual que la portada del panel, el video se recorta y
// comprime acá mismo con ffmpeg antes de guardarlo (ver lib/video-compress) —
// sin eso, un clip de celular sin tocar puede pesar cientos de MB.
export async function POST(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;

  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const form = await request.formData().catch(() => null);
  const title = form?.get("title");
  const occurredOn = form?.get("occurredOn");
  const file = form?.get("file");

  if (typeof title !== "string" || !title.trim() || typeof occurredOn !== "string" || !occurredOn) {
    return NextResponse.json({ error: "Faltan campos (título, fecha)" }, { status: 400 });
  }
  if (!(file instanceof File) || !(file.type.startsWith("image/") || file.type.startsWith("video/"))) {
    return NextResponse.json({ error: "Falta una foto o video para el hito" }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "El video pesa demasiado (máximo 300MB). Probá con un clip más corto." },
      { status: 400 },
    );
  }
  if (!isVideo && file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "La foto pesa demasiado (máximo 15MB)." }, { status: 400 });
  }

  const id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();

  let key: string;
  let mediaType: "photo" | "video";

  try {
    if (isVideo) {
      const { video: compressed } = await compressVideo(buffer);
      key = `pets/${petId}/milestones/${id}.mp4`;
      await storage.putObject(key, compressed, "video/mp4");
      mediaType = "video";
    } else {
      const ext = (file.type.split("/")[1] ?? "jpg").split(";")[0];
      key = `pets/${petId}/milestones/${id}.${ext}`;
      await storage.putObject(key, buffer, file.type);
      mediaType = "photo";
    }
  } catch (err) {
    console.error("[milestones] fallo al procesar el archivo:", err);
    return NextResponse.json({ error: "No se pudo procesar ese archivo. Probá con otro." }, { status: 500 });
  }

  const mediaUrl = await storage.getReadUrl(key);

  await db.insert(schema.petMilestones).values({
    id,
    petId,
    title: title.trim().slice(0, 120),
    occurredOn,
    storageKey: key,
    mediaType,
  });

  return NextResponse.json(
    { id, title: title.trim().slice(0, 120), occurredOn, mediaUrl, mediaType },
    { status: 201 },
  );
}
