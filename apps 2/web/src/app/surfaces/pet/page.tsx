import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { crossSurfaceUrl } from "@/lib/env";
import { ResponsivePetHome } from "./ResponsivePetHome";

export default async function PetHomePage() {
  const slug = (await headers()).get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix(); // "" con dominio propio, "/p/<slug>" hoy sin uno

  if (!pet) {
    // No debería pasar en uso normal (el middleware ya resolvió el slug),
    // pero si la mascota fue borrada o el slug es inválido, mostramos algo
    // cálido en vez de un error crudo.
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  return <ResponsivePetHome pet={pet} albumHref={`${prefix}/recuerdos`} accountHref={crossSurfaceUrl("app")} />;
}
