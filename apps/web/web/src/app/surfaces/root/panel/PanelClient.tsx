"use client";

import { useState } from "react";
import styles from "./panel.module.css";

interface SeededTag {
  code: string;
  token: string;
  activateHref: string;
  scanUrl: string;
}

// Botón "Crear chapita de prueba": llama a /api/dev/seed-tags (sin login,
// pensado solo para esta etapa — ver el comentario en esa ruta) y muestra
// enseguida el link para activarla, para no tener que copiar/pegar un
// código a mano.
export function SeedTagButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [tag, setTag] = useState<SeededTag | null>(null);

  async function handleClick() {
    setStatus("loading");
    setTag(null);
    try {
      const res = await fetch("/api/dev/seed-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      });
      if (!res.ok) throw new Error("No se pudo crear la chapita");
      const data = await res.json();
      setTag(data.tags[0]);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <div className={styles.actions}>
        <button type="button" className="accentButton" onClick={handleClick} disabled={status === "loading"}>
          {status === "loading" ? "Creando…" : "🏷️ Crear chapita de prueba"}
        </button>
      </div>

      {status === "error" && <p className={styles.errorMsg}>No se pudo crear la chapita. Probá de nuevo.</p>}

      {tag && (
        <div className={`${styles.result} glass`}>
          <span className={styles.resultCode}>{tag.code}</span>
          <div className={styles.actions}>
            <a href={tag.activateHref} className="glassButton">
              Abrir para vincular a una mascota →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
