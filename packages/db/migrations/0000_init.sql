-- Fase 0 — schema estructural mínimo.
-- Deliberadamente NO incluye: timeline_events, health_records, growth_logs,
-- vets, reminders — esas se diseñan cuando construyamos esas funciones.

-- ── Better Auth (core) ──────────────────────────────────────────────
CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Identidad vinculada (Google, credenciales...). NO es "cuenta familiar".
CREATE TABLE account (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Plugin `organization` de Better Auth == nuestro "hogar/familia" ──
CREATE TABLE organization (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE member (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Planes y suscripción (sin cobro real todavía) ────────────────────
CREATE TABLE plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  storage_limit_mb integer,
  video_limit integer,
  pets_limit integer,
  members_limit integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_subscriptions (
  id text PRIMARY KEY,
  organization_id text NOT NULL UNIQUE REFERENCES organization(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'free' REFERENCES plans(id),
  provider text,
  external_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Mascotas ──────────────────────────────────────────────────────
CREATE TABLE pets (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  species text NOT NULL,
  breed text,
  sex text,
  birth_date date,
  birth_date_precision text NOT NULL DEFAULT 'exact',
  bio_phrase text,
  template_id text NOT NULL DEFAULT 'cinematic',
  icon_media_id text, -- FK agregada más abajo (referencia circular con pet_media)
  microchip_number text,
  lost_mode boolean NOT NULL DEFAULT false,
  lost_mode_activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pets_species_check CHECK (species IN ('dog', 'cat', 'other')),
  CONSTRAINT pets_sex_check CHECK (sex IS NULL OR sex IN ('male', 'female', 'unknown')),
  CONSTRAINT pets_birth_date_precision_check CHECK (birth_date_precision IN ('exact', 'month', 'year'))
);

CREATE TABLE pet_media (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type text NOT NULL,
  storage_key text NOT NULL,
  thumb_key text,
  width integer,
  height integer,
  duration_s numeric,
  taken_at timestamptz,
  caption text,
  order_index integer NOT NULL DEFAULT 0,
  is_profile_hero boolean NOT NULL DEFAULT false,
  created_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_media_type_check CHECK (type IN ('photo', 'video'))
);

ALTER TABLE pets
  ADD CONSTRAINT pets_icon_media_id_fkey
  FOREIGN KEY (icon_media_id) REFERENCES pet_media(id) ON DELETE SET NULL;

-- ── Chapitas QR, diseñadas para reemplazo a lo largo de la vida de la mascota ──
CREATE TABLE qr_tags (
  id text PRIMARY KEY,
  public_code text NOT NULL UNIQUE,
  public_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unassigned',
  pet_id text REFERENCES pets(id) ON DELETE SET NULL,
  batch_id text,
  distributor_channel text,
  activated_at timestamptz,
  replaced_at timestamptz,
  replaced_by_tag_id text REFERENCES qr_tags(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_tags_status_check CHECK (status IN ('unassigned', 'active', 'replaced', 'disabled'))
);

-- Solo puede existir UNA chapita 'active' por mascota a la vez.
-- Las 'replaced'/'disabled' quedan fuera de esta restricción a propósito:
-- así el historial de chapitas de una mascota nunca se pierde.
CREATE UNIQUE INDEX qr_tags_one_active_per_pet
  ON qr_tags (pet_id)
  WHERE status = 'active';

CREATE TABLE qr_scans (
  id text PRIMARY KEY,
  qr_tag_id text NOT NULL REFERENCES qr_tags(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  geo_shared boolean NOT NULL DEFAULT false,
  lat numeric,
  lng numeric,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX qr_scans_qr_tag_id_idx ON qr_scans (qr_tag_id);
CREATE INDEX pet_media_pet_id_idx ON pet_media (pet_id);
CREATE INDEX pets_organization_id_idx ON pets (organization_id);
CREATE INDEX member_organization_id_idx ON member (organization_id);
CREATE INDEX member_user_id_idx ON member (user_id);
