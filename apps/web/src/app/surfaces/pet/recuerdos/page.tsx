import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";
import { AlbumView } from "./AlbumView";

export default async function RecuerdosPage() {
  const slug = (await headers()).get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;

  if (!pet) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  return <AlbumView pet={pet} />;
}
