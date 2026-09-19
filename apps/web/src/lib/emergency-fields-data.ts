import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";

// Reexportada acá para no romper a quien ya la importaba desde este archivo
// (page.tsx) — la definición de verdad vive en ./allergy, sin imports de
// servidor, para que un componente "use client" la pueda usar sin arrastrar
// el cliente de Postgres al bundle del navegador (ver el comentario ahí).
export { isAllergyLabel } from "./allergy";

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
