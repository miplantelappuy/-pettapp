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

// Un dato de alergia no puede verse como "un dato más" de la lista — quien
// encuentra a la mascota tiene que notarlo de entrada, antes de acercarse.
// Se detecta por el nombre que el dueño le puso al campo (nunca por su
// contenido, que es libre) — sin depender de tildes, para que "alérgico",
// "Alergias" o "alergia a..." cuenten todas igual. Se usa tanto en el perfil
// público (page.tsx) como en el editor de Gestionar (EmergencyCardEditor).
export function isAllergyLabel(label: string): boolean {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .includes("alerg");
}
