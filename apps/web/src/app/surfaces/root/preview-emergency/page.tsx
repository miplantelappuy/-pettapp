import { getDemoPetHomeData } from "@/lib/demo-pet";
import { PreviewBanner } from "../PreviewBanner";
import styles from "../../emergency/t/[token]/emergency.module.css";

// Vista previa del perfil público de emergencia (lo que ve quien escanea la
// chapita física). Con datos de muestra, sin llamar a la API real de scan
// (no hay chapita real todavía) — ver preview-home para el porqué de esta
// ruta temporal.
export default function PreviewEmergencyPage() {
  const pet = getDemoPetHomeData();

  return (
    <>
      <PreviewBanner />
      <main className={styles.page}>
        {pet.heroMedia && <img src={pet.heroMedia.url} alt={pet.name} className={styles.photo} />}
        <div className={styles.card}>
          <h1 className={styles.name}>Hola 🐾 Soy {pet.name}</h1>
          <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>
          <a href={`tel:${pet.emergencyContactPhone}`} className={styles.callButton}>
            📞 Llamar a mi familia {pet.emergencyContactName ? `(${pet.emergencyContactName})` : ""}
          </a>
          <p style={{ fontSize: "0.75rem", opacity: 0.65, margin: "0.75rem 0 0" }}>
            Le avisamos a la familia de {pet.name}.
          </p>
        </div>
      </main>
    </>
  );
}
