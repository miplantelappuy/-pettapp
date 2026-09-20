import { headers } from "next/headers";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getPetHomeData } from "@/lib/pets-data";
import { getStorage } from "@/lib/storage";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { hasOwnerAccess } from "@/lib/pin";
import { PetPinGate } from "../PetPinGate";
import { RegalosClient } from "./RegalosClient";

export default async function RegalosPage() {
  const hdrs = await headers();
  const slug = hdrs.get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix();

  if (!pet) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  const authorized = await hasOwnerAccess(pet.id, hdrs);
  if (!authorized) {
    return <PetPinGate petId={pet.id} petName={pet.name} />;
  }

  const gifts = await db.query.petGifts.findMany({
    where: and(eq(schema.petGifts.petId, pet.id), isNull(schema.petGifts.openedAt)),
    orderBy: [desc(schema.petGifts.createdAt)],
  });

  const storage = getStorage();
  const resolved = await Promise.all(
    gifts.map(async (g) => ({
      id: g.id,
      url: await storage.getReadUrl(g.storageKey),
      note: g.senderNote,
    })),
  );

  return <RegalosClient petName={pet.name} gifts={resolved} backHref={prefix || "/"} />;
}
