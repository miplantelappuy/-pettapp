"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./PetPinGate.module.css";

// Se muestra en vez del panel de dueño cuando el navegador todavía no tiene
// la cookie de acceso NI una sesión con membresía (ver lib/pin.ts#hasOwnerAccess).
// Dos caminos, según cómo se haya vinculado esta mascota:
//  1. PIN (mascotas activadas sin cuenta, el flujo de siempre).
//  2. Iniciar sesión (mascotas activadas CON cuenta desde /api/qr/claim —
//     esas nunca tuvieron PIN, así que antes de esto quedaban sin ninguna
//     forma de entrar si abrían el link desde otro celular o sin sesión
//     activa en el navegador).
// googleEnabled/emailEnabled deciden qué botón de login mostrar (o ninguno,
// si todavía no hay ningún método configurado en Railway).
export function PetPinGate({
  petId,
  petName,
  googleEnabled = false,
  emailEnabled = false,
}: {
  petId: string;
  petName: string;
  googleEnabled?: boolean;
  emailEnabled?: boolean;
}) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  async function handleGoogle() {
    // callbackURL = esta misma página: al volver, ya con sesión, el server
    // component vuelve a evaluar hasOwnerAccess y esta vez pasa (si esta
    // cuenta es miembro de la familia de la mascota).
    await authClient.signIn.social({ provider: "google", callbackURL: window.location.href });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: window.location.href });
    setEmailStatus(error ? "error" : "sent");
  }

  const showLogin = googleEnabled || emailEnabled;

  return (
    <main className={styles.page}>
      <div className={`${styles.card} glass`}>
        <span className={styles.emoji}>🔑</span>
        <h1 className={styles.title}>Panel de {petName}</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem", width: "100%" }}>
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

        {showLogin && (
          <>
            <p className={styles.lead} style={{ margin: "0.5rem 0 0" }}>
              ¿La vinculaste con Google o con tu email? Iniciá sesión en vez de un PIN:
            </p>

            {googleEnabled && (
              <button type="button" className="glassButton" onClick={handleGoogle} style={{ width: "100%" }}>
                Continuar con Google
              </button>
            )}

            {emailEnabled &&
              (emailStatus === "sent" ? (
                <p className={styles.lead} style={{ margin: 0 }}>
                  Te mandamos un enlace a <strong>{email}</strong>. Tocalo desde este mismo celular.
                </p>
              ) : (
                <form
                  onSubmit={handleMagicLink}
                  style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%" }}
                >
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="glassButton" disabled={emailStatus === "sending"}>
                    {emailStatus === "sending" ? "Enviando…" : "Entrar con enlace por email"}
                  </button>
                  {emailStatus === "error" && <p className={styles.errorMsg}>No se pudo enviar. Probá de nuevo.</p>}
                </form>
              ))}
          </>
        )}
      </div>
    </main>
  );
}
