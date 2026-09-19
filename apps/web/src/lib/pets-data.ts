import { eq, asc, desc, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getStorage } from "./storage";

export interface ResolvedMedia {
  id: string;
  type: "photo" | "video";
  url: string;
  /** Solo en videos: un frame fijo (JPG) para mostrar al instante como
   * atributo `poster` mientras el video de verdad carga de fondo. null en
   * fotos y en videos subidos antes de que existiera esto. */
  posterUrl: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  isProfileHero: boolean;
  orderIndex: number;
}

export interface PetHomeData {
  id: string;
  slug: string;
  name: string;
  species: string;
  bioPhrase: string | null;
  birthDate: string | null;
  birthDatePrecision: string;
  templateId: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  /** Cuál de las fotos ya cargadas eligió el dueño para el perfil de
   * emergencia (nunca un video) — null si todavía no eligió ninguna. */
  emergencyPhotoMediaId: string | null;
  /** La URL ya resuelta de esa foto — con fallback a la primera foto
   * disponible si el dueño todavía no eligió una, para que el perfil de
   * emergencia nunca se vea vacío. null solo si no hay ninguna foto cargada. */
  emergencyPhotoUrl: string | null;
  /** Cuál foto eligió el dueño como ícono de "agregar a la pantalla de
   * inicio" — null si todavía no eligió ninguna. */
  iconMediaId: string | null;
  /** La URL ya resuelta de esa foto, con el mismo fallback que
   * emergencyPhotoUrl (primera foto disponible) para que el ícono nunca
   * quede vacío una vez que hay al menos una foto cargada. */
  iconUrl: string | null;
  /** true mientras el dueño la marcó como perdida a mano desde Gestionar —
   * activa el modo alerta en el perfil público (ver resolveScanView en
   * lib/qr.js) y habilita la imagen para compartir. */
  lostMode: boolean;
  lostModeActivatedAt: string | null;
  heroMedia: ResolvedMedia | null;
  media: ResolvedMedia[];
}

// Único punto donde se arma el Home/Álbum a partir de la base — así, si mañana
// cambia cómo se resuelven las URLs de las fotos (por ej. al activar R2),
// se toca acá y no en cada componente visual.
export async function getPetHomeData(slug: string): Promise<PetHomeData | null> {
  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.slug, slug) });
  if (!pet) return null;

  const rawMedia = await db.query.petMedia.findMany({
    where: eq(schema.petMedia.petId, pet.id),
    orderBy: [asc(schema.petMedia.orderIndex), asc(schema.petMedia.createdAt)],
  });

  const storage = getStorage();
  const media: ResolvedMedia[] = await Promise.all(
    rawMedia.map(async (m) => ({
      id: m.id,
      type: m.type as "photo" | "video",
      url: await storage.getReadUrl(m.storageKey),
      posterUrl: m.posterKey ? await storage.getReadUrl(m.posterKey) : null,
      caption: m.caption,
      width: m.width,
      height: m.height,
      isProfileHero: m.isProfileHero,
      orderIndex: m.orderIndex,
    })),
  );

  // La portada del Home ya NO se elige a mano (ver ManagePet) — rota sola,
  // una al azar entre TODAS las fotos y videos cada vez que se entra a la
  // app, para que nunca se sienta "la misma pantalla" dos veces seguidas.
  const heroMedia = media.length > 0 ? media[Math.floor(Math.random() * media.length)] : null;

  // El perfil de emergencia SÍ necesita algo fijo, elegido por el dueño, y
  // que sea siempre una foto (nunca puede depender de que un video cargue,
  // es la pantalla que ve alguien ayudando a una mascota perdida). Si
  // todavía no eligió ninguna, cae a la primera foto que haya.
  const chosenEmergencyPhoto = pet.emergencyPhotoMediaId
    ? media.find((m) => m.id === pet.emergencyPhotoMediaId && m.type === "photo")
    : undefined;
  const emergencyPhotoUrl = (chosenEmergencyPhoto ?? media.find((m) => m.type === "photo"))?.url ?? null;

  // Mismo criterio que la foto de emergencia: siempre una foto (nunca un
  // video — un ícono no puede depender de que algo cargue), con fallback a
  // la primera disponible para que, apenas hay una foto cargada, "agregar a
  // inicio" ya se vea bien sin que el dueño tenga que elegir nada todavía.
  const chosenIcon = pet.iconMediaId ? media.find((m) => m.id === pet.iconMediaId && m.type === "photo") : undefined;
  const iconUrl = (chosenIcon ?? media.find((m) => m.type === "photo"))?.url ?? null;

  return {
    id: pet.id,
    slug: pet.slug,
    name: pet.name,
    species: pet.species,
    bioPhrase: pet.bioPhrase,
    birthDate: pet.birthDate,
    birthDatePrecision: pet.birthDatePrecision,
    templateId: pet.templateId,
    emergencyContactName: pet.emergencyContactName,
    emergencyContactPhone: pet.emergencyContactPhone,
    emergencyPhotoMediaId: pet.emergencyPhotoMediaId,
    emergencyPhotoUrl,
    iconMediaId: pet.iconMediaId,
    iconUrl,
    lostMode: pet.lostMode,
    lostModeActivatedAt: pet.lostModeActivatedAt ? pet.lostModeActivatedAt.toISOString() : null,
    heroMedia,
    media,
  };
}

// El token de la chapita ACTIVA de una mascota (si tiene una vinculada) —
// con esto se arma el link real a su propio perfil de emergencia
// (tag.BASE_DOMAIN/t/<token>, ver lib/env.ts#emergencyPath), para que desde
// Gestionar el dueño pueda "visualizar" ese perfil sin tener que escanear la
// chapita física. null si todavía no vinculó ninguna.
export async function getActiveTagToken(petId: string): Promise<string | null> {
  const tag = await db.query.qrTags.findFirst({
    where: and(eq(schema.qrTags.petId, petId), eq(schema.qrTags.status, "active")),
  });
  return tag?.publicToken ?? null;
}

export interface LastScanLocation {
  lat: number;
  lng: number;
  scannedAt: string;
}

// La última vez que alguien escaneó la chapita ACTIVA de esta mascota y
// compartió su ubicación (no todos los escaneos la comparten — es opcional
// para quien encuentra a la mascota). Reutiliza qr_scans, que ya guarda cada
// escaneo con o sin ubicación — no hace falta ninguna columna nueva. null si
// todavía no hay ninguna chapita activa, o si nunca compartieron ubicación.
export async function getLastSharedScan(petId: string): Promise<LastScanLocation | null> {
  const tag = await db.query.qrTags.findFirst({
    where: and(eq(schema.qrTags.petId, petId), eq(schema.qrTags.status, "active")),
  });
  if (!tag) return null;

  const scan = await db.query.qrScans.findFirst({
    where: and(eq(schema.qrScans.qrTagId, tag.id), eq(schema.qrScans.geoShared, true)),
    orderBy: [desc(schema.qrScans.scannedAt)],
  });
  if (!scan || scan.lat === null || scan.lng === null) return null;

  return { lat: Number(scan.lat), lng: Number(scan.lng), scannedAt: scan.scannedAt.toISOString() };
}
