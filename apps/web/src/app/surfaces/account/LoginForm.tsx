"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account.module.css";

interface Props {
  /** A dónde volver después de tocar el enlace del email o de Google —
   * "/app" (el default) para el login general, o una ruta puntual (ej. la
   * página de "sumarme a este hogar") cuando este formulario vive ahí. */
  callbackPath?: string;
  /** Ver GOOGLE_LOGIN_ENABLED en lib/env.ts — el botón no se muestra hasta
   * que haya credenciales de Google reales cargadas en Railway. */
  googleEnabled?: boolean;
}

export function LoginForm({ callbackPath = "/app", googleEnabled = false }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: `${window.location.origin}${callbackPath}`,
    });
    setStatus(error ? "error" : "sent");
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}${callbackPath}` });
  }

  if (status === "sent") {
    return (
      <p className={styles.hint}>
        Te mandamos un enlace a <strong>{email}</strong>. Tocalo para entrar (vence en 15 minutos).
      </p>
    );
  }

  return (
    <div>
      {googleEnabled && (
        <>
          <button type="button" className={styles.googleButton} onClick={handleGoogle}>
            Continuar con Google
          </button>
          <p className={styles.divider}>o con tu email</p>
        </>
      )}
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
    </div>
  );
}
