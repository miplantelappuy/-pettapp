import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getPetHomeData } from "@/lib/pets-data";
import { emergencyPath } from "@/lib/env";
import { ShareForm } from "./ShareForm";
import styles from "./fotos.module.css";

// tag.BASE_DOMAIN/t/{token}/fotos — cualquiera que escaneó la chapita puede
// entrar acá a dejarle una foto a la mascota, sin login ni PIN.
export default async function ShareFotosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tag = await db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, token) });
  const pet = tag?.petId ? await db.query.pets.findFirst({ where: eq(schema.pets.id, tag.petId) }) : null;

  if (!tag || tag.status !== "active" || !pet) {
    return (
      <main className={styles.page}>
        <div className={`${styles.card} glass`}>
          <p>Esta chapita todavía no tiene una mascota vinculada.</p>
        </div>
      </main>
    );
  }

  const petData = await getPetHomeData(pet.slug);
  const heroUrl = petData?.heroMedia?.url ?? null;

  return (
    <main className={styles.page}>
      <Link href={emergencyPath(token)} className={styles.back}>
        ← Volver
      </Link>

      {heroUrl && <img src={heroUrl} alt={pet.name} className={styles.heroThumb} />}
      <h1 className={styles.title}>Regalale una foto a {pet.name}</h1>
      <p className={styles.lead}>
        En vez de mandarla por WhatsApp, dejala acá — le va a llegar a su familia como un sobre de figuritas para
        abrir.
      </p>

      <ShareForm token={token} petName={pet.name} />
    </main>
  );
}
