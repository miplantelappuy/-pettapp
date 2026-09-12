"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account.module.css";

// Único método de login de Fase 0/1: enlace mágico por email (sin
// contraseña). Google queda documentado en lib/auth.ts pero sin botón acá
// todavía porque no hay credenciales de Google configuradas — se agrega
// cuando haga falta de verdad, no antes.
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: `${window.location.origin}/app`,
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <p className={styles.hint}>
        Te mandamos un enlace a <strong>{email}</strong>. Tocalo para entrar (vence en 15 minutos).
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="tu@email.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Entrar con enlace por email"}
      </button>
      {status === "error" && <p className={styles.hint}>No se pudo enviar el enlace. Probá de nuevo.</p>}
    </form>
  );
}
