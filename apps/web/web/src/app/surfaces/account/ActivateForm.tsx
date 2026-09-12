"use client";

import { useState } from "react";
import styles from "./account.module.css";

interface Props {
  /** true mientras no hay dominio propio: la app real de la mascota se
   * alcanza por /p/<slug> en este mismo host, no por subdominio. */
  tempPathMode: boolean;
  baseDomain: string;
  baseProtocol: string;
}

// Activar una chapita: el paso que convierte "tengo una chapita física de
// regalo" en "tengo una mascota con su propia app". Llama a
// /api/qr/activate (ya existía del backend) y, si sale bien, te manda
// directo a la app real de la mascota recién creada.
export function ActivateForm({ tempPathMode, baseDomain, baseProtocol }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    // /api/qr/activate ya no depende de sesión — el PIN es lo que protege el
    // panel de dueño ahora (ver /tag/<token>, que es donde vive este mismo
    // formulario para el flujo principal). Se mantiene acá por compatibilidad.
    const res = await fetch("/api/qr/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, pet: { name, species }, pin }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo activar la chapita.");
      setStatus("error");
      return;
    }

    const { petSlug } = await res.json();
    const petHref = tempPathMode ? `/p/${petSlug}` : `${baseProtocol}://${petSlug}.${baseDomain}`;
    window.location.href = petHref;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        placeholder="Código de tu chapita (ej: PET-000123)"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input placeholder="Nombre de tu mascota" required value={name} onChange={(e) => setName(e.target.value)} />
      <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat" | "other")}>
        <option value="dog">Perro</option>
        <option value="cat">Gato</option>
        <option value="other">Otro</option>
      </select>
      <input
        placeholder="PIN (4-6 números)"
        required
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
      <button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Activando…" : "Activar chapita"}
      </button>
      {status === "error" && <p className={styles.hint}>{errorMsg}</p>}
    </form>
  );
}
