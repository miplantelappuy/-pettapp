import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { resolveScanView } from "@/lib/qr";
import { getPetHomeData } from "@/lib/pets-data";
import { crossSurfaceUrl, emergencyPath } from "@/lib/env";
import { EmergencyActions } from "./EmergencyActions";
import { ActivateTagForm } from "./ActivateTagForm";
import styles from "./emergency.module.css";

// tag.BASE_DOMAIN/t/{token} — perfil público de emergencia. Sin login, sin
// menú: es la puerta de entrada física del producto (lo que hay grabado en
// la chapita de acero). Tres estados posibles según el estado de la chapita:
// sin vincular todavía (activación acá mismo), vinculada (perfil + acciones
// rápidas + compartir fotos/entrar al panel), o dada de baja.
export default async function EmergencyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tag = await db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, token) });
  if (!tag) {
    return (
      <Shell>
        <p>Chapita no encontrada.</p>
      </Shell>
    );
  }

  const pet = tag.petId ? await db.query.pets.findFirst({ where: eq(schema.pets.id, tag.petId) }) : null;
  const view = resolveScanView(tag, pet ?? null);

  if (view.view === "activation_pending") {
    return (
      <main className={styles.page}>
        <p className={styles.emoji}>🐾</p>
        <h1 className={styles.pendingTitle}>¡Hola! Todavía no tengo dueño</h1>
        <ActivateTagForm token={token} />
      </main>
    );
  }

  if (view.view === "tag_disabled") {
    return (
      <Shell>
        <p>Esta chapita ya no está en uso.</p>
      </Shell>
    );
  }

  // lost_mode | emergency_profile — en los dos casos mostramos el mismo
  // perfil; lost_mode solo agrega el aviso de que la familia ya sabe que
  // está perdido/a y está buscando activamente.
  const petData = pet ? await getPetHomeData(pet.slug) : null;
  // Siempre la foto elegida a mano por el dueño (o su fallback a la primera
  // foto disponible) — nunca la portada del Home, que ahora rota sola y
  // puede tocarle un video: esta pantalla tiene que verse siempre.
  const heroUrl = petData?.emergencyPhotoUrl ?? null;
  const isLost = view.view === "lost_mode";

  return (
    <main className={`${styles.page} ${isLost ? styles.pageAlert : ""}`}>
      {/* Aro rojo pulsante sobre TODA la pantalla — no una franja más, algo
          que se note de entrada apenas se abre el link, antes incluso de
          leer una palabra. pointer-events:none para no tapar ningún botón
          de abajo (es puramente visual). */}
      {isLost && <div className={styles.alertRing} aria-hidden />}

      <div className={styles.heroWrap}>
        {heroUrl ? (
          <img src={heroUrl} alt={pet?.name} className={styles.photo} />
        ) : (
          <div className={styles.photoPlaceholder} aria-hidden />
        )}
        <div className={styles.heroScrim} />
      </div>

      <div className={`${styles.card} glassStrong`}>
        {isLost && (
          <div className={styles.lostBanner}>
            🚨 {pet?.name} está perdido/a 🚨
            <span className={styles.lostBannerSub}>Su familia lo está buscando — cualquier dato ayuda</span>
          </div>
        )}

        <h1 className={styles.name}>Hola 🐾 Soy {pet?.name}</h1>
        <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>

        {pet && <EmergencyActions token={token} petName={pet.name} phone={pet.emergencyContactPhone ?? null} />}
      </div>

      {pet && petData && (
        <div className={styles.optionsRow}>
          <a href={emergencyPath(token, "/fotos")} className={`${styles.optionCard} glass`}>
            <span className={styles.optionEmoji}>🎁</span>
            <span className={styles.optionTitle}>Compartir fotos</span>
            <span className={styles.optionText}>Dejale una foto a {pet.name} como sorpresa</span>
          </a>
          <a href={crossSurfaceUrl(petData.slug)} className={`${styles.optionCard} glass`}>
            <span className={styles.optionEmoji}>🔑</span>
            <span className={styles.optionTitle}>Soy el dueño</span>
            <span className={styles.optionText}>Entrar al panel de {pet.name}</span>
          </a>
        </div>
      )}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={`${styles.card} glassStrong`}>{children}</div>
    </main>
  );
}
