import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { requireAdminSession } from "@/lib/authz";

interface Body {
  count?: number;
}

const MAX_PER_BATCH = 50;

// POST /api/qr/generate-batch
// Genera chapitas SIN asignar (status "unassigned"), listas para imprimir y
// regalar/vender — alguien recién las vincula a una mascota cuando activa la
// suya en /app. Restringido a operador (ver lib/authz.ts#requireAdminSession
// + lib/env.ts#ADMIN_EMAILS) en vez de "cualquier cuenta logueada".
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession(request.headers);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const count = Math.min(Math.max(Math.trunc(body.count ?? 10), 1), MAX_PER_BATCH);

  // El código corto ("PET-000123") es correlativo — se calcula a partir del
  // más alto ya existente, no de un contador aparte, para no tener que
  // mantener sincronizada una secuencia extra.
  const existing = await db.query.qrTags.findMany({
    where: like(schema.qrTags.publicCode, "PET-%"),
    columns: { publicCode: true },
  });
  let nextNumber = 1;
  for (const row of existing) {
    const n = Number(row.publicCode.slice("PET-".length));
    if (Number.isFinite(n) && n >= nextNumber) nextNumber = n + 1;
  }

  const batchId = randomUUID();
  const rows = Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    publicCode: `PET-${String(nextNumber + i).padStart(6, "0")}`,
    publicToken: randomUUID(),
    batchId,
  }));

  await db.insert(schema.qrTags).values(rows);

  return NextResponse.json({ batchId, tags: rows }, { status: 201 });
}
