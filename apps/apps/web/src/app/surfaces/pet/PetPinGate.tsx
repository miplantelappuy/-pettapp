"use client";

import { useState } from "react";
import styles from "./PetPinGate.module.css";

// Se muestra en vez del panel de dueño cuando el navegador todavía no tiene
// la cookie de acceso (ver lib/pin.ts). Sin cuenta ni email: el PIN que se
// eligió al vincular la chapita es toda la barrera.
export function PetPinGate({ petId, petName }: { petId: string; petName: string }) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    const res = await fetch(`/api/pets/${petId}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    // Recarga completa (no router.refresh) para que el server component
    // vuelva a leer la cookie recién puesta — es la forma más simple y
    // robusta de "iniciar sesión" sin manejar estado de auth en el cliente.
    window.location.reload();
  }

  return (
    <main className={styles.page}>
      <form className={`${styles.card} glass`} onSubmit={handleSubmit}>
        <span className={styles.emoji}>🔑</span>
        <h1 className={styles.title}>Panel de {petName}</h1>
        <p className={styles.lead}>Ingresá el PIN que elegiste al vincular la chapita.</p>
        <input
          className={styles.pinInput}
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setStatus("idle");
          }}
          placeholder="••••"
        />
        <button type="submit" className="accentButton" disabled={pin.length < 4 || status === "checking"}>
          {status === "checking" ? "Verificando…" : "Entrar"}
        </button>
        {status === "error" && <p className={styles.errorMsg}>PIN incorrecto. Probá de nuevo.</p>}
      </form>
    </main>
  );
}
