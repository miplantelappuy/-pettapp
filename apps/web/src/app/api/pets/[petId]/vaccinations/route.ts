import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, asc } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

interface Body {
  name: string;
  appliedAt: string; // "YYYY-MM-DD"
  nextDueAt?: string | null;
  notes?: string | null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const rows = await db.query.vaccinations.findMany({
    where: eq(schema.vaccinations.petId, petId),
    orderBy: [asc(schema.vaccinations.appliedAt)],
  });
  return NextResponse.json({ vaccinations: rows });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = (await request.json()) as Body;
  if (!body?.name || !body?.appliedAt) {
    return NextResponse.json({ error: "Faltan campos (nombre, fecha)" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(schema.vaccinations).values({
    id,
    petId,
    name: body.name,
    appliedAt: body.appliedAt,
    nextDueAt: body.nextDueAt || null,
    notes: body.notes || null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
