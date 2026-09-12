import { getDemoPetHomeData } from "@/lib/demo-pet";
import { AlbumView } from "../../pet/recuerdos/AlbumView";
import { PreviewBanner } from "../PreviewBanner";

// Ídem preview-home, pero para el Álbum 3D. Ver ese archivo para el detalle
// de por qué existe esta ruta temporal.
export default function PreviewAlbumPage() {
  const demoPet = getDemoPetHomeData();
  return (
    <>
      <PreviewBanner />
      <AlbumView pet={demoPet} backHref="/preview-home" />
    </>
  );
}
