import type { AlbumStyleModule } from "./types";
import { modernoCinematografico } from "./moderno-cinematografico";

// Único punto de alta de un estilo nuevo. Agregar "Vintage", "Acuarela",
// "Elegante", etc. más adelante es: crear su módulo (que cumpla
// AlbumStyleModule) + una línea acá. Nada más se toca.
export const albumStyles: Record<string, AlbumStyleModule> = {
  "moderno-cinematografico": modernoCinematografico,
};

export const DEFAULT_ALBUM_STYLE = "moderno-cinematografico";

// `pets.templateId` se reutiliza de forma PROVISORIA para elegir el estilo
// de álbum, porque hoy existe un solo estilo implementado. Si el valor
// guardado no coincide con ningún estilo (por ej. el default histórico
// "cinematic" de Fase 0), cae al estilo por defecto en vez de romper.
export function resolveAlbumStyle(templateId: string | null | undefined): AlbumStyleModule {
  if (templateId && albumStyles[templateId]) return albumStyles[templateId];
  return albumStyles[DEFAULT_ALBUM_STYLE];
}
