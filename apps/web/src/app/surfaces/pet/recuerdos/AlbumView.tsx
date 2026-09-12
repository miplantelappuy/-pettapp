"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { PetHomeData } from "@/lib/pets-data";
import { resolveAlbumStyle } from "./album-styles/registry";
import { Album3D } from "./Album3D";
import styles from "./AlbumView.module.css";

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

  useEffect(() => {
    // Mejor esfuerzo: en Android (y en algunas apps ya instaladas a la
    // pantalla de inicio) esto gira la pantalla DE VERDAD, sin el truco de
    // CSS. La mayoría de los navegadores lo rechazan fuera de pantalla
    // completa, y iPhone no lo soporta en absoluto — por eso NUNCA nos
    // apoyamos solo en esto: el CSS de AlbumView.module.css (.forcedLandscape)
    // es lo que de verdad garantiza el resultado en todos lados.
    // Casteamos vía `unknown` (no extendemos el tipo "Screen" con una
    // interfaz propia) a propósito: heredar de Screen exige que cualquier
    // propiedad que ya declara como obligatoria (orientation lo es en el
    // lib.dom.d.ts moderno) siga siendo obligatoria en la subinterfaz, así
    // que declararla opcional ahí rompería la build. Este casteo evita esa
    // regla por completo y sigue siendo "mejor esfuerzo": si algo no existe,
    // el optional chaining y el catch de abajo lo dejan pasar sin romper nada.
    const orientation = (window.screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } })
      .orientation;
    orientation?.lock?.("landscape").catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.forcedLandscape}>
        <div className={styles.backBar}>
          <Link href={backHref} className={styles.backLink}>
            ← Volver a {pet.name}
          </Link>
        </div>
        <Album3D petName={pet.name} spreads={spreads} renderSpread={style.renderSpread} />
      </div>
    </div>
  );
}
