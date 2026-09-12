import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";
import { getMilestones } from "@/lib/milestones-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { hasPetAccess } from "@/lib/pin";
import { PetPinGate } from "../PetPinGate";
import { GrowthPath } from "./GrowthPath";

export default async function CrecimientoPage() {
  const slug = (await headers()).get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix(); // "" con dominio propio, "/p/<slug>" hoy sin uno

  if (!pet) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  const authorized = await hasPetAccess(pet.id);
  if (!authorized) {
    return <PetPinGate petId={pet.id} petName={pet.name} />;
  }

  const milestones = await getMilestones(pet.id);

  return (
    <GrowthPath
      petName={pet.name}
      birthDate={pet.birthDate}
      milestones={milestones}
      backHref={prefix || "/"}
      manageHref={`${prefix}/gestionar`}
    />
  );
}
