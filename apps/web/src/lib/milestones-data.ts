import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getStorage } from "./storage";

export interface MilestoneRow {
  id: string;
  title: string;
  occurredOn: string;
  photoUrl: string;
}

// Igual que getPetHomeData en pets-data.ts: acá se resuelve la URL de la
// foto (firmada en R2, o el endpoint local en dev) para que a quien llama
// nunca le importe cómo se guardan los archivos.
export async function getMilestones(petId: string): Promise<MilestoneRow[]> {
  const rows = await db.query.petMilestones.findMany({
    where: eq(schema.petMilestones.petId, petId),
    orderBy: [asc(schema.petMilestones.occurredOn)],
  });

  const storage = getStorage();
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      title: r.title,
      occurredOn: r.occurredOn,
      photoUrl: await storage.getReadUrl(r.storageKey),
    })),
  );
}
