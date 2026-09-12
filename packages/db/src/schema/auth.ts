// Tablas requeridas por Better Auth (core, sin plugins).
// Los nombres y columnas siguen exactamente lo que Better Auth espera por defecto:
// https://www.better-auth.com/docs/concepts/database
//
// OJO con el nombre: la tabla "account" de Better Auth es una identidad vinculada
// (Google, credenciales, etc.), NO tiene nada que ver con nuestro concepto de
// "cuenta familiar". Para evitar esa confusión, el grupo familiar lo modelamos
// con el plugin `organization` de Better Auth (ver schema/pets.ts, que referencia
// `organization.id`), y reservamos la palabra "household" en el resto del código
// cuando hablamos del concepto de producto.

import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Requerida por el plugin `organization`: qué hogar está "activo" en esta
  // sesión. La agregamos acá arriba (declarada antes que `organization` en
  // este archivo) por eso la FK real vive en la migración SQL como
  // ALTER TABLE separado, no inline — mismo patrón que ya usamos para
  // pets.icon_media_id.
  activeOrganizationId: text("active_organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Identidad vinculada (email+password si algún día lo usamos, Google, Apple...).
// Esto es lo que hace posible el account linking: varias filas de "account"
// pueden apuntar al mismo user.id.
// OJO: el nombre de este export (`account`, no `authAccount`) importa de
// verdad — el adaptador de Drizzle de Better Auth busca `schema.account`
// por ese nombre exacto para saber dónde guardar identidades vinculadas.
// Renombrarlo rompe silenciosamente esa detección (lo aprendimos corriendo
// el build real: tiraba "missing table: account" aunque la tabla sí
// existiera, porque buscaba la clave del objeto JS, no el nombre SQL).
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Usada por el plugin de magic link para guardar el token de un solo uso.
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tablas del plugin `organization` — este ES nuestro "hogar/familia".
// Better Auth las genera automáticamente al activar el plugin; las declaramos
// acá también para que Drizzle pueda tipar los joins del resto del schema.
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  // Better Auth guarda acá metadata arbitraria de la organización como
  // JSON serializado a texto (no jsonb) — así es como lo espera su
  // adaptador de Drizzle por defecto.
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"), // owner | member (co-responsable)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Invitaciones a un hogar existente — tabla que el plugin `organization`
// necesita aunque Fase 0 no exponga todavía una pantalla para usarla (no es
// una función nueva que estemos adelantando de Fase 1: es parte del schema
// mínimo que el plugin ya activado requiere para funcionar sin romperse).
export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
