import type { AlbumStyleModule } from "./types";
import { modernoCinematografico } from "./moderno-cinematografico";
import { vintagePolaroid } from "./vintage-polaroid";

// Único punto de alta de un estilo nuevo. Agregar "Acuarela", "Elegante",
// etc. más adelante es: crear su módulo (que cumpla AlbumStyleModule) + una
// línea acá. Nada más se toca — ManagePet.tsx ya lista estos estilos solo,
// recorriendo este objeto.
export const albumStyles: Record<string, AlbumStyleModule> = {
  "moderno-cinematografico": modernoCinematografico,
  "vintage-polaroid": vintagePolaroid,
};

export const DEFAULT_ALBUM_STYLE = "moderno-cinematografico";

// `pets.templateId` se reutiliza de forma PROVISORIA para elegir el estilo
// de álbum. Si el valor guardado no coincide con ningún estilo (por ej. el
// default histórico "cinematic" de Fase 0, o uno que se haya sacado de este
// registro), cae al estilo por defecto en vez de romper.
export function resolveAlbumStyle(templateId: string | null | undefined): AlbumStyleModule {
  if (templateId && albumStyles[templateId]) return albumStyles[templateId];
  return albumStyles[DEFAULT_ALBUM_STYLE];
}
