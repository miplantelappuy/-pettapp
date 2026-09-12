import { getDemoPetHomeData } from "@/lib/demo-pet";
import { OwnerHome } from "../../pet/OwnerHome";
import { PreviewBanner } from "../PreviewBanner";

const DEMO_MILESTONES = [
  { id: "demo-m1", title: "Llegó a casa", occurredOn: "2024-06-20", mediaUrl: "https://placedog.net/800/800?id=12", mediaType: "photo" as const },
  { id: "demo-m2", title: "Primer verano en la playa", occurredOn: "2024-12-15", mediaUrl: "https://placedog.net/800/800?id=25", mediaType: "photo" as const },
  { id: "demo-m3", title: "Primer cumpleaños", occurredOn: "2025-06-15", mediaUrl: "https://placedog.net/800/800?id=40", mediaType: "photo" as const },
];

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
        milestones={DEMO_MILESTONES}
        demoMode
      />
    </>
  );
}
