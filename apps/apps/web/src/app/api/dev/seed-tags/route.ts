import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { emergencyPath, scanUrlFor } from "@/lib/env";

interface Body {
  count?: number;
}

const MAX_PER_BATCH = 20;

// POST /api/dev/seed-tags
// Hermano de /api/qr/generate-batch pero SIN pedir sesión — existe para que
// Facundo pueda crear chapitas de prueba con un botón desde /panel sin tener
// que loguearse primero (hoy el login por magic-link no manda mail de
// verdad: RESEND_API_KEY no está configurada). Mismo criterio que las
// páginas /preview-*: es una herramienta de esta etapa (fase 0, un solo
// operador probando el producto) — antes de compartir la app con nadie más
// hay que sacar esto o ponerle un control de acceso de verdad, igual que
// generate-batch necesita un rol de admin real antes de vender.
export async function POST(request: NextRequest) {
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
