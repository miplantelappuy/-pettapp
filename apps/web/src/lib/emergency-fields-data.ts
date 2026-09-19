import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";

export interface EmergencyFieldRow {
  id: string;
  label: string;
  value: string;
}

// Datos libres que el dueño agrega al perfil público de emergencia además
// del contacto fijo (nombre/teléfono) — "Alergias: penicilina", "Dirección:
// ...", lo que se le ocurra. Ver PetEmergencyFieldsEditor en ManagePet.tsx.
export async function getEmergencyFields(petId: string): Promise<EmergencyFieldRow[]> {
  const rows = await db.query.petEmergencyFields.findMany({
    where: eq(schema.petEmergencyFields.petId, petId),
    orderBy: [asc(schema.petEmergencyFields.orderIndex), asc(schema.petEmergencyFields.createdAt)],
  });
  return rows.map((r) => ({ id: r.id, label: r.label, value: r.value }));
}
