-- "Camino de vida" (sección Crecimiento): hitos con foto + fecha + título
-- corto, cargados a mano desde Gestionar, que arman el recorrido tipo mapa
-- de niveles en /crecimiento.

CREATE TABLE pet_milestones (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  occurred_on date NOT NULL,
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pet_milestones_pet_id_idx ON pet_milestones (pet_id);
