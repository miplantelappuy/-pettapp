import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";

export type EmergencyFieldKind = "medical_alert" | "custom";

export interface EmergencyFieldRow {
  id: string;
  kind: EmergencyFieldKind;
  label: string;
  value: string;
}

// Datos libres que el dueño agrega al perfil público de emergencia además
// del contacto fijo (nombre/teléfono). Cada uno es "medical_alert" (como
// mucho uno por mascota, con label fijo "Alerta médica" — ver la ruta PUT)
// o "custom" (comportamiento, dirección, lo que el dueño quiera, con el
// nombre que él elija). Ver EmergencyCardEditor.tsx.
export async function getEmergencyFields(petId: string): Promise<EmergencyFieldRow[]> {
  const rows = await db.query.petEmergencyFields.findMany({
    where: eq(schema.petEmergencyFields.petId, petId),
    orderBy: [asc(schema.petEmergencyFields.orderIndex), asc(schema.petEmergencyFields.createdAt)],
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind === "medical_alert" ? "medical_alert" : "custom",
    label: r.label,
    value: r.value,
  }));
}
