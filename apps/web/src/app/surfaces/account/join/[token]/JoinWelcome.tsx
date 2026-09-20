"use client";

import { PushOptIn } from "../../PushOptIn";
import styles from "../../account.module.css";

// Pantalla para quien acaba de aceptar una invitación de familia (ver
// page.tsx — la membresía ya quedó guardada antes de llegar acá). A
// propósito no tiene NINGUNA herramienta de administración: nada de generar
// chapitas, activar otra, ni la lista completa de "Tu familia" — eso es
// fricción para alguien que solo quiere entrar a ver a la mascota. Un solo
// pedido (avisos) y un solo botón (entrar a su app).
export function JoinWelcome({ petId, petName, enterHref }: { petId: string; petName: string; enterHref: string }) {
  return (
    <main className={styles.page} style={{ textAlign: "center" }}>
      <h1 className={styles.title}>¡Listo! Ya sos parte de la familia de {petName} 🐾</h1>
      <p className={styles.lead}>Activá los avisos para enterarte apenas alguien escanee su chapita.</p>

      <div style={{ margin: "1.25rem 0", display: "flex", justifyContent: "center" }}>
        <PushOptIn petId={petId} />
      </div>

      <a href={enterHref} className="accentButton" style={{ display: "inline-block", marginTop: "0.5rem" }}>
        Entrar a la app de {petName} →
      </a>
    </main>
  );
}
