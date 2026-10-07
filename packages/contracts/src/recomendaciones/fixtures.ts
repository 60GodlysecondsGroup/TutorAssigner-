import type { ApiErrorBody } from '../common/index';
import { configV1 } from '../matching/fixtures';
import type {
  ActualizarConfigRequest,
  Asignacion,
  ConfiguracionMatching,
  ConfirmarAsignacionRequest,
  Recomendacion,
} from './index';

const SOLICITUD = '3a1e4c2b-1111-4a5b-8c6d-000000000001';
const ANA = '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd';
const BETO = '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbde';
const CARLA = '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdf';
const CONFIG = '5c0f1a2b-0000-4000-8000-000000000001';
const RECOMENDACION = '9d8e7f6a-0000-4000-8000-000000000001';
const USUARIO = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

export const recomendacionValida: Recomendacion = {
  id: RECOMENDACION,
  solicitudId: SOLICITUD,
  configId: CONFIG,
  configVersion: 1,
  resultado: 'RECOMENDADO',
  tutorRecomendadoId: ANA,
  score: 92.7,
  justificacion:
    'Ana Torres (92,7/100): domina Cálculo I (5/5), comparte 4 h con tu disponibilidad y tiene ' +
    'prioridad 4/5. Supera a la segunda opción por 15,4 puntos, sobre todo en horario.',
  candidatos: [
    {
      tutorId: ANA,
      nombre: 'Ana Torres',
      posicion: 1,
      score: 92.7,
      desglose: [
        {
          criterio: 'dominio',
          valor: 1,
          peso: 0.3,
          aporte: 30,
          evidencia: 'domina Cálculo I (5/5)',
        },
        {
          criterio: 'horario',
          valor: 1,
          peso: 0.25,
          aporte: 25,
          evidencia: 'comparte 4 h: mar 14:00–16:00, jue 15:00–17:00',
        },
        {
          criterio: 'prioridad',
          valor: 0.8,
          peso: 0.2,
          aporte: 16,
          evidencia: 'prioridad 4/5 por experiencia',
        },
        {
          criterio: 'preferencias',
          valor: 1,
          peso: 0.15,
          aporte: 15,
          evidencia: 'atiende virtual, como pediste',
        },
        {
          criterio: 'carga',
          valor: 0.6667,
          peso: 0.1,
          aporte: 6.67,
          evidencia: 'tiene cupo (1 de 3 asignaciones activas)',
        },
      ],
    },
    {
      tutorId: BETO,
      nombre: 'Beto Ruiz',
      posicion: 2,
      score: 77.3,
      desglose: [
        {
          criterio: 'dominio',
          valor: 0.8,
          peso: 0.3,
          aporte: 24,
          evidencia: 'domina Cálculo I (4/5)',
        },
        {
          criterio: 'horario',
          valor: 0.3333,
          peso: 0.25,
          aporte: 8.33,
          evidencia: 'comparte 1 h: mar 16:00–17:00',
        },
        {
          criterio: 'prioridad',
          valor: 1,
          peso: 0.2,
          aporte: 20,
          evidencia: 'prioridad 5/5 por experiencia',
        },
        {
          criterio: 'preferencias',
          valor: 1,
          peso: 0.15,
          aporte: 15,
          evidencia: 'atiende virtual, como pediste',
        },
        {
          criterio: 'carga',
          valor: 1,
          peso: 0.1,
          aporte: 10,
          evidencia: 'tiene cupo (0 de 2 asignaciones activas)',
        },
      ],
    },
  ],
  descartados: [{ tutorId: CARLA, nombre: 'Carla Gómez', motivos: ['SIN_HORARIO_COMPATIBLE'] }],
  createdAt: '2026-10-07T15:00:00.000Z',
};

export const recomendacionSinCandidatos: Recomendacion = {
  id: '9d8e7f6a-0000-4000-8000-000000000002',
  solicitudId: SOLICITUD,
  configId: CONFIG,
  configVersion: 1,
  resultado: 'SIN_CANDIDATOS',
  justificacion: 'No hay tutores elegibles: 1 sin horario compatible.',
  candidatos: [],
  descartados: [{ tutorId: CARLA, nombre: 'Carla Gómez', motivos: ['SIN_HORARIO_COMPATIBLE'] }],
  createdAt: '2026-10-07T14:00:00.000Z',
};

export const confirmarRecomendado: ConfirmarAsignacionRequest = {
  recomendacionId: RECOMENDACION,
  tutorId: ANA,
};

export const confirmarAlternativa: ConfirmarAsignacionRequest = {
  recomendacionId: RECOMENDACION,
  tutorId: BETO,
  motivoCambio: 'El estudiante ya trabajó antes con Beto',
};

export const asignacionValida: Asignacion = {
  id: '1a2b3c4d-0000-4000-8000-000000000001',
  solicitudId: SOLICITUD,
  tutorId: ANA,
  tutorNombre: 'Ana Torres',
  estudianteNombre: 'Laura Méndez',
  materiaNombre: 'Cálculo I',
  recomendacionId: RECOMENDACION,
  score: 92.7,
  estado: 'ACTIVA',
  creadaPor: USUARIO,
  createdAt: '2026-10-07T15:05:00.000Z',
  updatedAt: '2026-10-07T15:05:00.000Z',
};

export const configuracionVigente: ConfiguracionMatching = {
  id: CONFIG,
  version: 1,
  pesos: configV1.pesos,
  parametros: configV1.parametros,
  vigente: true,
  createdAt: '2026-10-07T12:00:00.000Z',
};

export const actualizarConfigValida: ActualizarConfigRequest = {
  pesos: { dominio: 0.35, horario: 0.25, prioridad: 0.15, preferencias: 0.15, carga: 0.1 },
  parametros: { topN: 3, bloquesHorarioIdeal: 2 },
};

export const errorRecomendacionObsoleta: ApiErrorBody = {
  error: {
    code: 'RECOMENDACION_OBSOLETA',
    message: 'La recomendación quedó desactualizada. Regenera la recomendación',
    requestId: 'b7d2c1a0-0000-4000-8000-000000000020',
  },
};

/** Fixtures inválidos: cada uno debe ser rechazado por su esquema. */
export const invalidos = {
  generarSinSolicitud: {},
  confirmarTutorNoUuid: { recomendacionId: RECOMENDACION, tutorId: 'ana' },
  cambiarEstadoActiva: { estado: 'ACTIVA' },
  listarEstadoDesconocido: { estado: 'PAUSADA' },
  configPesoFaltante: { pesos: { dominio: 1 }, parametros: { topN: 3, bloquesHorarioIdeal: 3 } },
  recomendacionScoreFueraDeRango: { ...recomendacionValida, score: 120 },
};
