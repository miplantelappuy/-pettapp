import type { ReactNode } from "react";
import type { ResolvedMedia } from "@/lib/pets-data";
import type { AlbumStyleModule, Spread } from "./types";
import styles from "./moderno-cinematografico.module.css";

// Estilo "Moderno / Cinematográfico" (el default del álbum): cada página es
// una o varias impresiones sueltas apoyadas sobre una mesa de trabajo de
// papel crema — como si alguien hubiera sacado el sobre de fotos reveladas y
// las hubiera ido dejando ahí, un poco torcidas, en vez de ordenarlas en una
// grilla. El mecanismo del libro (Album3D.tsx) es completamente ajeno a
// estas decisiones de composición; acá solo se decide QUÉ va en cada página
// y CÓMO se ve.

// Inclinación estable por foto (mismo id → siempre la misma inclinación, no
// cambia en cada render) — lo que hace que se sienta "puesta a mano" en vez
// de aleatoria/temblorosa.
function tiltFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const normalized = ((hash % 1000) + 1000) % 1000; // 0..999
  return -5 + (normalized / 999) * 10; // -5deg..5deg
}

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

  // Una última página de cierre, en vez de terminar de golpe en la última
  // foto — el álbum "respira" hasta el final igual que el resto del gesto
  // de libro físico (tapa, lomo, ahora también contratapa).
  spreads.push({ id: "spread-closing", layout: "closing", items: [] });

  return spreads;
}

function Print({ item, tilt, big = false }: { item: ResolvedMedia; tilt: number; big?: boolean }) {
  return (
    <div className={`${styles.print} ${big ? styles.printBig : ""}`} style={{ ["--tilt" as string]: `${tilt}deg` }}>
      <img src={item.url} alt={item.caption ?? ""} />
    </div>
  );
}

function renderSpread(spread: Spread, index: number): ReactNode {
  if (spread.layout === "closing") {
    return (
      <div className={styles.closing}>
        <span className={styles.closingSeal} aria-hidden>
          🐾
        </span>
        <p className={styles.closingLine}>Por ahora, el álbum llega hasta acá.</p>
        <span className={styles.closingRule} aria-hidden />
        <p className={styles.closingSub}>Los próximos recuerdos se suman desde Gestionar.</p>
      </div>
    );
  }

  if (spread.layout === "full") {
    const item = spread.items[0];
    return (
      <div className={styles.full}>
        <span className={styles.folio} aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <Print item={item} tilt={tiltFor(item.id)} big />
      </div>
    );
  }

  if (spread.layout === "collage-2") {
    const [a, b] = spread.items;
    return (
      <div className={styles.table}>
        <div className={`${styles.slot} ${styles.slot2a}`}>
          <Print item={a} tilt={tiltFor(a.id) - 2} />
        </div>
        <div className={`${styles.slot} ${styles.slot2b}`}>
          <Print item={b} tilt={tiltFor(b.id) + 2} />
        </div>
      </div>
    );
  }

  const [a, b, c] = spread.items;
  return (
    <div className={styles.table}>
      <div className={`${styles.slot} ${styles.slot3a}`}>
        <Print item={a} tilt={tiltFor(a.id) - 3} />
      </div>
      <div className={`${styles.slot} ${styles.slot3b}`}>
        <Print item={b} tilt={tiltFor(b.id) + 3} />
      </div>
      <div className={`${styles.slot} ${styles.slot3c}`}>
        <Print item={c} tilt={tiltFor(c.id)} />
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
