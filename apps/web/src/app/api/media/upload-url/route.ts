import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { mediaQueue } from "@pettapp/queue";

interface Body {
  petId: string;
  contentType: string; // "image/jpeg" | "video/mp4" | ...
  kind: "photo" | "video";
}

// POST /api/media/upload-url
// El navegador sube el archivo DIRECTO a R2 (o al endpoint local en dev) con
// la URL que devuelve esto — el archivo pesado nunca pasa por este servidor.
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body?.petId || !body?.contentType || !body?.kind) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // TODO Fase 1: verificar que body.petId pertenece a una organización de la
  // que `session.user` es miembro.

  const mediaId = randomUUID();
  const ext = body.contentType.split("/")[1] ?? "bin";
  const key = `pets/${body.petId}/${mediaId}.${ext}`;

  const storage = getStorage();
  const { uploadUrl } = await storage.getUploadUrl(key, body.contentType);

  await db.insert(schema.petMedia).values({
    id: mediaId,
    petId: body.petId,
    type: body.kind,
    storageKey: key,
  });

  // El thumbnail se genera en el media-worker, no acá — este endpoint solo
  // encola el trabajo y responde rápido.
  await mediaQueue.add("thumbnail", {
    mediaId,
    petId: body.petId,
    storageKey: key,
    type: body.kind,
  });

  return NextResponse.json({ uploadUrl, mediaId, key }, { status: 201 });
}
