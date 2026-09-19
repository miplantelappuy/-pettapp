"use client";

import Link from "next/link";
import { useScrollReveal } from "@/lib/hooks/useScrollReveal";
import type { PetHomeData } from "@/lib/pets-data";
import type { MilestoneRow } from "@/lib/milestones-data";
import { GrowthPath } from "./crecimiento/GrowthPath";
import { BirthdayCountdown } from "./BirthdayCountdown";
import styles from "./OwnerHome.module.css";

const SPECIES_LABEL: Record<string, string> = {
  dog: "perro",
  cat: "gato",
  other: "compañero",
};

interface Props {
  pet: PetHomeData;
  albumHref?: string;
  manageHref?: string;
  giftsCount?: number;
  giftsHref?: string;
  vaccinationsCount?: number;
  nextVaccineDue?: string | null;
  milestones?: MilestoneRow[];
  /** true en /preview-home: el camino de Crecimiento embebido acepta toques
   * (agregar/ver) pero no guarda nada de verdad. */
  demoMode?: boolean;
}

// Home del panel de dueño, versión glassmorphism: una foto/video a pantalla
// casi completa (sin sonido) con el nombre de la mascota, y al bajar —con
// una revelación suave, no una grilla de cards de golpe— el resto de la
// información configurable. Una sola composición responsive (no una versión
// de celular y otra de PC): en pantallas grandes el hero y las secciones
// simplemente respiran con más aire, no cambia la estructura.
export function OwnerHome({
  pet,
  albumHref = "/recuerdos",
  manageHref = "/gestionar",
  giftsCount = 0,
  giftsHref = "/regalos",
  vaccinationsCount = 0,
  nextVaccineDue = null,
  milestones = [],
  demoMode = false,
}: Props) {
  const speciesLabel = SPECIES_LABEL[pet.species] ?? "compañero";
  const heroIsVideo = pet.heroMedia?.type === "video";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {pet.heroMedia?.url ? (
          heroIsVideo ? (
            // El poster (un JPG liviano, ver lib/video-compress.ts) se ve al
            // instante mientras el video de verdad todavía carga de fondo —
            // así nunca se siente "vacío" antes de que aparezca.
            <video
              className={styles.heroMedia}
              src={pet.heroMedia.url}
              poster={pet.heroMedia.posterUrl ?? undefined}
              preload="auto"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img className={styles.heroMedia} src={pet.heroMedia.url} alt={pet.name} />
          )
        ) : (
          <div className={styles.heroPlaceholder} aria-hidden />
        )}
        <div className={styles.heroScrim} />

        {giftsCount > 0 && (
          <Link href={giftsHref} className={`${styles.giftBadge} glassStrong`}>
            🎁 {giftsCount} {giftsCount === 1 ? "foto nueva" : "fotos nuevas"}
          </Link>
        )}

        <div className={styles.heroContent}>
          <h1 className={styles.heroName}>{pet.name}</h1>
          <p className={styles.heroSub}>{pet.bioPhrase || `Tu ${speciesLabel} tiene su propia app`}</p>
        </div>

        <div className={styles.scrollCue} aria-hidden>
          <span />
        </div>
      </section>

      <Reveal>
        <section className={`${styles.section} ${styles.quickLinks}`}>
          <Link href={albumHref} className={`${styles.tile} glass`}>
            <span className={styles.tileEmoji}>📸</span>
            <span className={styles.tileTitle}>Recuerdos</span>
          </Link>
          <Link href={manageHref} className={`${styles.tile} glass`}>
            <span className={styles.tileEmoji}>⚙️</span>
            <span className={styles.tileTitle}>Gestionar</span>
          </Link>
        </section>
      </Reveal>

      {pet.birthDate && (
        <Reveal>
          <section className={`${styles.section} ${styles.birthdaySection}`}>
            <BirthdayCountdown petName={pet.name} birthDate={pet.birthDate} />
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className={`${styles.section} ${styles.panel} glass`}>
          <span className={styles.eyebrow}>Cerca tuyo</span>
          <h2 className={styles.panelTitle}>Encontrá ayuda rápido</h2>
          <div className={styles.quickSearchRow}>
            <a
              className="glassButton"
              href="https://www.google.com/maps/search/veterinaria+cerca+de+mi"
              target="_blank"
              rel="noreferrer"
            >
              🏥 Veterinario cerca de mí
            </a>
            <a
              className="glassButton"
              href="https://www.google.com/maps/search/peluqueria+canina+cerca+de+mi"
              target="_blank"
              rel="noreferrer"
            >
              ✂️ Peluquería cerca de mí
            </a>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${styles.section} ${styles.panel} glass`}>
          <span className={styles.eyebrow}>Vacunas</span>
          <h2 className={styles.panelTitle}>
            {vaccinationsCount > 0
              ? `${vaccinationsCount} ${vaccinationsCount === 1 ? "vacuna cargada" : "vacunas cargadas"}`
              : "Todavía no cargaste vacunas"}
          </h2>
          <p className={styles.panelText}>
            {nextVaccineDue ? `Próxima: ${nextVaccineDue}.` : `El historial completo se carga desde Gestionar.`}
          </p>
          <Link href={manageHref} className={styles.panelLink}>
            Ver vacunas →
          </Link>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${styles.section} ${styles.comingSoonRow}`}>
          {["Salud"].map((label) => (
            <div key={label} className={`${styles.comingSoonTile} glass`}>
              <span className={styles.tileTitle}>{label}</span>
              <span className={styles.soonTag}>pronto</span>
            </div>
          ))}
        </section>
      </Reveal>

      {/* Crecimiento va directo acá abajo de todo, sin link a otra página —
          la animación de las huellas es la que pidió el dueño ver sin tener
          que "entrar" a ningún lado. */}
      <GrowthPath
        petName={pet.name}
        species={pet.species}
        birthDate={pet.birthDate}
        milestones={milestones}
        manageHref={manageHref}
        petId={pet.id}
        demoMode={demoMode}
      />
    </main>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`${styles.reveal} ${visible ? styles.revealVisible : ""}`}>
      {children}
    </div>
  );
}
