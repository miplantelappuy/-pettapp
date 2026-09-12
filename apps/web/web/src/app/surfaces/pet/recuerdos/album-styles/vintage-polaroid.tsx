import type { ReactNode } from "react";
import type { ResolvedMedia } from "@/lib/pets-data";
import type { AlbumStyleModule, Spread } from "./types";
import styles from "./vintage-polaroid.module.css";

// Estilo "Vintage / Polaroid": segundo de los 7 estilos previstos. A
// propósito reutiliza el mismo lenguaje visual que ya se ve en el scrapbook
// del Home (PetHome.module.css) — fotos como polaroids con cinta adhesiva
// sobre papel kraft — pero acá se arman páginas completas de a 1, 2 o 3
// fotos, en vez del collage fijo de 4 del Home.

function generateSpreads(media: ResolvedMedia[]): Spread[] {
  const photos = media.filter((m) => m.type === "photo");
  if (photos.length === 0) return [];

  const spreads: Spread[] = [];
  let i = 0;
  let cursor = 0;

  while (cursor < photos.length) {
    const pattern = i % 3; // single, duo, trio — repite
    if (pattern === 0) {
      spreads.push({ id: `spread-${i}`, layout: "single", items: [photos[cursor]] });
      cursor += 1;
    } else if (pattern === 1 && photos.length - cursor >= 2) {
      spreads.push({ id: `spread-${i}`, layout: "duo", items: [photos[cursor], photos[cursor + 1]] });
      cursor += 2;
    } else if (photos.length - cursor >= 3) {
      spreads.push({ id: `spread-${i}`, layout: "trio", items: [photos[cursor], photos[cursor + 1], photos[cursor + 2]] });
      cursor += 3;
    } else {
      spreads.push({ id: `spread-${i}`, layout: "single", items: [photos[cursor]] });
      cursor += 1;
    }
    i += 1;
  }

  return spreads;
}

function Polaroid({ item, className }: { item: ResolvedMedia; className?: string }) {
  return (
    <div className={`${styles.polaroid} ${className ?? ""}`}>
      <div className={styles.tape} />
      <img src={item.url} alt={item.caption ?? ""} />
      {item.caption && <p className={styles.caption}>{item.caption}</p>}
    </div>
  );
}

function renderSpread(spread: Spread): ReactNode {
  if (spread.layout === "single") {
    return (
      <div className={styles.page}>
        <div className={styles.single}>
          <Polaroid item={spread.items[0]} />
        </div>
      </div>
    );
  }

  if (spread.layout === "duo") {
    const [a, b] = spread.items;
    return (
      <div className={styles.page}>
        <div className={styles.duo}>
          <Polaroid item={a} className={styles.duoA} />
          <Polaroid item={b} className={styles.duoB} />
        </div>
      </div>
    );
  }

  const [a, b, c] = spread.items;
  return (
    <div className={styles.page}>
      <div className={styles.trio}>
        <Polaroid item={a} className={styles.trioA} />
        <Polaroid item={b} className={styles.trioB} />
        <Polaroid item={c} className={styles.trioC} />
      </div>
    </div>
  );
}

export const vintagePolaroid: AlbumStyleModule = {
  id: "vintage-polaroid",
  label: "Vintage / Polaroid",
  generateSpreads,
  renderSpread,
};
