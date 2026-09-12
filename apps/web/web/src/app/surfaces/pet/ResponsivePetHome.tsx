import type { PetHomeData } from "@/lib/pets-data";
import { PetHome } from "./PetHome";
import { PetHomeDesktop } from "./PetHomeDesktop";
import styles from "./ResponsivePetHome.module.css";

interface Props {
  pet: PetHomeData;
  albumHref?: string;
  accountHref?: string;
}

// Celular y PC son a propósito DOS experiencias distintas, no una que se
// reordena con CSS: en celular es un álbum que se hojea con el pulgar
// (PetHome, con su barra inferior tipo app nativa); en PC es una pared de
// galería con un panel fijo al costado (PetHomeDesktop). Se renderizan las
// dos y el navegador muestra una sola vía @media — así no hace falta JS
// detectando el ancho de pantalla, ni hay riesgo de parpadeo al hidratar.
export function ResponsivePetHome({ pet, albumHref, accountHref }: Props) {
  return (
    <>
      <div className={styles.mobileOnly}>
        <PetHome pet={pet} albumHref={albumHref} accountHref={accountHref} />
      </div>
      <div className={styles.desktopOnly}>
        <PetHomeDesktop pet={pet} albumHref={albumHref} accountHref={accountHref} />
      </div>
    </>
  );
}
