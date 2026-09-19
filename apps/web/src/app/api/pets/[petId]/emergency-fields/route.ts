import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

const MEDICAL_ALERT_LABEL = "Alerta médica";

interface FieldInput {
  kind?: string;
  label: string;
  value: string;
}

interface Body {
  fields: FieldInput[];
}

const MAX_FIELDS = 12;
const MAX_LABEL = 60;
const MAX_VALUE = 500;

// PUT /api/pets/:petId/emergency-fields — reemplaza TODA la lista de datos
// libres del perfil de emergencia de una sola vez (borra e inserta de
// nuevo), en vez de un CRUD fila por fila — la UI de Gestionar edita la
// lista completa en memoria y guarda todo junto con un solo botón, así que
// esto alcanza y es mucho más simple que ids que van y vienen.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.fields)) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (body.fields.length > MAX_FIELDS) {
    return NextResponse.json({ error: `Máximo ${MAX_FIELDS} datos` }, { status: 400 });
  }

  const clean: { kind: "medical_alert" | "custom"; label: string; value: string }[] = [];
  let medicalAlertCount = 0;
  for (const f of body.fields) {
    const kind: "medical_alert" | "custom" = f.kind === "medical_alert" ? "medical_alert" : "custom";
    const value = typeof f.value === "string" ? f.value.trim() : "";
    // El label de "Alerta médica" es SIEMPRE el mismo, se ignora lo que
    // mande el cliente para ese caso — así nunca depende de adivinar
    // palabras del texto (eso fallaba con frases como "no tiene alergias").
    const label = kind === "medical_alert" ? MEDICAL_ALERT_LABEL : typeof f.label === "string" ? f.label.trim() : "";
    if (!value || (kind === "custom" && !label)) continue; // filas vacías a medio completar se ignoran

    if (label.length > MAX_LABEL || value.length > MAX_VALUE) {
      return NextResponse.json({ error: "Un dato es demasiado largo" }, { status: 400 });
    }
    if (kind === "medical_alert") {
      medicalAlertCount += 1;
      if (medicalAlertCount > 1) {
        return NextResponse.json({ error: "Solo puede haber un dato de Alerta médica" }, { status: 400 });
      }
    }
    clean.push({ kind, label, value });
  }

  // La alerta médica siempre va primero — no importa en qué orden la haya
  // cargado o movido el dueño, tiene que ser lo primero que se vea.
  clean.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "medical_alert" ? -1 : 1));

  await db.transaction(async (tx) => {
    await tx.delete(schema.petEmergencyFields).where(eq(schema.petEmergencyFields.petId, petId));
    if (clean.length > 0) {
      await tx.insert(schema.petEmergencyFields).values(
        clean.map((f, i) => ({
          id: randomUUID(),
          petId,
          kind: f.kind,
          label: f.label,
          value: f.value,
          orderIndex: i,
        })),
      );
    }
  });

  return NextResponse.json({ ok: true, fields: clean });
}
