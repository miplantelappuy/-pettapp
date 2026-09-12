"use client";

import { forwardRef, useRef, useState } from "react";
import type { ReactNode } from "react";
import HTMLFlipBookImport from "./FlipBook";
import type { Spread } from "./album-styles/types";
import styles from "./Album3D.module.css";

// react-pageflip declara casi todas sus props como obligatorias en su tipo
// (IProps), aunque en tiempo de ejecución la mayoría tiene default — es un
// problema conocido de sus tipos, no algo que podamos arreglar sin tocar la
// librería. Forzamos "any" acá (un solo lugar) en vez de tener que
// completar a mano una lista larga de props que ni siquiera pensamos usar,
// solo para conformar a un tipo que no refleja el comportamiento real.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook: any = HTMLFlipBookImport;

interface Props {
  petName: string;
  spreads: Spread[];
  renderSpread: (spread: Spread, index: number) => ReactNode;
}

// Cada página que le pasamos a HTMLFlipBook necesita reenviar su ref a un
// nodo del DOM real — así es como react-pageflip mide y dobla la página de
// verdad (no es un adorno nuestro, es lo que pide su propia documentación).
const CoverPage = forwardRef<HTMLDivElement, { petName: string }>(function CoverPage({ petName }, ref) {
  return (
    <div className={styles.coverPage} ref={ref}>
      <span className={styles.coverSeal} aria-hidden>
        🐾
      </span>
      <span className={styles.coverTitle}>{petName}</span>
      <span className={styles.coverRule} aria-hidden />
      <span className={styles.coverSubtitle}>un álbum de recuerdos</span>
    </div>
  );
});

const BackCoverPage = forwardRef<HTMLDivElement, Record<string, never>>(function BackCoverPage(_props, ref) {
  return (
    <div className={styles.coverPage} ref={ref}>
      <span className={styles.coverSeal} aria-hidden>
        🐾
      </span>
    </div>
  );
});

const LeafPage = forwardRef<HTMLDivElement, { children: ReactNode }>(function LeafPage({ children }, ref) {
  return (
    <div className={styles.leafPage} ref={ref}>
      {children}
    </div>
  );
});

// Mecanismo físico del álbum: tapa, lomo, y ahora el paso de página de
// verdad — react-pageflip simula el papel doblándose y responde a
// arrastrar con el dedo (o el mouse) desde una esquina, como una figurita
// de Panini virtual, en vez del giro simulado con CSS que había antes. A
// propósito NO sabe nada sobre cómo se ve el contenido interior de cada
// página — eso lo decide el estilo elegido, vía `renderSpread`.
export function Album3D({ petName, spreads, renderSpread }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver FlipBook.js: sin tipos a propósito
  const bookRef = useRef<any>(null);
  const [current, setCurrent] = useState(0);

  if (spreads.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Todavía no hay recuerdos guardados de {petName}.</p>
      </div>
    );
  }

  const totalPages = spreads.length + 2; // + tapa + contratapa

  function flip(direction: "next" | "prev") {
    const pageFlip = bookRef.current?.pageFlip?.();
    if (!pageFlip) return;
    if (direction === "next") pageFlip.flipNext();
    else pageFlip.flipPrev();
  }

  return (
    <div className={styles.stage}>
      {/* El ancho concreto vive en este div (no confiamos en que "stretch"
          adivine un tamaño sin un contenedor con medida propia) — el libro
          se estira para llenarlo, dentro de los límites min/max de abajo. */}
      <div className={styles.bookWrap}>
        <HTMLFlipBook
          ref={bookRef}
          width={360}
          height={480}
          size="stretch"
          minWidth={260}
          maxWidth={640}
          minHeight={340}
          maxHeight={860}
          showCover
          flippingTime={650}
          className={styles.book}
          onFlip={(e: { data: number }) => setCurrent(e.data)}
        >
          <CoverPage petName={petName} />
          {spreads.map((spread, i) => (
            <LeafPage key={spread.id}>{renderSpread(spread, i)}</LeafPage>
          ))}
          <BackCoverPage />
        </HTMLFlipBook>
      </div>

      <p className={styles.dragHint}>Agarrá una esquina y deslizá para pasar de página.</p>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => flip("prev")}
          disabled={current === 0}
          className={styles.controlButton}
          aria-label="Página anterior"
        >
          ‹
        </button>
        <span className={styles.pageCount}>
          Página {current + 1} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => flip("next")}
          disabled={current >= totalPages - 1}
          className={styles.controlButton}
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}
