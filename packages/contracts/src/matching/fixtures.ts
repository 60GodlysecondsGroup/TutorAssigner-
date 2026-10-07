import type {
  ConfigMatching,
  FranjaHoraria,
  ResultadoMatching,
  SolicitudMatching,
  TutorCandidato,
} from './index';

export const franjaValida: FranjaHoraria = {
  dia: 1,
  inicio: '09:00',
  fin: '10:30',
};

export const franjaInvalida: FranjaHoraria = {
  dia: 1,
  inicio: '10:00',
  fin: '09:00',
};

/** Pesos y parámetros v1 (sección 10 del plan). El seed 03_config usa los mismos valores. */
export const configV1: ConfigMatching = {
  version: 1,
  pesos: { dominio: 0.3, horario: 0.25, prioridad: 0.2, preferencias: 0.15, carga: 0.1 },
  parametros: { topN: 3, bloquesHorarioIdeal: 3 },
};

export const solicitudMatchingValida: SolicitudMatching = {
  solicitudId: '3a1e4c2b-1111-4a5b-8c6d-000000000001',
  materiaId: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338',
  materiaNombre: 'Cálculo I',
  franjas: [
    { dia: 2, inicio: '14:00', fin: '17:00' },
    { dia: 4, inicio: '15:00', fin: '17:00' },
  ],
  duracionSesionMin: 60,
  preferencias: { modalidad: 'VIRTUAL' },
};

export const tutorCandidatoValido: TutorCandidato = {
  tutorId: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd',
  nombre: 'Ana Torres',
  nivelPrioridad: 4,
  nivelDominio: 5,
  modalidad: 'AMBAS',
  franjas: [
    { dia: 2, inicio: '14:00', fin: '16:00' },
    { dia: 4, inicio: '15:00', fin: '18:00' },
  ],
  capacidadMaxima: 3,
  asignacionesActivas: 1,
};

export const resultadoSinCandidatos: ResultadoMatching = {
  resultado: 'SIN_CANDIDATOS',
  alternativas: [],
  ranking: [],
  descartados: [{ tutorId: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd', motivos: ['SIN_CUPO'] }],
  justificacion: 'No hay tutores elegibles: 1 sin cupo.',
  configVersion: 1,
};

export const invalidos = {
  franjaFinAntesInicio: {
    dia: 2,
    inicio: '14:00',
    fin: '13:00',
  },
  franjaHoraInvalida: {
    dia: 3,
    inicio: '25:00',
    fin: '26:00',
  },
  candidatoNivelFueraDeRango: { ...tutorCandidatoValido, nivelDominio: 6 },
  solicitudDuracionCorta: { ...solicitudMatchingValida, duracionSesionMin: 15 },
  configConCriterioExtra: { ...configV1, pesos: { ...configV1.pesos, edad: 0.1 } },
  descartadoSinMotivos: { tutorId: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd', motivos: [] },
};
