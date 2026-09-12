"use client";

import { useState } from "react";
import styles from "./fotos.module.css";

// Cualquiera que escaneó la chapita puede dejarle una foto a la mascota acá
// — sin cuenta, sin PIN. Le llegan al dueño como un "sobre" sin abrir en su
// panel (ver /surfaces/pet/regalos): la idea es que un amigo le saca una
// foto a tu perro y en vez de mandártela por WhatsApp, te la deja acá.
export function ShareForm({ token, petName }: { token: string; petName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("saving");
    setErrorMsg(null);

    const form = new FormData();
    form.append("token", token);
    form.append("file", file);
    if (note.trim()) form.append("note", note.trim());

    const res = await fetch("/api/gifts/upload", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo enviar la foto.");
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className={`${styles.card} glass`}>
        <p className={styles.sentEmoji}>🎁</p>
        <p className={styles.sentText}>¡Enviada! La familia de {petName} la va a abrir como un regalo.</p>
      </div>
    );
  }

  return (
    <form className={`${styles.card} glass`} onSubmit={handleSubmit}>
      <label className={styles.dropzone}>
        {preview ? (
          <img src={preview} alt="" className={styles.previewImg} />
        ) : (
          <span>📷 Elegí una foto de {petName}</span>
        )}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <input
        className={styles.noteInput}
        placeholder="Un mensajito (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
      />

      <button type="submit" className="accentButton" disabled={!file || status === "saving"}>
        {status === "saving" ? "Enviando…" : "Regalar esta foto"}
      </button>
      {status === "error" && <p className={styles.errorMsg}>{errorMsg}</p>}
    </form>
  );
}
