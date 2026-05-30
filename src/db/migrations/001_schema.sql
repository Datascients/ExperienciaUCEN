-- ConsultorEstudiantilIA — Schema completo
-- Ejecutar en: Supabase → SQL Editor

-- ── Usuarios (consejeros, docentes, admin) ────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_usuarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  nombre     TEXT NOT NULL,
  rol        TEXT NOT NULL CHECK (rol IN ('consejero','docente','admin')),
  facultad   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Estudiantes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_estudiantes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut                     TEXT UNIQUE,
  nombre                  TEXT NOT NULL,
  carrera                 TEXT,
  semestre                INT,
  creditos_aprobados      INT DEFAULT 0,
  promedio                FLOAT,
  porcentaje_asistencia   FLOAT,
  estado                  TEXT DEFAULT 'activo',
  datos_socioeconomicos   JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Scores ML ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_scores_ml (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id   UUID REFERENCES desercion_estudiantes(id) ON DELETE CASCADE,
  score           FLOAT NOT NULL,
  nivel           TEXT NOT NULL CHECK (nivel IN ('alto','medio','bajo')),
  features        JSONB DEFAULT '{}',
  modelo_version  TEXT DEFAULT 'v1.0',
  calculado_en    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_estudiante ON desercion_scores_ml(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_scores_nivel ON desercion_scores_ml(nivel);

-- ── Intervenciones ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_intervenciones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id  UUID REFERENCES desercion_estudiantes(id) ON DELETE CASCADE,
  consejero_id   UUID REFERENCES desercion_usuarios(id) ON DELETE SET NULL,
  tipo           TEXT NOT NULL,
  estado         TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','exitosa','no_contacto','derivada','cancelada')),
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervenciones_estudiante ON desercion_intervenciones(estudiante_id);

-- ── Citas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_citas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id  UUID REFERENCES desercion_estudiantes(id) ON DELETE CASCADE,
  consejero_id   UUID REFERENCES desercion_usuarios(id) ON DELETE SET NULL,
  fecha_hora     TIMESTAMPTZ NOT NULL,
  modalidad      TEXT DEFAULT 'videollamada' CHECK (modalidad IN ('videollamada','presencial','telefonica')),
  estado         TEXT DEFAULT 'agendada' CHECK (estado IN ('agendada','realizada','cancelada')),
  link_sala      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Interacciones / Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desercion_interactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query                 TEXT,
  response              JSONB,
  latency_ms            INT,
  score_riesgo          FLOAT,
  nivel_riesgo          TEXT,
  workers_usados        JSONB,
  fiscalizador_ok       BOOLEAN DEFAULT TRUE,
  fiscalizador_issues   JSONB DEFAULT '[]',
  estudiante_id         UUID REFERENCES desercion_estudiantes(id) ON DELETE SET NULL,
  usuario_id            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
