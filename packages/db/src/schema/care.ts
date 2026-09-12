import { pgTable, text, date, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { pets } from "./pets";

// Registro de salud mínimo pedido para esta parte de Fase 1: vacunas.
// Deliberadamente NO es el módulo de "Salud" completo (eso sigue pendiente,
// con más tipos de evento, recordatorios, etc.) — es la pieza chica que el
// dueño pidió para poder cargar datos reales ya.
export const vaccinations = pgTable("vaccinations", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ej: "Rabia", "Quíntuple"
  appliedAt: date("applied_at").notNull(),
  nextDueAt: date("next_due_at"), // opcional: cuándo toca la próxima dosis
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Suscripciones a notificaciones push del navegador (Web Push estándar, sin
// ningún servicio de terceros pago: FCM/APNs no hacen falta para esto).
// Una organización (el "hogar") puede tener varias suscripciones activas —
// cada dispositivo/navegador donde alguien de la familia aceptó notificaciones
// es una fila distinta, así el aviso de "escanearon la chapita" les llega a
// todos, no solo a quien la activó primero.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
