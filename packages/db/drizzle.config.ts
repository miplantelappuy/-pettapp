import { defineConfig } from "drizzle-kit";

// DATABASE_URL siempre viene de entorno — nunca hardcodeada acá.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida. Copiá .env.example a .env y completala.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case", // los campos camelCase de TS se mapean a columnas snake_case en Postgres
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
