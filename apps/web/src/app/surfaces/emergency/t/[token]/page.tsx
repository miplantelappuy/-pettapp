import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { resolveScanView } from "@/lib/qr";
import { getPetHomeData } from "@/lib/pets-data";
import { getEmergencyFields } from "@/lib/emergency-fields-data";
import { formatPetAge } from "@/lib/age";
import { crossSurfaceUrl, emergencyPath, ACCOUNT_LOGIN_READY, GOOGLE_LOGIN_ENABLED, EMAIL_LOGIN_ENABLED } from "@/lib/env";
import { EmergencyActions } from "./EmergencyActions";
import { ActivateTagForm } from "./ActivateTagForm";
import { ClaimLoginGate } from "./ClaimLoginGate";
import { ClaimPetForm } from "./ClaimPetForm";
import styles from "./emergency.module.css";

// tag.BASE_DOMAIN/t/{token} — perfil público de emergencia. Sin login, sin
// menú: es la puerta de entrada física del producto (lo que hay grabado en
// la chapita de acero). Tres estados posibles según el estado de la chapita:
// sin vincular todavía (activación acá mismo), vinculada (perfil + acciones
// rápidas + compartir fotos/entrar al panel), o dada de baja.
export default async function EmergencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  // Lo pone ClaimLoginGate en el callbackURL (ver withLoginParam ahí) justo
  // antes de mandar a Google/al enlace mágico — así, al volver ya con
  // sesión, ClaimPetForm puede mostrar "conectado con éxito" en vez de
  // aparecer de golpe sin ningún aviso de que el login funcionó.
  const justLoggedIn = sp.login === "ok";

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
    // Con ACCOUNT_LOGIN_READY apagada (el default hoy, y también la red de
    // seguridad si alguien prende ACCOUNT_REQUIRED_ON_ACTIVATION sin tener
    // Google ni email funcionando de verdad — ver lib/env.ts), se mantiene
    // el flujo de siempre: PIN, sin cuenta. Prendida, se reemplaza por login
    // (email o Google, lo que esté configurado) + un formulario con más
    // campos, y la mascota queda protegida por esa cuenta en vez de un PIN —
    // ver ClaimLoginGate/ClaimPetForm y /api/qr/claim.
    if (!ACCOUNT_LOGIN_READY) {
      return (
        <main className={styles.page}>
          <p className={styles.emoji}>🐾</p>
          <h1 className={styles.pendingTitle}>¡Hola! Todavía no tengo dueño</h1>
          <ActivateTagForm token={token} />
        </main>
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    return (
      <main className={styles.page}>
        <p className={styles.emoji}>🐾</p>
        <h1 className={styles.pendingTitle}>¡Hola! Todavía no tengo dueño</h1>
        {session ? (
          <ClaimPetForm token={token} justLoggedIn={justLoggedIn} />
        ) : (
          <ClaimLoginGate googleEnabled={GOOGLE_LOGIN_ENABLED} emailEnabled={EMAIL_LOGIN_ENABLED} />
        )}
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
  const emergencyFields = pet ? await getEmergencyFields(pet.id) : [];
  // "medical_alert" es un tipo de dato aparte que eligió el dueño al
  // cargarlo (ver EmergencyCardEditor) — no algo que se adivina del texto,
  // así que como mucho hay uno y siempre va primero.
  const medicalAlert = emergencyFields.find((f) => f.kind === "medical_alert") ?? null;
  const otherFields = emergencyFields.filter((f) => f.kind !== "medical_alert");

  // Raza/sexo/edad/peso — el dueño decide con un solo interruptor
  // (showBasicInfoPublic) si se muestran acá, todos juntos (ver
  // ManagePet > Datos básicos). Cada uno se agrega solo si el dueño lo
  // cargó, no hace falta que estén los cuatro.
  const basicInfoChips: string[] = [];
  if (petData?.showBasicInfoPublic) {
    if (petData.breed) basicInfoChips.push(petData.breed);
    if (petData.sex === "male") basicInfoChips.push("Macho");
    if (petData.sex === "female") basicInfoChips.push("Hembra");
    const ageLabel = formatPetAge(petData.birthDate, petData.birthDatePrecision);
    if (ageLabel) basicInfoChips.push(ageLabel);
    if (petData.weightKg) basicInfoChips.push(`${Number(petData.weightKg)} kg`);
  }

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
            <span className={styles.lostBannerSub}>
              {petData?.lostZone
                ? `Se perdió en la zona: ${petData.lostZone} — cualquier dato ayuda`
                : "Su familia lo está buscando — cualquier dato ayuda"}
            </span>
          </div>
        )}

        <h1 className={styles.name}>Hola 🐾 Soy {pet?.name}</h1>
        <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>

        {basicInfoChips.length > 0 && (
          <div className={styles.basicInfoRow}>
            {basicInfoChips.map((chip) => (
              <span key={chip} className={styles.basicInfoChip}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {medicalAlert && (
          <div className={styles.allergyAlert}>
            <span className={styles.allergyIcon} aria-hidden>
              ⚠️
            </span>
            <span className={styles.allergyText}>
              <strong>Alerta médica</strong>
              {medicalAlert.value}
            </span>
          </div>
        )}

        {otherFields.length > 0 && (
          <dl className={styles.fieldsList}>
            {otherFields.map((f) => (
              <div key={f.id} className={styles.fieldRow}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {pet && <EmergencyActions token={token} petName={pet.name} phone={pet.emergencyContactPhone ?? null} />}

        <a
          href="https://www.google.com/maps/search/veterinaria+cerca+de+mi"
          target="_blank"
          rel="noreferrer"
          className={`glassButton ${styles.vetButton}`}
        >
          🏥 Veterinario cerca de mí
        </a>
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
