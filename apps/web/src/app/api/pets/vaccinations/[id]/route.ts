import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const record = await db.query.vaccinations.findFirst({ where: eq(schema.vaccinations.id, id) });
  if (!record) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const check = await assertPetOwnership(request, record.petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  await db.delete(schema.vaccinations).where(eq(schema.vaccinations.id, id));
  return NextResponse.json({ ok: true });
}
