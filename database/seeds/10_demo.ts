import type { Knex } from 'knex';

/**
 * Seed de DEMO (Dev 4; revisan Dev 2 y Dev 3). Solo corre con SEED_DEMO=true.
 * Datos ficticios pensados para lucir el algoritmo en Cálculo I (MAT101):
 *
 *   S1 · Laura (mar 14–17, jue 15–17, 60 min, prefiere virtual)
 *        Ana gana con claridad; Beto e Iván son alternativas; Carla sin horario compatible;
 *        Diego sin cupo (su única plaza está ocupada por S4).
 *   S2 · Mateo (mié 10–12): Eva y Fabio empatan en score y decide el desempate determinista.
 *   S3 · Sofía (sáb 09–11): nadie comparte horario → SIN_CANDIDATOS.
 *   Casos borde de Tutores: Gina inactiva, Hugo sin materias, Iván con franjas que se tocan.
 *
 * Escribe en tablas de Tutores y Solicitudes siguiendo el esquema de la sección 7 del plan. Hasta que
 * esos módulos tengan sus migraciones (H3), el seed avisa y no hace nada. Idempotente: si los datos
 * demo ya existen, no vuelve a insertarlos.
 */

const TABLAS = [
  'materias',
  'tutores',
  'tutor_materias',
  'tutor_franjas',
  'estudiantes',
  'solicitudes',
  'solicitud_franjas',
  'asignaciones',
];

const id = (n: number) => `d3000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Franja = [dia: number, inicio: string, fin: string];

const MATERIAS = [
  { codigo: 'MAT101', nombre: 'Cálculo I' },
  { codigo: 'PRG101', nombre: 'Programación I' },
];

const TUTORES: {
  id: string;
  nombre: string;
  prioridad: number;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'AMBAS';
  capacidad: number;
  activo?: boolean;
  materias: [codigo: string, dominio: number][];
  franjas: Franja[];
}[] = [
  {
    id: id(1),
    nombre: 'Ana Torres',
    prioridad: 4,
    modalidad: 'AMBAS',
    capacidad: 3,
    materias: [['MAT101', 5]],
    franjas: [
      [2, '14:00', '16:00'],
      [4, '15:00', '18:00'],
    ],
  },
  {
    id: id(2),
    nombre: 'Beto Ruiz',
    prioridad: 5,
    modalidad: 'VIRTUAL',
    capacidad: 2,
    materias: [['MAT101', 4]],
    franjas: [[2, '16:00', '17:00']],
  },
  {
    id: id(3),
    nombre: 'Carla Gómez',
    prioridad: 3,
    modalidad: 'PRESENCIAL',
    capacidad: 3,
    materias: [['MAT101', 5]],
    franjas: [[1, '08:00', '10:00']],
  },
  {
    id: id(4),
    nombre: 'Diego Pardo',
    prioridad: 5,
    modalidad: 'AMBAS',
    capacidad: 1,
    materias: [
      ['MAT101', 4],
      ['PRG101', 5],
    ],
    franjas: [
      [2, '14:00', '17:00'],
      [5, '09:00', '11:00'],
    ],
  },
  {
    id: id(5),
    nombre: 'Eva Lara',
    prioridad: 3,
    modalidad: 'AMBAS',
    capacidad: 3,
    materias: [['MAT101', 3]],
    franjas: [[3, '10:00', '12:00']],
  },
  {
    id: id(6),
    nombre: 'Fabio Ríos',
    prioridad: 3,
    modalidad: 'AMBAS',
    capacidad: 3,
    materias: [['MAT101', 3]],
    franjas: [[3, '10:00', '12:00']],
  },
  {
    id: id(7),
    nombre: 'Gina Soto',
    prioridad: 5,
    modalidad: 'AMBAS',
    capacidad: 3,
    activo: false,
    materias: [['MAT101', 5]],
    franjas: [[2, '14:00', '17:00']],
  },
  {
    id: id(8),
    nombre: 'Hugo Vega',
    prioridad: 2,
    modalidad: 'AMBAS',
    capacidad: 2,
    materias: [],
    franjas: [[2, '14:00', '17:00']],
  },
  {
    id: id(9),
    nombre: 'Iván Mora',
    prioridad: 4,
    modalidad: 'PRESENCIAL',
    capacidad: 2,
    materias: [['MAT101', 4]],
    franjas: [
      [2, '14:00', '15:00'],
      [2, '15:00', '16:00'],
    ],
  },
];

const ESTUDIANTES = [
  {
    id: id(101),
    nombre: 'Laura Méndez',
    codigo: 'EST-001',
    programa: 'Ingeniería Civil',
    semestre: 2,
  },
  { id: id(102), nombre: 'Mateo Castro', codigo: 'EST-002', programa: 'Economía', semestre: 1 },
  {
    id: id(103),
    nombre: 'Sofía Rincón',
    codigo: 'EST-003',
    programa: 'Ingeniería de Sistemas',
    semestre: 3,
  },
];

const SOLICITUDES: {
  id: string;
  estudiante: string;
  materia: string;
  tema: string;
  preferencias: Record<string, string>;
  estado: 'ABIERTA' | 'ASIGNADA';
  franjas: Franja[];
}[] = [
  {
    id: id(201),
    estudiante: id(101),
    materia: 'MAT101',
    tema: 'Límites y derivadas',
    preferencias: { modalidad: 'VIRTUAL' },
    estado: 'ABIERTA',
    franjas: [
      [2, '14:00', '17:00'],
      [4, '15:00', '17:00'],
    ],
  },
  {
    id: id(202),
    estudiante: id(102),
    materia: 'MAT101',
    tema: 'Regla de la cadena',
    preferencias: {},
    estado: 'ABIERTA',
    franjas: [[3, '10:00', '12:00']],
  },
  {
    id: id(203),
    estudiante: id(103),
    materia: 'MAT101',
    tema: 'Integrales',
    preferencias: {},
    estado: 'ABIERTA',
    franjas: [[6, '09:00', '11:00']],
  },
  {
    id: id(204),
    estudiante: id(103),
    materia: 'PRG101',
    tema: 'Recursión',
    preferencias: {},
    estado: 'ASIGNADA',
    franjas: [[5, '09:00', '11:00']],
  },
];

const email = (nombre: string, dominio: string) =>
  `${nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(' ', '.')}@${dominio}`;

const franjas = (fk: string, owner: string, lista: Franja[]) =>
  lista.map(([dia, hora_inicio, hora_fin]) => ({ [fk]: owner, dia, hora_inicio, hora_fin }));

export async function seed(knex: Knex): Promise<void> {
  const faltantes: string[] = [];
  for (const tabla of TABLAS) if (!(await knex.schema.hasTable(tabla))) faltantes.push(tabla);
  if (faltantes.length > 0) {
    console.warn(
      `[seed 10_demo] se omite: faltan tablas de otros módulos (${faltantes.join(', ')}). Se activa en H3.`,
    );
    return;
  }
  if (
    await knex('tutores')
      .where({ id: id(1) })
      .first('id')
  )
    return;

  await knex.transaction(async (trx) => {
    await trx('materias')
      .insert(MATERIAS.map((m) => ({ ...m, activa: true })))
      .onConflict('codigo')
      .ignore();
    const filas: { id: string; codigo: string }[] = await trx('materias')
      .whereIn(
        'codigo',
        MATERIAS.map((m) => m.codigo),
      )
      .select('id', 'codigo');
    const materia = Object.fromEntries(filas.map((m) => [m.codigo, m.id])) as Record<
      string,
      string
    >;

    await trx('tutores').insert(
      TUTORES.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        email: email(t.nombre, 'demo.tutorias.test'),
        programa: 'Monitoría académica',
        nivel_prioridad: t.prioridad,
        modalidad: t.modalidad,
        capacidad_maxima: t.capacidad,
        activo: t.activo ?? true,
      })),
    );
    const tutorMaterias = TUTORES.flatMap((t) =>
      t.materias.map(([codigo, nivel]) => ({
        tutor_id: t.id,
        materia_id: materia[codigo],
        nivel_dominio: nivel,
      })),
    );
    await trx('tutor_materias').insert(tutorMaterias);
    await trx('tutor_franjas').insert(TUTORES.flatMap((t) => franjas('tutor_id', t.id, t.franjas)));

    await trx('estudiantes').insert(
      ESTUDIANTES.map((e) => ({ ...e, email: email(e.nombre, 'demo.estudiantes.test') })),
    );
    await trx('solicitudes').insert(
      SOLICITUDES.map((s) => ({
        id: s.id,
        estudiante_id: s.estudiante,
        materia_id: materia[s.materia],
        tema: s.tema,
        duracion_sesion_min: 60,
        preferencias: JSON.stringify(s.preferencias),
        estado: s.estado,
      })),
    );
    await trx('solicitud_franjas').insert(
      SOLICITUDES.flatMap((s) => franjas('solicitud_id', s.id, s.franjas)),
    );

    // Diego ocupa su única plaza con S4: aparece como SIN_CUPO al recomendar S1.
    await trx('asignaciones').insert({
      id: id(301),
      solicitud_id: id(204),
      tutor_id: id(4),
      estado: 'ACTIVA',
    });
  });
  console.info('[seed 10_demo] datos de demo creados (9 tutores, 3 estudiantes, 4 solicitudes)');
}
