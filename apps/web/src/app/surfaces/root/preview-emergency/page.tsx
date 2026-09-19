import { getDemoPetHomeData } from "@/lib/demo-pet";
import { ActivateTagForm } from "../../emergency/t/[token]/ActivateTagForm";
import { PreviewBanner } from "../PreviewBanner";
import styles from "../../emergency/t/[token]/emergency.module.css";

// Vista previa de las dos caras del perfil de emergencia: lo que ve quien
// escanea una chapita SIN vincular (activación) y una YA vinculada (perfil +
// acciones rápidas + compartir fotos / soy el dueño). En la real cada
// chapita muestra solo una de las dos, según su estado.
export default function PreviewEmergencyPage() {
  const pet = getDemoPetHomeData();

  return (
    <>
      <PreviewBanner />

      <main className={styles.page}>
        <p className={styles.emoji}>🐾</p>
        <h1 className={styles.pendingTitle}>¡Hola! Todavía no tengo dueño</h1>
        <ActivateTagForm token="demo-token" />
      </main>

      <div style={{ padding: "1rem", textAlign: "center", fontFamily: "var(--font-body)", color: "var(--color-cloud-dim)", fontSize: "0.8rem" }}>
        ↑ chapita sin vincular · chapita ya vinculada ↓
      </div>

      <main className={styles.page}>
        <div className={styles.heroWrap}>
          <img src={pet.emergencyPhotoUrl ?? undefined} alt={pet.name} className={styles.photo} />
          <div className={styles.heroScrim} />
        </div>

        <div className={`${styles.card} glassStrong`}>
          <h1 className={styles.name}>Hola 🐾 Soy {pet.name}</h1>
          <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>
          <div className={styles.actionRow}>
            <a href={`tel:${pet.emergencyContactPhone}`} className="accentButton">
              📞 Llamar a mi familia
            </a>
            <a href="#" className="glassButton">
              💬 WhatsApp
            </a>
          </div>
          <a
            href="https://www.google.com/maps/search/veterinaria+cerca+de+mi"
            target="_blank"
            rel="noreferrer"
            className={`glassButton ${styles.vetButton}`}
          >
            🏥 Veterinario cerca de mí
          </a>
        </div>

        <div className={styles.optionsRow}>
          <a href="/preview-emergency" className={`${styles.optionCard} glass`}>
            <span className={styles.optionEmoji}>🎁</span>
            <span className={styles.optionTitle}>Compartir fotos</span>
            <span className={styles.optionText}>Dejale una foto a {pet.name} como sorpresa</span>
          </a>
          <a href="/preview-home" className={`${styles.optionCard} glass`}>
            <span className={styles.optionEmoji}>🔑</span>
            <span className={styles.optionTitle}>Soy el dueño</span>
            <span className={styles.optionText}>Entrar al panel de {pet.name}</span>
          </a>
        </div>
      </main>
    </>
  );
}
