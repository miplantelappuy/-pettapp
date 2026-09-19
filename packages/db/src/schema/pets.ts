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
  // Qué FOTO (nunca un video — el perfil de emergencia necesita algo que se
  // vea siempre, sin depender de que un video cargue) se muestra en
  // tag.BASE_DOMAIN/t/<token>. Elegida a mano por el dueño entre sus fotos
  // ya cargadas — separada a propósito de cuál es la portada del Home
  // (que ahora rota sola y puede tocarle un video). null hasta que el dueño
  // elija una; getPetHomeData cae a la primera foto disponible mientras tanto.
  emergencyPhotoMediaId: text("emergency_photo_media_id"),
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
  // Zona/barrio donde se perdió — opcional, la carga el dueño al activar el
  // modo perdido. Se muestra en el cartel de alerta del perfil público
  // ("se perdió en la zona X") para que quien lo ve sepa si está cerca. Se
  // limpia cuando se desactiva el modo perdido (mismo criterio que
  // lostModeActivatedAt): si vuelve a perderse más adelante, no debería
  // arrastrar una zona vieja que ya no aplica.
  lostZone: text("lost_zone"),
  // Email opcional para avisos de escaneo (además del push) — separado del
  // email de una cuenta de verdad (que en el flujo principal ni existe) por
  // la misma razón que managePinHash: acá no hay usuario/sesión, la mascota
  // misma guarda todo lo que necesita para avisar a su familia.
  notifyEmail: text("notify_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const petMedia = pgTable("pet_media", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references((): AnyPgColumn => pets.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'photo' | 'video'
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key"),
  // Frame fijo (JPG) del video ya comprimido — se manda como atributo
  // `poster` del <video> para que se vea algo al instante mientras el video
  // de verdad todavía carga de fondo. null en fotos y en videos subidos
  // antes de que existiera esto.
  posterKey: text("poster_key"),
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

// "Camino de vida": hitos curados a mano (no cada foto del álbum, solo los
// momentos importantes) que arman el recorrido tipo mapa de niveles que se
// ve en /crecimiento — del nacimiento/llegada a la familia hasta hoy. Tabla
// separada de pet_media a propósito: son cosas distintas (un álbum de fotos
// vs. una línea de tiempo curada), aunque las dos guarden una foto.
export const petMilestones = pgTable("pet_milestones", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references((): AnyPgColumn => pets.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // ej: "Llegó a casa", "Primer verano en la playa"
  occurredOn: date("occurred_on").notNull(),
  storageKey: text("storage_key").notNull(),
  mediaType: text("media_type").notNull().default("photo"), // 'photo' | 'video' — el video se comprime igual que la portada
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

// Datos libres para el perfil de emergencia. Dos tipos ("kind"):
// - "medical_alert": UN dato fijo y especial ("Alerta médica") donde el
//   dueño escribe todo lo relevante (alergias, condiciones, medicación) en
//   un solo bloque de texto — se detecta por este campo, NUNCA adivinando
//   palabras del texto que escribió el dueño (eso fallaba: "no es alergia
//   a nada" también contiene "alergia"). Como mucho una fila por mascota.
// - "custom": cualquier otro dato libre que el dueño quiera agregar
//   (comportamiento, dirección, lo que sea), con el nombre que él elija.
// orderIndex conserva el orden — el server siempre ordena "medical_alert"
// primero antes de guardar, así aparece de entrada sin importar en qué
// orden lo haya cargado el dueño.
export const petEmergencyFields = pgTable("pet_emergency_fields", {
  id: text("id").primaryKey(),
  petId: text("pet_id").notNull().references((): AnyPgColumn => pets.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("custom"), // 'medical_alert' | 'custom'
  label: text("label").notNull(),
  value: text("value").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
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
