import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";

export interface VaccinationRow {
  id: string;
  name: string;
  appliedAt: string;
  nextDueAt: string | null;
  notes: string | null;
}

export async function getVaccinations(petId: string): Promise<VaccinationRow[]> {
  const rows = await db.query.vaccinations.findMany({
    where: eq(schema.vaccinations.petId, petId),
    orderBy: [asc(schema.vaccinations.appliedAt)],
  });
  return rows.map((r) => ({ id: r.id, name: r.name, appliedAt: r.appliedAt, nextDueAt: r.nextDueAt, notes: r.notes }));
}
