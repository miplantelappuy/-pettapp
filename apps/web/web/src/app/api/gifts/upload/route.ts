import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getStorage } from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB — una foto de celular entra cómoda

// POST /api/gifts/upload (multipart/form-data: token, file, note?)
// A propósito SIN auth de ningún tipo: cualquiera que escaneó la chapita
// puede dejarle una foto a la mascota, esté o no vinculada a su familia.
// Solo hace falta que la chapita esté activa (tenga mascota) — si no, no hay
// a quién regalarle la foto todavía.
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const file = form?.get("file");
  const note = form?.get("note");

  if (typeof token !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se aceptan fotos por ahora." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto pesa demasiado (máximo 15MB)." }, { status: 400 });
  }

  const tag = await db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, token) });
  if (!tag || tag.status !== "active" || !tag.petId) {
    return NextResponse.json({ error: "Esta chapita todavía no tiene una mascota vinculada." }, { status: 404 });
  }

  const giftId = randomUUID();
  const ext = (file.type.split("/")[1] ?? "jpg").split(";")[0];
  const key = `gifts/${tag.petId}/${giftId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getStorage();
  await storage.putObject(key, buffer, file.type);

  await db.insert(schema.petGifts).values({
    id: giftId,
    petId: tag.petId,
    storageKey: key,
    contentType: file.type,
    senderNote: typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : null,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
