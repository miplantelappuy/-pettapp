import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const record = await db.query.petMilestones.findFirst({ where: eq(schema.petMilestones.id, id) });
  if (!record) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const check = await assertPetOwnership(request, record.petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  // No se borra el archivo de R2 (mismo criterio que al borrar una foto del
  // álbum) — simplicidad de Fase 0/1, se puede sumar una limpieza real más
  // adelante si el volumen lo justifica.
  await db.delete(schema.petMilestones).where(eq(schema.petMilestones.id, id));
  return NextResponse.json({ ok: true });
}
