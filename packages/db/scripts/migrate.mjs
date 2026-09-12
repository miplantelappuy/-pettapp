// Corre todos los archivos migrations/*.sql en orden, llevando registro de
// cuáles ya se aplicaron en una tabla propia (_migrations) — así cada deploy
// nuevo (Railway vuelve a correr esto en cada preDeployCommand) solo aplica
// lo que falta, sin repetir nada.
//
// Sigue sin usar el journal de drizzle-kit (migraciones escritas y
// verificadas a mano contra un Postgres real antes de subirlas) — mismo
// criterio que en 0000_init.sql, ahora extendido a soportar más de un
// archivo.
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS _migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

// Compatibilidad con despliegues anteriores a esta tabla: si "pets" ya existe
// pero _migrations está vacía, es que 0000_init.sql se aplicó bajo la lógica
// vieja (que solo chequeaba la existencia de "pets"). La marcamos como
// aplicada sin volver a correrla — si no, "CREATE TABLE pets" fallaría con
// "relation already exists".
const [{ count: migrationsCount }] = await sql`SELECT COUNT(*)::int AS count FROM _migrations`;
if (migrationsCount === 0) {
  const [{ exists: petsExists }] = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'pets'
    ) AS exists
  `;
  if (petsExists) {
    await sql`INSERT INTO _migrations (name) VALUES ('0000_init.sql')`;
    console.log("0000_init.sql ya estaba aplicada (detectado por compatibilidad) — registrada.");
  }
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort(); // los nombres empiezan con 0000_, 0001_... el orden alfabético alcanza

for (const file of files) {
  const [{ exists: alreadyApplied }] = await sql`
    SELECT EXISTS (SELECT FROM _migrations WHERE name = ${file}) AS exists
  `;
  if (alreadyApplied) {
    console.log(`${file} ya aplicada — no se repite.`);
    continue;
  }

  const migrationSql = readFileSync(join(migrationsDir, file), "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(migrationSql);
    await tx`INSERT INTO _migrations (name) VALUES (${file})`;
  });
  console.log(`${file} aplicada correctamente.`);
}

await sql.end();
