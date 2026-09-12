import type { PetHomeData, ResolvedMedia } from "./pets-data";

// Datos de muestra (NO vienen de la base de datos) para poder ver el Home y
// el Álbum ya diseñados sin depender todavía de un dominio propio con DNS
// wildcard ni de una mascota real cargada. Las fotos son de un servicio
// público de fotos de perros de muestra (placedog.net), solo para esta
// vista previa — nunca se usan en producción real.
//
// Se usa exclusivamente desde las rutas /preview-home y /preview-album
// (superficie "root", alcanzables hoy en el dominio temporal de Railway).
// Cuando haya dominio propio y mascotas reales, estas rutas de preview se
// pueden borrar sin afectar nada del producto real.

const PHOTO_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

function demoMedia(): ResolvedMedia[] {
  return PHOTO_IDS.map((id, index) => ({
    id: `demo-${id}`,
    type: "photo" as const,
    url: `https://placedog.net/1200/900?id=${id}`,
    caption: index === 0 ? "Milo, un domingo cualquiera" : null,
    width: 1200,
    height: 900,
    isProfileHero: index === 0,
    orderIndex: index,
  }));
}

export function getDemoPetHomeData(): PetHomeData {
  const media = demoMedia();
  return {
    id: "demo-pet",
    slug: "milo",
    name: "Milo",
    species: "dog",
    bioPhrase: null,
    birthDate: "2024-06-15",
    birthDatePrecision: "exact",
    templateId: "moderno-cinematografico",
    emergencyContactName: "Facundo",
    emergencyContactPhone: "+59899123456",
    heroMedia: media[0],
    media,
  };
}
