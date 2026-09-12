import { getDemoPetHomeData } from "@/lib/demo-pet";
import { ManagePet } from "../../account/pets/[petId]/ManagePet";
import { PreviewBanner } from "../PreviewBanner";

const DEMO_VACCINATIONS = [
  { id: "demo-v1", name: "Rabia", appliedAt: "2025-03-10", nextDueAt: "2026-03-10", notes: null },
  { id: "demo-v2", name: "Quíntuple", appliedAt: "2025-03-10", nextDueAt: null, notes: null },
];

// Vista previa del panel de gestión (fotos, estilo, contacto, vacunas) que
// va a usar el dueño. Funciona de verdad en pantalla (podés tocar los
// botones y ver que reaccionan) pero en memoria — no se guarda nada, porque
// no hay login ni mascota real todavía sin dominio propio.
export default function PreviewManagePage() {
  const demoPet = getDemoPetHomeData();
  return (
    <>
      <PreviewBanner />
      <ManagePet petId="demo-pet" initialPet={demoPet} initialVaccinations={DEMO_VACCINATIONS} demoMode />
    </>
  );
}
