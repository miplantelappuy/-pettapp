import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

interface FieldInput {
  label: string;
  value: string;
}

interface Body {
  fields: FieldInput[];
}

const MAX_FIELDS = 12;
const MAX_LABEL = 60;
const MAX_VALUE = 300;

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

  const clean: { label: string; value: string }[] = [];
  for (const f of body.fields) {
    const label = typeof f.label === "string" ? f.label.trim() : "";
    const value = typeof f.value === "string" ? f.value.trim() : "";
    if (!label || !value) continue; // filas vacías (a medio completar) se ignoran, no rompen el guardado
    if (label.length > MAX_LABEL || value.length > MAX_VALUE) {
      return NextResponse.json({ error: "Un dato es demasiado largo" }, { status: 400 });
    }
    clean.push({ label, value });
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.petEmergencyFields).where(eq(schema.petEmergencyFields.petId, petId));
    if (clean.length > 0) {
      await tx.insert(schema.petEmergencyFields).values(
        clean.map((f, i) => ({
          id: randomUUID(),
          petId,
          label: f.label,
          value: f.value,
          orderIndex: i,
        })),
      );
    }
  });

  return NextResponse.json({ ok: true, fields: clean });
}
