import { getDemoPetHomeData } from "@/lib/demo-pet";
import { ResponsivePetHome } from "../../pet/ResponsivePetHome";
import { PreviewBanner } from "../PreviewBanner";

// Vista previa TEMPORAL: permite ver el Home de una mascota ya diseñado sin
// necesitar todavía el dominio propio con DNS wildcard (eso es lo único que
// falta para que esto se vea en su URL real, {slug}.tudominio.com). Usa
// datos de muestra, no una mascota real de la base de datos. Se puede borrar
// el día que haya dominio propio y mascotas reales para probar.
export default function PreviewHomePage() {
  const demoPet = getDemoPetHomeData();
  return (
    <>
      <PreviewBanner />
      <ResponsivePetHome pet={demoPet} albumHref="/preview-album" accountHref="/app" />
    </>
  );
}
