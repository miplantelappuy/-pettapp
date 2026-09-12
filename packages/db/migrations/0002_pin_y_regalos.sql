-- Acceso al panel de dueño por PIN (sin cuenta/login) + "sobres" de fotos
-- que cualquiera puede dejarle a la mascota al escanear su chapita.

ALTER TABLE pets ADD COLUMN manage_pin_hash text;

CREATE TABLE pet_gifts (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  content_type text NOT NULL,
  sender_note text,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pet_gifts_pet_id_idx ON pet_gifts (pet_id);
