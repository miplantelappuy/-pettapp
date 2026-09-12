import Link from "next/link";
import { formatPetAge } from "@/lib/age";
import type { PetHomeData } from "@/lib/pets-data";
import styles from "./PetHomeDesktop.module.css";

const SPECIES_LABEL: Record<string, string> = {
  dog: "perro",
  cat: "gato",
  other: "compañero",
};

interface Props {
  pet: PetHomeData;
  albumHref?: string;
}

// La versión de PC NO es el Home de celular estirado a lo ancho — es otra
// composición: un panel fijo al costado (como el cartel de una foto
// enmarcada en una pared de galería) + una pared de recuerdos scrollable a
// la derecha, en vez del scrapbook curado de 4 fotos + barra inferior que
// tiene sentido en la mano de alguien pero no en una pantalla grande.
// Ver ResponsivePetHome.tsx para cómo se elige esta versión vs PetHome.tsx.
export function PetHomeDesktop({ pet, albumHref = "/recuerdos" }: Props) {
  const age = formatPetAge(pet.birthDate, pet.birthDatePrecision);
  const secondaryLine = pet.bioPhrase || age || `Un/a ${SPECIES_LABEL[pet.species] ?? "compañero"} con su propia app`;
  const photos = pet.media.filter((m) => m.type === "photo");
  const historyPreview = photos[3]?.url ?? photos[0]?.url ?? null;

  return (
    <main className={styles.stage}>
      <aside className={styles.panel}>
        <div className={styles.panelPhoto}>
          {pet.heroMedia?.url ? (
            <img src={pet.heroMedia.url} alt={pet.name} />
          ) : (
            <div className={styles.panelPhotoPlaceholder} aria-hidden />
          )}
        </div>

        <div className={styles.panelBody}>
          <h1 className={styles.panelName}>{pet.name}</h1>
          <p className={styles.panelSecondary}>{secondaryLine}</p>
          <Link href={albumHref} className={styles.panelLink}>
            Ver el álbum →
          </Link>
        </div>

        <DesktopNav albumHref={albumHref} />
      </aside>

      <div className={styles.gallery}>
        <section className={styles.gallerySection}>
          <span className={styles.eyebrow}>Recuerdos</span>
          <h2 className={styles.galleryTitle}>Una pared de recuerdos, no una grilla de miniaturas</h2>
          {photos.length > 0 ? (
            <div className={styles.galleryGrid}>
              {photos.map((photo) => (
                <div key={photo.id} className={styles.galleryItem}>
                  <img src={photo.url} alt={photo.caption ?? ""} />
                  {photo.caption && <p className={styles.galleryCaption}>{photo.caption}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Todavía no hay recuerdos guardados de {pet.name}.</p>
          )}
        </section>

        <section className={styles.historySection}>
          <div className={styles.historyLarge}>
            {historyPreview && <img src={historyPreview} alt="" className={styles.historyImage} />}
            <div className={styles.historyOverlay}>
              <span className={styles.eyebrow}>Mi historia</span>
              <p className={styles.comingSoon}>Próximamente</p>
            </div>
          </div>
          <div className={styles.historySmall}>
            <span className={styles.eyebrow}>Crecimiento</span>
            <p className={styles.comingSoon}>Próximamente</p>
          </div>
        </section>
      </div>
    </main>
  );
}

// Reemplaza la barra inferior de celular — en PC no tiene sentido un patrón
// de app nativa. Acá es una fila chica de íconos al pie del panel fijo,
// siempre visible mientras se recorre la pared de recuerdos.
const NAV_ITEMS: Array<{ label: string; href?: string; icon: () => React.ReactNode; soon?: boolean }> = [
  { label: "Recuerdos", icon: RecuerdosIcon },
  { label: "Crecimiento", icon: CrecimientoIcon, soon: true },
  { label: "Salud", icon: SaludIcon, soon: true },
  { label: "Veterinario", icon: VeterinarioIcon, soon: true },
  { label: "Chapita", icon: ChapitaIcon, soon: true },
];

function DesktopNav({ albumHref }: { albumHref: string }) {
  return (
    <nav className={styles.panelNav} aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <Icon />
            {item.soon && <span className={styles.navSoonDot} aria-hidden />}
          </>
        );
        return item.soon ? (
          <span key={item.label} className={`${styles.navItem} ${styles.navItemSoon}`} title={`${item.label} (pronto)`}>
            {content}
          </span>
        ) : (
          <Link key={item.label} href={albumHref} className={styles.navItem} title={item.label}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

function RecuerdosIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M3 16l5-4 4 3 3-2 6 5" />
    </svg>
  );
}

function CrecimientoIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function SaludIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-9.5-9C.9 7.7 2.5 4 6 4c2 0 3.3 1.2 4 2.2C10.7 5.2 12 4 14 4c3.5 0 5.1 3.7 3.5 7-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

function VeterinarioIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M12 12v4" />
      <path d="M10 14h4" />
    </svg>
  );
}

function ChapitaIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M9 3h6l-1.5 4h-3z" />
    </svg>
  );
}
