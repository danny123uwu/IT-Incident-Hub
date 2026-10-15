-- IT Incident Hub: esquema inicial (idempotente).
-- Se ejecuta automáticamente al crear el volumen de PostgreSQL por primera vez.

CREATE TABLE IF NOT EXISTS technicians (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text NOT NULL UNIQUE,
    specialty   text NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS incidents (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
    description   text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 4000),
    category      text NOT NULL CHECK (category IN ('HARDWARE', 'SOFTWARE', 'RED', 'ACCESOS', 'CORREO', 'OTROS')),
    priority      text NOT NULL CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    reporter      text NOT NULL,
    status        text NOT NULL DEFAULT 'NUEVO'
                  CHECK (status IN ('NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO')),
    technician_id integer REFERENCES technicians (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status     ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority   ON incidents (priority);
CREATE INDEX IF NOT EXISTS idx_incidents_category   ON incidents (category);
CREATE INDEX IF NOT EXISTS idx_incidents_technician ON incidents (technician_id);

-- Bitácora por incidente: creación, comentarios, asignaciones y cambios de estado.
CREATE TABLE IF NOT EXISTS incident_events (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incident_id integer NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    kind        text NOT NULL CHECK (kind IN ('CREADO', 'COMENTARIO', 'ASIGNACION', 'ESTADO')),
    author      text NOT NULL,
    message     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_incident ON incident_events (incident_id, created_at);

INSERT INTO technicians (name, specialty) VALUES
    ('Ana Morales',   'Redes'),
    ('Luis Pérez',    'Hardware'),
    ('Carla Gómez',   'Software'),
    ('Diego Ramírez', 'Accesos')
ON CONFLICT (name) DO NOTHING;
