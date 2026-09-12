import { getDemoPetHomeData } from "@/lib/demo-pet";
import { GrowthPath } from "../../pet/crecimiento/GrowthPath";
import { PreviewBanner } from "../PreviewBanner";

const DEMO_MILESTONES = [
  { id: "demo-m1", title: "Llegó a casa", occurredOn: "2024-06-20", mediaUrl: "https://placedog.net/800/800?id=12", mediaType: "photo" as const },
  { id: "demo-m2", title: "Primer verano en la playa", occurredOn: "2024-12-15", mediaUrl: "https://placedog.net/800/800?id=25", mediaType: "photo" as const },
  { id: "demo-m3", title: "Primer cumpleaños", occurredOn: "2025-06-15", mediaUrl: "https://placedog.net/800/800?id=40", mediaType: "photo" as const },
];

// Vista previa TEMPORAL de "El camino de vida" (Crecimiento) — mismos datos
// de muestra que /preview-home y /preview-manage. Se puede borrar el día
// que haya dominio propio y mascotas reales con hitos cargados de verdad.
export default function PreviewCrecimientoPage() {
  const demoPet = getDemoPetHomeData();
  return (
    <>
      <PreviewBanner />
      <main>
        <GrowthPath
          petName={demoPet.name}
          species={demoPet.species}
          birthDate={demoPet.birthDate}
          milestones={DEMO_MILESTONES}
          backHref="/preview-home"
          manageHref="/preview-manage"
          petId="demo-pet"
          demoMode
        />
      </main>
    </>
  );
}
