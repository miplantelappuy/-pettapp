"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GoogleButton } from "@/components/GoogleButton";
import styles from "./emergency.module.css";

// Puerta de entrada cuando ACCOUNT_LOGIN_READY está prendida: antes de poder
// cargar a la mascota, hay que iniciar sesión. callbackURL apunta a esta
// misma página (window.location.href, sin querystring propio) para que,
// enlace mágico o Google, la persona vuelva exactamente acá — y esta vez,
// con sesión, EmergencyPage le muestre ClaimPetForm en su lugar.
//
// emailEnabled/googleEnabled: EmergencyPage solo llega a mostrar esta
// pantalla cuando al menos UNO de los dos está prendido (ver
// ACCOUNT_LOGIN_READY en lib/env.ts) — pero puede ser solo uno, así que acá
// cada botón se muestra por separado según corresponda, nunca los dos por
// las dudas.
export function ClaimLoginGate({ googleEnabled, emailEnabled }: { googleEnabled: boolean; emailEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: withLoginParam(window.location.href),
    });
    setStatus(error ? "error" : "sent");
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: withLoginParam(window.location.href) });
  }

  if (status === "sent") {
    return (
      <div className={`${styles.activateForm} glass`}>
        <p className={styles.activateLead}>
          Te mandamos un enlace a <strong>{email}</strong>. Tocalo desde este mismo celular para volver acá y cargar
          a tu mascota (vence en 15 minutos).
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.activateForm} glass`}>
      <p className={styles.activateLead}>
        Para vincular esta chapita, primero iniciá sesión — así la mascota queda protegida por tu cuenta (podés
        recuperar el acceso si perdés el celular, y más adelante sumar a alguien más de la familia).
      </p>

      {googleEnabled && <GoogleButton onClick={handleGoogle} />}

      {emailEnabled && (
        <form className={styles.field} onSubmit={handleMagicLink} style={{ gap: "0.75rem" }}>
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="glassButton" disabled={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Entrar con enlace por email"}
          </button>
        </form>
      )}
      {status === "error" && <p className={styles.errorMsg}>No se pudo enviar el enlace. Probá de nuevo.</p>}
    </div>
  );
}

// Marca en la URL de vuelta que el login recién se completó, para que
// EmergencyPage se lo pase a ClaimPetForm y este muestre "conectado con
// éxito" en vez de aparecer con el formulario de golpe sin ningún aviso.
function withLoginParam(href: string): string {
  const url = new URL(href);
  url.searchParams.set("login", "ok");
  return url.toString();
}
