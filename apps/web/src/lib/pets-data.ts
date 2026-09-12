import { eq, asc, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getStorage } from "./storage";

export interface ResolvedMedia {
  id: string;
  type: "photo" | "video";
  url: string;
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
      caption: m.caption,
      width: m.width,
      height: m.height,
      isProfileHero: m.isProfileHero,
      orderIndex: m.orderIndex,
    })),
  );

  const heroMedia = media.find((m) => m.isProfileHero) ?? media[0] ?? null;

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
