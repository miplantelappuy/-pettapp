"use client";

import { useState } from "react";
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
  /** A dónde apunta "Mi cuenta" en el menú (☰). Sin esto, no se muestra el
   * link — así la vista previa (que no tiene una cuenta real detrás) puede
   * simplemente no pasarlo. */
  accountHref?: string;
}

// Composición deliberadamente NO-grilla: cada sección tiene un tamaño y un
// rol distinto (hero → scrapbook de Recuerdos → dúo asimétrico), más una
// barra de navegación inferior fija para las funciones principales. Ver la
// explicación completa en el chat: la jerarquía visual es la que evita que
// esto se sienta un dashboard.
export function PetHome({ pet, albumHref = "/recuerdos", accountHref }: Props) {
  const age = formatPetAge(pet.birthDate, pet.birthDatePrecision);
  const secondaryLine = pet.bioPhrase || age || `Un/a ${SPECIES_LABEL[pet.species] ?? "compañero"} con su propia app`;

  return (
    <main className={styles.page}>
      <Hero name={pet.name} secondaryLine={secondaryLine} heroUrl={pet.heroMedia?.url ?? null} accountHref={accountHref} />
      <RecuerdosScrapbook albumHref={albumHref} pet={pet} />
      <HistoriaCrecimientoDuo previewUrl={pickPreview(pet, 3)} />
      <div className={styles.bottomNavSpacer} aria-hidden />
      <BottomNav albumHref={albumHref} />
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
  accountHref,
}: {
  name: string;
  secondaryLine: string;
  heroUrl: string | null;
  accountHref?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className={styles.hero}>
      {heroUrl ? (
        <img src={heroUrl} alt={name} className={styles.heroImage} />
      ) : (
        <div className={styles.heroPlaceholder} aria-hidden />
      )}
      <div className={styles.heroScrim} />

      <button
        type="button"
        className={styles.menuButton}
        aria-label="Más opciones"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MenuIcon />
      </button>

      {menuOpen && (
        <div className={styles.menuPanel}>
          {accountHref && (
            <Link href={accountHref} className={styles.menuItem}>
              Mi cuenta
            </Link>
          )}
          <span className={styles.menuItem}>
            Mi historia <em className={styles.menuSoon}>pronto</em>
          </span>
          <span className={styles.menuItem}>
            Seguridad <em className={styles.menuSoon}>pronto</em>
          </span>
        </div>
      )}

      <div className={styles.heroContent}>
        <h1 className={styles.heroName}>{name}</h1>
        <p className={styles.heroSecondary}>{secondaryLine}</p>
      </div>
    </section>
  );
}

// Recuerdos como scrapbook: fotos superpuestas con ligero giro, como si
// alguien las hubiera pegado a mano en un álbum físico — no una grilla ni
// una card editorial prolija.
function RecuerdosScrapbook({ pet, albumHref }: { pet: PetHomeData; albumHref: string }) {
  const { ref, visible } = useScrollReveal<HTMLElement>();
  const photos = pet.media.filter((m) => m.type === "photo").slice(0, 4);

  return (
    <section ref={ref} className={`${styles.scrapbook} ${visible ? styles.isVisible : ""}`}>
      <span className={styles.eyebrow}>Recuerdos</span>
      <h2 className={styles.scrapbookTitle}>Una experiencia visual, no una grilla</h2>

      <div className={styles.scrapbookBoard}>
        {photos.map((photo, i) => (
          <div key={photo.id} className={`${styles.polaroid} ${styles[`polaroid${i}`] ?? ""}`}>
            <img src={photo.url} alt={photo.caption ?? ""} />
          </div>
        ))}
        <span className={styles.scrapbookTag}>Días que se quedan para siempre ♡</span>
      </div>

      <Link href={albumHref} className={styles.featureLink}>
        Ver el álbum →
      </Link>
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

// Barra de navegación inferior fija, como una app nativa — los 5 accesos
// principales del día a día. "Mi historia" y "Seguridad" quedan en el menú
// (☰) del hero porque se usan con menos frecuencia, no porque sean menos
// importantes.
const NAV_ITEMS: Array<{ label: string; href?: string; icon: () => React.ReactNode; soon?: boolean }> = [
  { label: "Recuerdos", icon: RecuerdosIcon },
  { label: "Crecimiento", icon: CrecimientoIcon, soon: true },
  { label: "Salud", icon: SaludIcon, soon: true },
  { label: "Veterinario", icon: VeterinarioIcon, soon: true },
  { label: "Chapita", icon: ChapitaIcon, soon: true },
];

function BottomNav({ albumHref }: { albumHref: string }) {
  return (
    <nav className={styles.bottomNav} aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon />
            <span className={styles.navLabel}>{item.label}</span>
            {item.soon && <span className={styles.navSoonDot} aria-hidden />}
          </>
        );
        return item.soon ? (
          <span key={item.label} className={`${styles.navItem} ${styles.navItemSoon}`}>
            {content}
          </span>
        ) : (
          <Link key={item.label} href={albumHref} className={styles.navItem}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

// Íconos chicos, trazo simple, coherentes con la paleta — sin sumar ninguna
// librería de íconos nueva.
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function RecuerdosIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M3 16l5-4 4 3 3-2 6 5" />
    </svg>
  );
}

function CrecimientoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function SaludIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.9 7.7 2.5 4 6 4c2 0 3.3 1.2 4 2.2C10.7 5.2 12 4 14 4c3.5 0 5.1 3.7 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

function VeterinarioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M12 12v4" />
      <path d="M10 14h4" />
    </svg>
  );
}

function ChapitaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M9 3h6l-1.5 4h-3z" />
    </svg>
  );
}
