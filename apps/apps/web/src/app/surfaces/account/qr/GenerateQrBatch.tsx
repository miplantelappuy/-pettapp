"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../account.module.css";

// Botón simple: pide N chapitas nuevas y refresca la lista de abajo (que la
// dibuja el server component de la página, con las imágenes de QR ya
// generadas) — así no hay que duplicar la lógica de armar la lista acá.
export function GenerateQrBatch() {
  const router = useRouter();
  const [count, setCount] = useState(10);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleClick() {
    setStatus("saving");
    const res = await fetch("/api/qr/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className={styles.form}>
      <input
        type="number"
        min={1}
        max={50}
        value={count}
        onChange={(e) => setCount(Number(e.target.value) || 1)}
        style={{ maxWidth: "5rem" }}
      />
      <button type="button" onClick={handleClick} disabled={status === "saving"}>
        {status === "saving" ? "Generando…" : "Generar chapitas nuevas"}
      </button>
      {status === "error" && <p className={styles.hint}>No se pudo generar el lote.</p>}
    </div>
  );
}
