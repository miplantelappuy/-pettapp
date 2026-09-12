"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Spread } from "./album-styles/types";
import styles from "./Album3D.module.css";

interface Props {
  petName: string;
  spreads: Spread[];
  renderSpread: (spread: Spread, index: number) => ReactNode;
}

// Mecanismo físico del álbum: tapa, grosor, perspectiva 3D, animación de
// pasar página, controles. A propósito NO sabe nada sobre cómo se ve el
// contenido interior de cada página — eso lo decide el estilo elegido, vía
// `renderSpread`. Así, cambiar de estilo visual nunca requiere tocar este
// archivo. Implementado en CSS puro (perspective + rotateY) para no sumar
// ninguna librería de animación nueva.
export function Album3D({ petName, spreads, renderSpread }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);

  const total = spreads.length;

  function goTo(index: number, direction: "next" | "prev") {
    if (index < 0 || index >= total || turning) return;
    setTurning(direction);
    window.setTimeout(() => {
      setCurrent(index);
      setTurning(null);
    }, 380);
  }

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <p>Todavía no hay recuerdos guardados de {petName}.</p>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <div className={`${styles.book} ${isOpen ? styles.bookOpen : ""}`}>
        {!isOpen ? (
          <button
            type="button"
            className={styles.cover}
            onClick={() => setIsOpen(true)}
            aria-label={`Abrir el álbum de ${petName}`}
          >
            <span className={styles.coverTitle}>{petName}</span>
            <span className={styles.coverSubtitle}>Álbum de recuerdos</span>
          </button>
        ) : (
          <div className={styles.interior}>
            <div
              className={`${styles.leaf} ${turning === "next" ? styles.leafTurnNext : ""} ${
                turning === "prev" ? styles.leafTurnPrev : ""
              }`}
            >
              {renderSpread(spreads[current], current)}
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => goTo(current - 1, "prev")}
            disabled={current === 0}
            className={styles.controlButton}
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span className={styles.pageCount}>
            {current + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => goTo(current + 1, "next")}
            disabled={current === total - 1}
            className={styles.controlButton}
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
