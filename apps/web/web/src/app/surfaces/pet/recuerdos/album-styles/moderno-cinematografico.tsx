import type { ReactNode } from "react";
import type { ResolvedMedia } from "@/lib/pets-data";
import type { AlbumStyleModule, Spread } from "./types";
import styles from "./moderno-cinematografico.module.css";

// Estilo "Moderno / Cinematográfico": el único de los 7 estilos previstos que
// se implementa en esta primera versión. El contenido interior imita un
// álbum fotográfico profesional (de boda o viaje) — no figuritas Panini:
// algunas páginas son una foto casi a página completa, otras son collage
// asimétrico. El mecanismo del libro (Album3D.tsx) es completamente ajeno a
// estas decisiones de composición.

function generateSpreads(media: ResolvedMedia[]): Spread[] {
  const photos = media.filter((m) => m.type === "photo");
  if (photos.length === 0) return [];

  const spreads: Spread[] = [];
  let i = 0;
  let cursor = 0;

  while (cursor < photos.length) {
    const pattern = i % 3; // full, collage-2, collage-3 — repite
    if (pattern === 0) {
      spreads.push({ id: `spread-${i}`, layout: "full", items: [photos[cursor]] });
      cursor += 1;
    } else if (pattern === 1 && photos.length - cursor >= 2) {
      spreads.push({
        id: `spread-${i}`,
        layout: "collage-2",
        items: [photos[cursor], photos[cursor + 1]],
      });
      cursor += 2;
    } else if (photos.length - cursor >= 3) {
      spreads.push({
        id: `spread-${i}`,
        layout: "collage-3",
        items: [photos[cursor], photos[cursor + 1], photos[cursor + 2]],
      });
      cursor += 3;
    } else {
      spreads.push({ id: `spread-${i}`, layout: "full", items: [photos[cursor]] });
      cursor += 1;
    }
    i += 1;
  }

  return spreads;
}

function renderSpread(spread: Spread): ReactNode {
  if (spread.layout === "full") {
    const item = spread.items[0];
    return (
      <div className={styles.full}>
        <img src={item.url} alt={item.caption ?? ""} />
        {item.caption && <p className={styles.caption}>{item.caption}</p>}
      </div>
    );
  }

  if (spread.layout === "collage-2") {
    const [a, b] = spread.items;
    return (
      <div className={styles.collage2}>
        <div className={styles.collage2Large}>
          <img src={a.url} alt={a.caption ?? ""} />
        </div>
        <div className={styles.collage2Small}>
          <img src={b.url} alt={b.caption ?? ""} />
        </div>
      </div>
    );
  }

  const [a, b, c] = spread.items;
  return (
    <div className={styles.collage3}>
      <div className={styles.collage3Main}>
        <img src={a.url} alt={a.caption ?? ""} />
      </div>
      <div className={styles.collage3Side}>
        <img src={b.url} alt={b.caption ?? ""} />
        <img src={c.url} alt={c.caption ?? ""} />
      </div>
    </div>
  );
}

export const modernoCinematografico: AlbumStyleModule = {
  id: "moderno-cinematografico",
  label: "Moderno / Cinematográfico",
  generateSpreads,
  renderSpread,
};
