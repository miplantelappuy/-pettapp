import { getDemoPetHomeData } from "@/lib/demo-pet";
import { OwnerHome } from "../../pet/OwnerHome";
import { PreviewBanner } from "../PreviewBanner";

// Vista previa TEMPORAL del panel de dueño (rediseño glassmorphism): permite
// verlo sin necesitar todavía el dominio propio ni una chapita real
// vinculada con su PIN. Usa datos de muestra. Se puede borrar el día que
// haya dominio propio y mascotas reales para probar.
export default function PreviewHomePage() {
  const demoPet = getDemoPetHomeData();
  return (
    <>
      <PreviewBanner />
      <OwnerHome
        pet={demoPet}
        albumHref="/preview-album"
        manageHref="/preview-manage"
        giftsCount={2}
        giftsHref="/preview-regalos"
        vaccinationsCount={2}
        nextVaccineDue="2026-03-10"
        milestonesCount={2}
        growthHref="/preview-crecimiento"
      />
    </>
  );
}
