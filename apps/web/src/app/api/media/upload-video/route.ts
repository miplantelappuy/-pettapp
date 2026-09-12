import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

// POST /api/media/upload-video (multipart/form-data: petId, file)
//
// A diferencia de las fotos (subida directa a R2 con URL firmada, ver
// /api/media/upload-url), el video SÍ pasa por este servidor a propósito:
// necesitamos comprimirlo antes de guardarlo. Un video de celular sin tocar
// puede pesar cientos de MB y venir en un códec que no todos los navegadores
// reproducen — de ahí que tardara "muchísimo" en cargar y a veces ni se
// llegara a ver. Con ffmpeg lo pasamos a un MP4 liviano y compatible:
//  - sin audio (la portada siempre se reproduce muda, así que no hace falta)
//  - recortado a como mucho MAX_DURATION_S (es un fondo en loop, no una
//    película — no tiene sentido guardar/servir minutos de video)
//  - achicado a como mucho MAX_WIDTH de ancho
// El resultado es un archivo mucho más chico que carga rápido para
// cualquiera que abra el perfil de la mascota.
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024; // tope del video ORIGINAL que se acepta subir
const MAX_DURATION_S = 20;
const MAX_WIDTH = 720;

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

  if (!ffmpegPath) {
    // No debería pasar en producción (Railway corre Linux x64, para el que
    // ffmpeg-static sí trae binario) — cubierto igual para no romper con un
    // error críptico si algún día cambia el runtime.
    console.error("[upload-video] ffmpeg-static no encontró un binario para esta plataforma");
    return NextResponse.json({ error: "No se pudo procesar el video en el servidor" }, { status: 500 });
  }

  const mediaId = randomUUID();
  const workDir = await mkdtemp(join(tmpdir(), "pettapp-video-"));
  const inputPath = join(workDir, "input");
  const outputPath = join(workDir, "output.mp4");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        // Sin esto, ffmpeg/libx264 detectan la cantidad de CPUs de la
        // MÁQUINA FÍSICA (llegamos a ver "threads=40" en los logs), no la
        // cuota real del contenedor de Railway — con un video de celular en
        // 4K, eso satura todo, el proceso queda directamente colgado en el
        // frame 0 durante minutos y termina matado por el sistema (SIGKILL,
        // consistente con quedarse sin memoria) en vez de terminar rápido.
        // Limitarlo a 2 hilos, tanto para decodificar como para codificar,
        // es lo que lo destraba.
        "-threads",
        "2",
        "-i",
        inputPath,
        "-t",
        String(MAX_DURATION_S),
        // La coma escapada evita que ffmpeg la lea como separador de filtros
        // (acá no pasamos por una shell, así que las comillas que se usan en
        // ejemplos de consola no aplican). Si el video ya es más angosto que
        // MAX_WIDTH, min() lo deja como está — nunca lo agranda.
        "-vf",
        `scale=min(${MAX_WIDTH}\\,iw):-2`,
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-threads",
        "2",
        "-preset",
        "ultrafast", // prioriza terminar rápido y liviano por sobre comprimir un poco mejor
        "-crf",
        "30",
        "-pix_fmt",
        "yuv420p", // compatibilidad amplia (Safari incluido), más allá del códec de origen
        "-an",
        "-movflags",
        "+faststart", // permite que el navegador empiece a reproducir antes de bajar el archivo entero
        outputPath,
      ],
      { timeout: 120_000 },
    );

    const compressed = await readFile(outputPath);
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
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
