import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { getStorage } from "@/lib/storage";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // misma cota que /api/gifts/upload

// POST /api/pets/[petId]/milestones (multipart/form-data: title, occurredOn, file)
// Un hito del "camino de vida" (sección Crecimiento): foto + fecha + título
// corto. A diferencia de las fotos del álbum (URL firmada directa a R2), acá
// el archivo pasa por el servidor porque de paso viene con datos (título,
// fecha) que hay que guardar en la misma operación — no se gana nada
// partiéndolo en dos pasos como con las fotos sueltas.
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
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Falta una foto para el hito" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "La foto pesa demasiado (máximo 15MB)." }, { status: 400 });
  }

  const id = randomUUID();
  const ext = (file.type.split("/")[1] ?? "jpg").split(";")[0];
  const key = `pets/${petId}/milestones/${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getStorage();
  await storage.putObject(key, buffer, file.type);
  const photoUrl = await storage.getReadUrl(key);

  await db.insert(schema.petMilestones).values({
    id,
    petId,
    title: title.trim().slice(0, 120),
    occurredOn,
    storageKey: key,
  });

  return NextResponse.json({ id, title: title.trim().slice(0, 120), occurredOn, photoUrl }, { status: 201 });
}
