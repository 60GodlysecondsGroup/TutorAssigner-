import type {
  ConfigMatching,
  SolicitudMatching,
  TutorCandidato,
} from '@tutorias/contracts/matching';
import { configV1 } from '@tutorias/contracts/matching/fixtures';

/** UUID determinista para tests: uid(1) → 00000000-0000-4000-8000-000000000001 */
export const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const config = (over: Partial<ConfigMatching> = {}): ConfigMatching => ({
  ...configV1,
  ...over,
  pesos: { ...configV1.pesos, ...over.pesos },
  parametros: { ...configV1.parametros, ...over.parametros },
});

export const solicitud = (over: Partial<SolicitudMatching> = {}): SolicitudMatching => ({
  solicitudId: uid(900),
  materiaId: uid(800),
  materiaNombre: 'Cálculo I',
  franjas: [
    { dia: 2, inicio: '14:00', fin: '17:00' },
    { dia: 4, inicio: '15:00', fin: '17:00' },
  ],
  duracionSesionMin: 60,
  preferencias: {},
  ...over,
});

export const tutor = (n: number, over: Partial<TutorCandidato> = {}): TutorCandidato => ({
  tutorId: uid(n),
  nombre: `Tutor ${n}`,
  nivelPrioridad: 3,
  nivelDominio: 3,
  modalidad: 'AMBAS',
  franjas: [{ dia: 2, inicio: '14:00', fin: '16:00' }],
  capacidadMaxima: 3,
  asignacionesActivas: 0,
  ...over,
});
