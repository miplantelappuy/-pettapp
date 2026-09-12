import { Queue } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("Falta REDIS_URL");
}

const connection = { url: process.env.REDIS_URL };

export interface ThumbnailJobData {
  mediaId: string;
  petId: string;
  storageKey: string;
  type: "photo" | "video";
}

// Una sola cola en Fase 0 (thumbnail de fotos). La transcodificación de video
// real es Fase 1 — el worker ya queda separado del proceso web, que es lo
// que pedía la arquitectura, aunque el job en sí sea simple todavía.
export const mediaQueue = new Queue<ThumbnailJobData>("media-processing", { connection });
