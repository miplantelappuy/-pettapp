import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";
import { getVaccinations } from "@/lib/vaccinations-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { hasPetAccess } from "@/lib/pin";
import { PetPinGate } from "../PetPinGate";
import { ManagePet } from "../../account/pets/[petId]/ManagePet";

// Vive en la superficie de la mascota (no ya en /app/pets/<id>) porque el
// acceso ahora es por PIN, no por sesión — reutiliza el mismo componente
// ManagePet de siempre, que no sabe ni le importa de dónde vino el permiso.
export default async function GestionarPage() {
  const slug = (await headers()).get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix();

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

  const vaccinations = await getVaccinations(pet.id);

  return <ManagePet petId={pet.id} initialPet={pet} initialVaccinations={vaccinations} accountHref={prefix || "/"} />;
}
