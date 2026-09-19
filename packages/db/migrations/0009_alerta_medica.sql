ALTER TABLE pet_emergency_fields ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom';
