import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { hasOwnerAccess } from "@/lib/pin";
import { GOOGLE_LOGIN_ENABLED, EMAIL_LOGIN_ENABLED } from "@/lib/env";
import { PetPinGate } from "../PetPinGate";
import { AlbumView } from "./AlbumView";

export default async function RecuerdosPage() {
  const hdrs = await headers();
  const slug = hdrs.get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix(); // "" con dominio propio, "/p/<slug>" hoy sin uno

  if (!pet) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  const authorized = await hasOwnerAccess(pet.id, hdrs);
  if (!authorized) {
    return (
      <PetPinGate
        petId={pet.id}
        petName={pet.name}
        googleEnabled={GOOGLE_LOGIN_ENABLED}
        emailEnabled={EMAIL_LOGIN_ENABLED}
      />
    );
  }

  return <AlbumView pet={pet} backHref={prefix || "/"} />;
}
