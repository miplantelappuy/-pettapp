import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { resolveScanView } from "@/lib/qr";
import { getPetHomeData } from "@/lib/pets-data";
import { ScanReporter } from "./ScanReporter";
import styles from "./emergency.module.css";

// tag.BASE_DOMAIN/t/{token} — perfil público de emergencia. Sin login, sin
// menú, sin álbum, sin nada que la conecte visualmente con la app privada:
// es una superficie de un solo propósito (que quien encontró a la mascota
// pueda avisarle a la familia lo más rápido posible), deliberadamente
// distinta del resto del producto.
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
      <Shell>
        <p className={styles.emoji}>🐾</p>
        <p>Esta chapita está esperando a su mascota.</p>
      </Shell>
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
  const heroUrl = petData?.heroMedia?.url ?? null;
  const isLost = view.view === "lost_mode";

  return (
    <main className={styles.page}>
      {heroUrl ? (
        <img src={heroUrl} alt={pet?.name} className={styles.photo} />
      ) : (
        <div className={styles.photoPlaceholder} aria-hidden />
      )}

      <div className={styles.card}>
        {isLost && <div className={styles.lostBanner}>⚠️ {pet?.name} está perdido/a — su familia lo está buscando</div>}

        <h1 className={styles.name}>Hola 🐾 Soy {pet?.name}</h1>
        <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>

        {pet?.emergencyContactPhone ? (
          <a href={`tel:${pet.emergencyContactPhone}`} className={styles.callButton}>
            📞 Llamar a mi familia{pet.emergencyContactName ? ` (${pet.emergencyContactName})` : ""}
          </a>
        ) : (
          <p className={styles.noPhone}>Su familia todavía no cargó un teléfono de contacto.</p>
        )}

        {pet && <ScanReporter token={token} petName={pet.name} />}
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>{children}</div>
    </main>
  );
}
