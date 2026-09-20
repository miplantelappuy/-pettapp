import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { emergencyPath, scanUrlFor } from "@/lib/env";
import { requireAdminSession } from "@/lib/authz";

interface Body {
  count?: number;
}

const MAX_PER_BATCH = 20;

// POST /api/dev/seed-tags
// Hermano de /api/qr/generate-batch, para el botón "Crear chapita de
// prueba" de /panel. Antes no pedía sesión (se creó cuando el login por
// magic-link todavía no mandaba mail de verdad) — como /panel es una URL
// pública sin ningún gate, eso significaba que cualquiera que la encontrara
// podía crear chapitas reales en la base sin límite. Ahora que Google login
// funciona, pide lo mismo que generate-batch (ver lib/authz.ts#requireAdminSession).
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession(request.headers);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const count = Math.min(Math.max(Math.trunc(body.count ?? 1), 1), MAX_PER_BATCH);

  // Mismo cálculo correlativo que generate-batch, contra el código más alto
  // ya existente — así ambos caminos de creación nunca pisan un código.
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

  // Devolvemos el link de activación ya armado (relativo, para un botón acá
  // mismo en /panel) y la URL absoluta (la que en la vida real graba el QR
  // físico), para no obligar a nadie a construirla a mano.
  const tags = rows.map((row) => ({
    code: row.publicCode,
    token: row.publicToken,
    activateHref: emergencyPath(row.publicToken),
    scanUrl: scanUrlFor(row.publicToken),
  }));

  return NextResponse.json({ batchId, tags }, { status: 201 });
}
