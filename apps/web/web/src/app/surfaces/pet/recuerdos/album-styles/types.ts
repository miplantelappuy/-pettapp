import type { ReactNode } from "react";
import type { ResolvedMedia } from "@/lib/pets-data";

// Contrato que TODO estilo visual de álbum debe cumplir. El mecanismo 3D
// (Album3D.tsx) solo conoce esta interfaz — nunca conoce collages, tipografía
// ni composición. Agregar un estilo nuevo (Vintage, Acuarela, etc.) es crear
// un archivo que cumpla esta interfaz + registrarlo en registry.ts.

export interface Spread {
  id: string;
  /** Significado libre por estilo: 'full' | 'collage' | 'diptych'... cada estilo decide el suyo. */
  layout: string;
  items: ResolvedMedia[];
  note?: string;
}

export interface AlbumStyleModule {
  id: string;
  label: string;
  /** Decide cuántas páginas hay y qué foto(s) va en cada una. */
  generateSpreads(media: ResolvedMedia[]): Spread[];
  /** Decide CÓMO se ve cada página (tipografía, color, composición). */
  renderSpread(spread: Spread, index: number): ReactNode;
}
