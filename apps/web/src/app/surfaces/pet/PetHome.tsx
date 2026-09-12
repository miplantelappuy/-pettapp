"use client";

import Link from "next/link";
import { formatPetAge } from "@/lib/age";
import { useScrollReveal } from "@/lib/hooks/useScrollReveal";
import type { PetHomeData } from "@/lib/pets-data";
import styles from "./PetHome.module.css";

const SPECIES_LABEL: Record<string, string> = {
  dog: "perro",
  cat: "gato",
  other: "compañero",
};

interface Props {
  pet: PetHomeData;
  /** A dónde apunta "Ver el álbum". Por defecto la ruta real (subdominio de
   * la mascota); la vista previa sin dominio propio la pisa con /preview-album. */
  albumHref?: string;
}

// Composición deliberadamente NO-grilla: cada sección tiene un tamaño y un
// rol distinto (hero → módulo grande de Recuerdos → dúo asimétrico → franja
// de utilidad chica al final). Ver la explicación completa en el chat: la
// jerarquía visual es la que evita que esto se sienta un dashboard.
export function PetHome({ pet, albumHref = "/recuerdos" }: Props) {
  const age = formatPetAge(pet.birthDate, pet.birthDatePrecision);
  const secondaryLine = pet.bioPhrase || age || `Un/a ${SPECIES_LABEL[pet.species] ?? "compañero"} con su propia app`;

  return (
    <main className={styles.page}>
      <Hero name={pet.name} secondaryLine={secondaryLine} heroUrl={pet.heroMedia?.url ?? null} />
      <RecuerdosFeature albumHref={albumHref} previewUrl={pickPreview(pet, 1)} />
      <HistoriaCrecimientoDuo previewUrl={pickPreview(pet, 2)} />
      <UtilityStrip />
    </main>
  );
}

function pickPreview(pet: PetHomeData, skip: number): string | null {
  const candidates = pet.media.filter((m) => m.type === "photo");
  return candidates[skip]?.url ?? candidates[0]?.url ?? null;
}

function Hero({
  name,
  secondaryLine,
  heroUrl,
}: {
  name: string;
  secondaryLine: string;
  heroUrl: string | null;
}) {
  return (
    <section className={styles.hero}>
      {heroUrl ? (
        <img src={heroUrl} alt={name} className={styles.heroImage} />
      ) : (
        <div className={styles.heroPlaceholder} aria-hidden />
      )}
      <div className={styles.heroScrim} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroName}>{name}</h1>
        <p className={styles.heroSecondary}>{secondaryLine}</p>
      </div>
    </section>
  );
}

function RecuerdosFeature({
  previewUrl,
  albumHref,
}: {
  previewUrl: string | null;
  albumHref: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`${styles.feature} ${visible ? styles.isVisible : ""}`}
    >
      <div className={styles.featureMedia}>
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <div className={styles.featureMediaPlaceholder} />
        )}
      </div>
      <div className={styles.featureText}>
        <span className={styles.eyebrow}>Recuerdos</span>
        <h2 className={styles.featureTitle}>Un álbum de verdad, no una galería</h2>
        <p className={styles.featureBody}>
          Cada foto tiene su lugar, su página, su momento. Se pasa como un álbum físico.
        </p>
        <Link href={albumHref} className={styles.featureLink}>
          Ver el álbum →
        </Link>
      </div>
    </section>
  );
}

function HistoriaCrecimientoDuo({ previewUrl }: { previewUrl: string | null }) {
  const { ref, visible } = useScrollReveal<HTMLElement>();
  return (
    <section ref={ref} className={`${styles.duo} ${visible ? styles.isVisible : ""}`}>
      <div className={styles.duoLarge}>
        {previewUrl && <img src={previewUrl} alt="" className={styles.duoImage} />}
        <div className={styles.duoOverlay}>
          <span className={styles.eyebrow}>Mi historia</span>
          <p className={styles.duoComingSoon}>Próximamente</p>
        </div>
      </div>
      <div className={styles.duoSmall}>
        <span className={styles.eyebrow}>Crecimiento</span>
        <p className={styles.duoComingSoon}>Próximamente</p>
      </div>
    </section>
  );
}

const UTILITY_ITEMS = [
  { label: "Salud", soon: true },
  { label: "Veterinario", soon: true },
  { label: "Chapita", soon: true },
  { label: "Seguridad", soon: true },
];

function UtilityStrip() {
  return (
    <nav className={styles.utilityStrip} aria-label="Más funciones">
      {UTILITY_ITEMS.map((item) => (
        <span key={item.label} className={styles.utilityItem}>
          {item.label}
          {item.soon && <em className={styles.utilitySoon}>pronto</em>}
        </span>
      ))}
    </nav>
  );
}
