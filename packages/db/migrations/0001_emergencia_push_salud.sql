-- Fase 1 (parte 2): contacto de emergencia en la chapita, notificaciones
-- push por navegador (sin servicio de terceros) y vacunas.

ALTER TABLE pets ADD COLUMN emergency_contact_name text;
ALTER TABLE pets ADD COLUMN emergency_contact_phone text;

CREATE TABLE vaccinations (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name text NOT NULL,
  applied_at date NOT NULL,
  next_due_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vaccinations_pet_id_idx ON vaccinations (pet_id);

CREATE TABLE push_subscriptions (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_organization_id_idx ON push_subscriptions (organization_id);
