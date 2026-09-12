"use client";

import Link from "next/link";
import type { PetHomeData } from "@/lib/pets-data";
import { resolveAlbumStyle } from "./album-styles/registry";
import { Album3D } from "./Album3D";

interface Props {
  pet: PetHomeData;
  /** A dónde apunta "Volver". Por defecto la home real de la mascota; la
   * vista previa sin dominio propio la pisa con /preview-home. */
  backHref?: string;
}

// Punto de unión: elige el estilo (hoy solo hay uno) y le pasa al mecanismo
// 3D las páginas ya generadas por ese estilo. Si mañana el usuario puede
// elegir estilo desde la UI, este es el único componente que cambia.
export function AlbumView({ pet, backHref = "/" }: Props) {
  const style = resolveAlbumStyle(pet.templateId);
  const spreads = style.generateSpreads(pet.media);

  return (
    <div>
      <div style={{ padding: "1.25rem 1.5rem 0" }}>
        <Link href={backHref} style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", opacity: 0.7 }}>
          ← Volver a {pet.name}
        </Link>
      </div>
      <Album3D petName={pet.name} spreads={spreads} renderSpread={style.renderSpread} />
    </div>
  );
}
