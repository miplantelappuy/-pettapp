// Genera un lote de chapitas QR sin asignar, listas para imprimir.
// Uso: npx tsx scripts/generate-qr-batch.ts --count=500 --batch=batch_2026_09
//
// public_code  -> va impreso en la chapita para soporte/lookup manual (PET-000123)
// public_token -> va DENTRO del QR (URL tag.BASE_DOMAIN/t/{token}), es opaco
//                 a propósito para que no se puedan adivinar/enumerar chapitas.

import { randomUUID, randomBytes } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { sql } from "drizzle-orm";

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v];
    }),
  );
  const count = Number(args.count ?? 100);
  const batchId = args.batch ?? `batch_${new Date().toISOString().slice(0, 10)}`;
  const channel = args.channel ?? null;
  return { count, batchId, channel };
}

async function nextCodeSeed(): Promise<number> {
  const [row] = await db.execute<{ max: number | null }>(
    sql`SELECT MAX(CAST(SUBSTRING(public_code FROM 5) AS INTEGER)) AS max FROM qr_tags WHERE public_code LIKE 'PET-%'`,
  );
  return (row?.max ?? 0) + 1;
}

async function main() {
  const { count, batchId, channel } = parseArgs();
  let seed = await nextCodeSeed();

  const rows = Array.from({ length: count }, () => {
    const code = `PET-${String(seed++).padStart(6, "0")}`;
    const token = randomBytes(16).toString("base64url"); // opaco, no adivinable
    return {
      id: randomUUID(),
      publicCode: code,
      publicToken: token,
      status: "unassigned" as const,
      batchId,
      distributorChannel: channel,
    };
  });

  await db.insert(schema.qrTags).values(rows);
  console.log(`Generadas ${rows.length} chapitas en el lote "${batchId}".`);
  console.log(`Ejemplo: ${rows[0].publicCode} -> https://tag.<BASE_DOMAIN>/t/${rows[0].publicToken}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
