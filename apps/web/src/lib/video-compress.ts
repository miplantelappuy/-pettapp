import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

// Compresión de video compartida por TODO lo que acepte subir un video (hoy:
// la portada del panel y, desde que Crecimiento admite "imágenes o videos",
// también los hitos del camino de vida). Vivía duplicada en
// /api/media/upload-video — moverla acá evita que un ajuste futuro (otro
// ancho, otro preset) tenga que hacerse dos veces y termine desincronizado.
//
// Nota de historia (dejarla acá porque es la única forma de que quien toque
// esto de nuevo no repita el mismo error): ffmpeg/libx264 detectan por
// default la cantidad de CPUs de la MÁQUINA FÍSICA del host de Railway, no
// la cuota real del contenedor — con un video de celular pesado eso satura
// todo y el proceso queda colgado hasta que el sistema lo mata. -threads 2
// (repetido para decodificación Y para el encoder) es lo que lo evita.
export interface CompressVideoOptions {
  maxDurationS?: number;
  maxWidth?: number;
}

export interface CompressVideoResult {
  video: Buffer;
  /** Un frame fijo del video ya comprimido, como imagen JPG — se usa como
   * atributo `poster` del <video>: se ve al instante (pesa nada comparado
   * con el video) mientras el video de verdad todavía está cargando de
   * fondo, en vez de sentirse "vacío" hasta que termine de bajar. */
  poster: Buffer;
}

export async function compressVideo(input: Buffer, options: CompressVideoOptions = {}): Promise<CompressVideoResult> {
  if (!ffmpegPath) {
    // No debería pasar en producción (Railway corre Linux x64, para el que
    // ffmpeg-static sí trae binario) — cubierto igual para no romper con un
    // error críptico si algún día cambia el runtime.
    throw new Error("ffmpeg-static no encontró un binario para esta plataforma");
  }

  const maxDurationS = options.maxDurationS ?? 20;
  const maxWidth = options.maxWidth ?? 960;

  const workDir = await mkdtemp(join(tmpdir(), "pettapp-video-"));
  const inputPath = join(workDir, "input");
  const outputPath = join(workDir, "output.mp4");
  const posterPath = join(workDir, "poster.jpg");

  try {
    await writeFile(inputPath, input);

    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-threads",
        "2",
        "-i",
        inputPath,
        "-t",
        String(maxDurationS),
        // La coma escapada evita que ffmpeg la lea como separador de filtros
        // (acá no pasamos por una shell, así que las comillas que se usan en
        // ejemplos de consola no aplican). Si el video ya es más angosto que
        // maxWidth, min() lo deja como está — nunca lo agranda.
        "-vf",
        `scale=min(${maxWidth}\\,iw):-2`,
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-threads",
        "2",
        // "veryfast" en vez de "ultrafast": con -threads 2 ya limitado, la
        // diferencia de tiempo es chica pero la calidad visual mejora
        // bastante — vale la pena ahora que el colgado por hilos está resuelto.
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p", // compatibilidad amplia (Safari incluido), más allá del códec de origen
        "-an", // sin audio — todo lo que usa esto se reproduce mudo
        "-movflags",
        "+faststart", // permite que el navegador empiece a reproducir antes de bajar el archivo entero
        outputPath,
      ],
      { timeout: 150_000 },
    );

    // El poster se saca del archivo YA comprimido (no del original) — es un
    // segundo paso de ffmpeg pero rapidísimo porque el input acá es chico.
    await execFileAsync(
      ffmpegPath,
      ["-y", "-i", outputPath, "-frames:v", "1", "-q:v", "4", posterPath],
      { timeout: 20_000 },
    );

    const [video, poster] = await Promise.all([readFile(outputPath), readFile(posterPath)]);
    return { video, poster };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
