import { headers } from "next/headers";

export default async function PetHomePage() {
  const slug = (await headers()).get("x-pet-slug");
  return (
    <main>
      <h1>La app de {slug ?? "tu mascota"}</h1>
      <p>Fase 0: placeholder — Home/Recuerdos/Timeline/Salud llegan en fases siguientes.</p>
    </main>
  );
}
