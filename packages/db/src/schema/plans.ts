import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Listo desde Fase 0 para que aplicar límites más adelante sea agregar un
// WHERE, no una migración. No se aplican límites todavía.
export const plans = pgTable("plans", {
  id: text("id").primaryKey(), // 'free' | 'standard' | 'premium'
  name: text("name").notNull(),
  storageLimitMb: integer("storage_limit_mb"),
  videoLimit: integer("video_limit"),
  petsLimit: integer("pets_limit"),
  membersLimit: integer("members_limit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Abstracción de proveedor de pago: `provider` + `externalSubscriptionId` son
// genéricos a propósito. Cuando se integre Mercado Pago, un MercadoPagoProvider
// escribe acá — el resto del código (entitlements, límites) no cambia.
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().unique().references(() => organization.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().default("free").references(() => plans.id),
  provider: text("provider"), // null mientras no haya cobro real ('mercadopago', 'stripe', ...)
  externalSubscriptionId: text("external_subscription_id"),
  status: text("status").notNull().default("active"), // active | canceled | past_due
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
