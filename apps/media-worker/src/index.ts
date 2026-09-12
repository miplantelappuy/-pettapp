import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { db, schema } from "@pettapp/db";
import type { ThumbnailJobData } from "@pettapp/queue";

// Proceso separado a propósito (arranca con su propio `npm run dev`, en su
// propio servicio de Railway en producción) — nunca comparte el proceso que
// sirve la web, así una transcodificación pesada no le come CPU al tráfico
// normal.
//
// Fase 0 solo resuelve el caso barato y útil: thumbnail de fotos. La
// transcodificación real de video (perfil optimizado para loops de hero)
// es Fase 1 — acá el job de video queda aceptado y logueado, sin procesar
// de verdad todavía, para no fingir un pipeline que no existe.

const STORAGE_DIR = process.env.LOCAL_STORAGE_DIR ?? "./.storage";

async function readLocal(key: string): Promise<Buffer> {
  return readFile(join(STORAGE_DIR, key));
}

async function writeLocal(key: string, data: Buffer) {
  const filePath = join(STORAGE_DIR, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

const worker = new Worker<ThumbnailJobData>(
  "media-processing",
  async (job) => {
    const { mediaId, storageKey, type } = job.data;

    if (type === "video") {
      console.log(`[media-worker] job de video para ${mediaId} aceptado — transcodificación real es Fase 1`);
      return;
    }

    // STORAGE_PROVIDER=local es lo único que este worker sabe leer/escribir
    // hoy (en R2 real se resuelve con el SDK de S3, mismo patrón que storage.ts).
    if ((process.env.STORAGE_PROVIDER ?? "local") !== "local") {
      throw new Error("El media-worker de Fase 0 solo soporta STORAGE_PROVIDER=local todavía.");
    }

    const original = await readLocal(storageKey);
    const thumbBuffer = await sharp(original).resize(400, 400, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();

    const thumbKey = storageKey.replace(/(\.[a-zA-Z0-9]+)$/, "-thumb.jpg");
    await writeLocal(thumbKey, thumbBuffer);

    await db.update(schema.petMedia).set({ thumbKey }).where(eq(schema.petMedia.id, mediaId));
    console.log(`[media-worker] thumbnail generado para ${mediaId} -> ${thumbKey}`);
  },
  { connection: { url: process.env.REDIS_URL! } },
);

worker.on("failed", (job, err) => {
  console.error(`[media-worker] job ${job?.id} falló:`, err);
});

console.log("[media-worker] escuchando la cola media-processing...");
