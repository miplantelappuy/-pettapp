import {
  pgTable,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  uniqueIndex,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization, user } from "./auth";

export const pets = pgTable("pets", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(), // define el subdominio {slug}.BASE_DOMAIN
  name: text("name").notNull(),
  species: text("species").notNull(), // 'dog' | 'cat' | 'other'
  breed: text("breed"),
  sex: text("sex"), // 'male' | 'female' | 'unknown'
  birthDate: date("birth_date"),
  birthDatePrecision: text("birth_date_precision").notNull().default("exact"), // exact | month | year
  bioPhrase: text("bio_phrase"),
  templateId: text("template_id").notNull().default("cinematic"), // arquitectura lista; plantillas reales son Fase 1+
  // Contacto que se muestra en el perfil público de emergencia (tag.BASE_DOMAIN/t/…)
  // para el botón "Llamar al dueño". Vive en la mascota (no en el usuario/org)
  // porque quien contesta ese teléfono puede no ser el mismo para cada mascota
  // de una familia con varias, y porque el dueño lo tiene que poder cambiar sin
  // afectar su teléfono de cuenta.
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // FK a pet_media declarada más abajo para evitar dependencia circular en la definición.
  iconMediaId: text("icon_media_id"),
  microchipNumber: text("microchip_number"),
  // Acceso al panel de dueño SIN cuenta/login: un PIN de 4-6 dígitos que se
  // define al vincular la chapita (ver /api/qr/activate). Se guarda hasheado
  // (lib/pin.ts, scrypt con salt propio) — nunca en texto plano. null en
  // mascotas creadas antes de este cambio (no debería haber ninguna en
  // producción real todavía).
  managePinHash: text("manage_pin_hash"),
  lostMode: boolean("lost_mode").notNull().default(false),
  lostModeActivatedAt: timestamp("lost_mode_activated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const petMedia = pgTable("pet_media", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references((): AnyPgColumn => pets.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'photo' | 'video'
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key"),
  width: integer("width"),
  height: integer("height"),
  durationS: numeric("duration_s"),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  caption: text("caption"),
  orderIndex: integer("order_index").notNull().default(0),
  isProfileHero: boolean("is_profile_hero").notNull().default(false),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Chapitas QR. Diseñadas para reemplazo: una mascota puede tener varias a lo
// largo de su vida, y la relación histórica nunca se borra.
export const qrTags = pgTable(
  "qr_tags",
  {
    id: text("id").primaryKey(),
    publicCode: text("public_code").notNull().unique(), // PET-000123, para impresión/soporte
    publicToken: text("public_token").notNull().unique(), // opaco, es lo que va en la URL del QR físico
    status: text("status").notNull().default("unassigned"), // unassigned | active | replaced | disabled
    petId: text("pet_id").references((): AnyPgColumn => pets.id, { onDelete: "set null" }),
    batchId: text("batch_id"),
    distributorChannel: text("distributor_channel"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    // Encadena la chapita vieja con la que la reemplazó, para reconstruir el historial completo.
    replacedByTagId: text("replaced_by_tag_id").references((): AnyPgColumn => qrTags.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Garantiza que una mascota nunca tenga más de una chapita "active" a la vez.
    // (Postgres solo permite un índice único parcial; el estado 'replaced'/'disabled'
    // queda fuera de esta restricción a propósito, por eso el historial se conserva.)
    onlyOneActivePerPet: uniqueIndex("qr_tags_one_active_per_pet")
      .on(table.petId)
      .where(sql`${table.status} = 'active'`),
  }),
);

// "Sobres de figuritas": cualquiera que escanea una chapita activa puede
// dejarle fotos a la mascota sin necesitar cuenta ni PIN — el dueño las
// encuentra sin abrir todavía (openedAt null) la próxima vez que entra a su
// panel, como una sorpresa. Al abrirlas, el dueño decide cuáles guardar de
// verdad en pet_media (ver /surfaces/pet/regalos).
export const petGifts = pgTable("pet_gifts", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references((): AnyPgColumn => pets.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  senderNote: text("sender_note"),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qrScans = pgTable("qr_scans", {
  id: text("id").primaryKey(),
  qrTagId: text("qr_tag_id").notNull().references(() => qrTags.id, { onDelete: "cascade" }),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  geoShared: boolean("geo_shared").notNull().default(false),
  lat: numeric("lat"),
  lng: numeric("lng"),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
