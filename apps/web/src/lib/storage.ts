// Abstracción de almacenamiento de medios. Dos implementaciones:
//  - R2Storage: producción real, contra Cloudflare R2 (API S3-compatible).
//  - LocalFsStorage: solo para desarrollo, guarda en disco. Existe para poder
//    programar y probar el flujo de subida sin depender de credenciales de
//    R2 — no reemplaza la prueba real contra R2, que hay que hacer antes de
//    ir a producción.
// Cuál se usa lo decide STORAGE_PROVIDER (env), nunca un import directo.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export interface StorageProvider {
  /** URL firmada para que el navegador suba el archivo directo, sin pasar por nuestro servidor. */
  getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; key: string }>;
  /** URL firmada de lectura (contenido privado por defecto). */
  getReadUrl(key: string): Promise<string>;
}

class R2Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = required("R2_ACCOUNT_ID");
    this.bucket = required("R2_BUCKET");
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 60 * 5 });
    return { uploadUrl, key };
  }

  async getReadUrl(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 60 * 10 });
  }
}

class LocalFsStorage implements StorageProvider {
  private dir: string;

  constructor() {
    this.dir = process.env.LOCAL_STORAGE_DIR ?? "./.storage";
  }

  async getUploadUrl(key: string) {
    // No hay "URL firmada" real en local — se resuelve con un endpoint propio
    // (ver app/api/media/upload-url) que recibe el archivo y lo escribe a disco.
    return { uploadUrl: `/api/media/local-upload?key=${encodeURIComponent(key)}`, key };
  }

  async getReadUrl(key: string) {
    return `/api/media/local-read?key=${encodeURIComponent(key)}`;
  }

  async writeLocal(key: string, data: Buffer) {
    const filePath = join(this.dir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} para usar STORAGE_PROVIDER=r2`);
  return v;
}

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (instance) return instance;
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  instance = provider === "r2" ? new R2Storage() : new LocalFsStorage();
  return instance;
}

export { LocalFsStorage };
