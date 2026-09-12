-- Los hitos de "Crecimiento" ahora aceptan video además de foto (igual que
-- la portada del panel) — esta columna dice cuál es cuál. Default 'photo'
-- para que los hitos ya cargados (todos fotos hasta ahora) sigan andando sin
-- tocarlos.

ALTER TABLE pet_milestones ADD COLUMN media_type text NOT NULL DEFAULT 'photo';
