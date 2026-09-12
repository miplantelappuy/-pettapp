import { headers } from "next/headers";
import { eq, and, isNull } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getPetHomeData } from "@/lib/pets-data";
import { getVaccinations } from "@/lib/vaccinations-data";
import { getMilestones } from "@/lib/milestones-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { hasPetAccess } from "@/lib/pin";
import { OwnerHome } from "./OwnerHome";
import { PetPinGate } from "./PetPinGate";

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

  const authorized = await hasPetAccess(pet.id);
  if (!authorized) {
    return <PetPinGate petId={pet.id} petName={pet.name} />;
  }

  // findMany + length en vez de un count() agregado: son pocas filas por
  // mascota (regalos sin abrir), y así no dependemos de la sintaxis de
  // agregación de drizzle-orm, que no pudimos probar contra una build real
  // en este entorno.
  const pendingGifts = await db.query.petGifts.findMany({
    where: and(eq(schema.petGifts.petId, pet.id), isNull(schema.petGifts.openedAt)),
    columns: { id: true },
  });
  const giftsCount = pendingGifts.length;

  // Solo lo mínimo para el resumen en el Home (cuántas hay + la próxima
  // fecha si hay alguna cargada) — el detalle completo (agregar/borrar) vive
  // en Gestionar, esto es nada más una vidriera que invita a entrar ahí.
  const vaccinations = await getVaccinations(pet.id);
  const nextVaccineDue = vaccinations
    .map((v) => v.nextDueAt)
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null;

  const milestones = await getMilestones(pet.id);

  return (
    <OwnerHome
      pet={pet}
      albumHref={`${prefix}/recuerdos`}
      manageHref={`${prefix}/gestionar`}
      giftsHref={`${prefix}/regalos`}
      giftsCount={giftsCount}
      vaccinationsCount={vaccinations.length}
      nextVaccineDue={nextVaccineDue}
      milestonesCount={milestones.length}
      growthHref={`${prefix}/crecimiento`}
    />
  );
}
