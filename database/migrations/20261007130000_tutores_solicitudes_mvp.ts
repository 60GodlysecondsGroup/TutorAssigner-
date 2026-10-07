import type { Knex } from 'knex';

// MVP de demo: tablas de Tutores/Materias (Dev 2) y Estudiantes/Solicitudes (Dev 3) según el
// esquema de la sección 7 del plan. Sus dueños pueden reemplazarla por sus migraciones definitivas.

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE materias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo text NOT NULL UNIQUE,
      nombre text NOT NULL,
      activa boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX ux_materias_nombre ON materias (lower(nombre));

    CREATE TABLE tutores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      email text NOT NULL,
      programa text,
      nivel_prioridad smallint NOT NULL CHECK (nivel_prioridad BETWEEN 1 AND 5),
      modalidad text NOT NULL DEFAULT 'AMBAS' CHECK (modalidad IN ('PRESENCIAL','VIRTUAL','AMBAS')),
      capacidad_maxima smallint NOT NULL DEFAULT 3 CHECK (capacidad_maxima > 0),
      activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX ux_tutores_email ON tutores (lower(email));

    CREATE TABLE tutor_materias (
      tutor_id uuid NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
      materia_id uuid NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
      nivel_dominio smallint NOT NULL DEFAULT 3 CHECK (nivel_dominio BETWEEN 1 AND 5),
      PRIMARY KEY (tutor_id, materia_id)
    );
    CREATE INDEX ix_tutor_materias_materia ON tutor_materias (materia_id);

    CREATE TABLE tutor_franjas (
      tutor_id uuid NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
      dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 7),
      hora_inicio time NOT NULL,
      hora_fin time NOT NULL,
      CHECK (hora_fin > hora_inicio),
      UNIQUE (tutor_id, dia, hora_inicio)
    );

    CREATE TABLE estudiantes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      email text NOT NULL,
      codigo text,
      programa text,
      semestre smallint CHECK (semestre BETWEEN 1 AND 12),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX ux_estudiantes_email ON estudiantes (lower(email));

    CREATE TABLE solicitudes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      estudiante_id uuid NOT NULL REFERENCES estudiantes(id) ON DELETE RESTRICT,
      materia_id uuid NOT NULL REFERENCES materias(id) ON DELETE RESTRICT,
      tema text,
      duracion_sesion_min smallint NOT NULL DEFAULT 60 CHECK (duracion_sesion_min BETWEEN 30 AND 240),
      preferencias jsonb NOT NULL DEFAULT '{}',
      estado text NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','ASIGNADA','CANCELADA')),
      creada_por uuid REFERENCES usuarios(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ix_solicitudes_estado_fecha ON solicitudes (estado, created_at DESC);
    CREATE INDEX ix_solicitudes_estudiante ON solicitudes (estudiante_id);

    CREATE TABLE solicitud_franjas (
      solicitud_id uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
      dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 7),
      hora_inicio time NOT NULL,
      hora_fin time NOT NULL,
      CHECK (hora_fin > hora_inicio),
      UNIQUE (solicitud_id, dia, hora_inicio)
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE solicitud_franjas;
    DROP TABLE solicitudes;
    DROP TABLE estudiantes;
    DROP TABLE tutor_franjas;
    DROP TABLE tutor_materias;
    DROP TABLE tutores;
    DROP TABLE materias;
  `);
}
