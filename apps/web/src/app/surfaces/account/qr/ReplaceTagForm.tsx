"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../account.module.css";

// "Se le perdió/rompió la chapita a un cliente": acá se vincula una chapita
// NUEVA (sin asignar, generada más arriba) a la mascota que ya tenía la
// vieja. La mascota conserva perfil, recuerdos e historial — lo único que
// cambia es qué chapita física está activa. Ojo: es una chapita física
// DISTINTA con su propio QR nuevo, no "la misma" — lo que se mantiene igual
// es a dónde lleva (el perfil de la mascota), no el código impreso.
export function ReplaceTagForm() {
  const router = useRouter();
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);
    const res = await fetch("/api/qr/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPublicToken: oldCode.trim(), newPublicToken: newCode.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo reemplazar la chapita.");
      setStatus("error");
      return;
    }
    setOldCode("");
    setNewCode("");
    setStatus("done");
    router.refresh();
  }

  return (
    <details className={styles.form} style={{ display: "block" }}>
      <summary style={{ cursor: "pointer" }}>Se le perdió o rompió la chapita a un cliente</summary>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginTop: "0.75rem" }}
      >
        <input
          required
          value={oldCode}
          onChange={(e) => setOldCode(e.target.value)}
          placeholder="Código de la chapita VIEJA (ej: PET-000123)"
        />
        <input
          required
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Código de la chapita NUEVA, sin asignar"
        />
        <button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Reemplazando…" : "Reemplazar"}
        </button>
      </form>
      <p className={styles.hint} style={{ marginTop: "0.4rem" }}>
        La mascota conserva su perfil, recuerdos e historial — solo cambia qué chapita física está vigente. La
        chapita vieja queda deshabilitada.
      </p>
      {status === "error" && <p className={styles.hint}>{errorMsg}</p>}
      {status === "done" && <p className={styles.hint}>Listo — la chapita nueva ya apunta a esa mascota.</p>}
    </details>
  );
}
