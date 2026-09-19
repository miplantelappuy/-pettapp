CREATE TABLE IF NOT EXISTS pet_emergency_fields (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_emergency_fields_pet_id_idx ON pet_emergency_fields(pet_id);
