// Aplica migrations/0000_init.sql usando el cliente `postgres` (ya es
// dependencia de este paquete) en vez de shellear a `psql` — así funciona
// igual en local y en el contenedor de Railway, que no trae `psql` instalado.
// No usamos el journal de drizzle-kit todavía (una sola migración, ya
// verificada a mano) — cuando el schema empiece a iterar de verdad conviene
// pasar a `drizzle-kit generate`/`migrate` con su tracking propio.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const migrationFile = join(here, "..", "migrations", "0000_init.sql");

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const migrationSql = readFileSync(migrationFile, "utf8");

// Idempotente: si ya existe la tabla "pets", asumimos que esta migración ya
// se aplicó (deploys sucesivos vuelven a correr preDeployCommand) y no la
// reintenta — evita el error "relation already exists" en cada deploy.
const [{ exists }] = await sql`
  SELECT EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'pets'
  ) AS exists
`;

if (exists) {
  console.log("Migración 0000_init ya aplicada — no se repite.");
} else {
  await sql.unsafe(migrationSql);
  console.log("Migración 0000_init aplicada correctamente.");
}

await sql.end();
