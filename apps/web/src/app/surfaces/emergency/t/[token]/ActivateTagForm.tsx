"use client";

import { useState } from "react";
import styles from "./emergency.module.css";

// Vive acá (no en /app) a propósito: es el momento real en que pasa la
// activación — alguien compró la chapita física, la escanea por primera vez,
// y en el mismo lugar carga a su mascota y elige el PIN que va a proteger su
// panel. Sin cuenta, sin email, sin esperar nada.
export function ActivateTagForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    const res = await fetch("/api/qr/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: token, pet: { name, species, phone }, pin }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo vincular la chapita.");
      setStatus("error");
      return;
    }

    const { petSlug } = await res.json();
    // Ruta relativa: si mañana esto vive en tag.BASE_DOMAIN y la mascota en
    // {slug}.BASE_DOMAIN, esto tiene que resolverse server-side (ver
    // crossSurfaceUrl en lib/env.ts) — hoy, sin dominio propio, todo vive en
    // el mismo host y /p/<slug> alcanza.
    window.location.href = `/p/${petSlug}`;
  }

  return (
    <form className={`${styles.activateForm} glass`} onSubmit={handleSubmit}>
      <p className={styles.activateLead}>Esta chapita todavía no tiene mascota. Vinculala en un minuto:</p>

      <label className={styles.field}>
        <span>Nombre de tu mascota</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Toby" />
      </label>

      <label className={styles.field}>
        <span>Especie</span>
        <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat" | "other")}>
          <option value="dog">Perro</option>
          <option value="cat">Gato</option>
          <option value="other">Otro</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Tu teléfono</span>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: +59899123456"
        />
      </label>
      <p className={styles.pinHint}>
        Así, desde el primer momento, quien encuentre a {name || "tu mascota"} te puede contactar directamente.
      </p>

      <label className={styles.field}>
        <span>Elegí un PIN (4 a 6 números)</span>
        <input
          required
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
        />
      </label>
      <p className={styles.pinHint}>Con este PIN vas a entrar a gestionar a tu mascota — guardalo.</p>

      <button type="submit" className="accentButton" disabled={status === "saving"}>
        {status === "saving" ? "Vinculando…" : "Vincular mi mascota"}
      </button>
      {status === "error" && <p className={styles.errorMsg}>{errorMsg}</p>}
    </form>
  );
}
