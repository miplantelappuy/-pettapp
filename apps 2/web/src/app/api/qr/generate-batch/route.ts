import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";

interface Body {
  count?: number;
}

const MAX_PER_BATCH = 50;

// POST /api/qr/generate-batch
// Genera chapitas SIN asignar (status "unassigned"), listas para imprimir y
// regalar/vender — alguien recién las vincula a una mascota cuando activa la
// suya en /app. Protegido solo por "estar logueado": alcanza para esta
// etapa (Fase 0/1, un solo operador probando el producto); antes de vender
// de verdad hace falta un rol de admin de verdad acá, no cualquier cuenta.
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
