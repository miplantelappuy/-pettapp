ALTER TABLE pets ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS show_basic_info_public boolean NOT NULL DEFAULT false;
