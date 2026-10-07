/**
 * Datos de ejemplo para los fakes (mismo escenario que el caso resuelto a mano del motor y que el
 * seed 10_demo): Ana gana a Beto, Carla no comparte horario y Diego no tiene cupo.
 */
import type { SolicitudParaMatching } from '../ports';
import type { TutorFake } from './tutores.fake';

export const MATERIA_CALCULO = 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338';

const id = (n: number) => `f4000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const IDS = {
  ana: id(1),
  beto: id(2),
  carla: id(3),
  diego: id(4),
  solicitudLaura: id(101),
  solicitudMateo: id(102),
  estudianteLaura: id(201),
  estudianteMateo: id(202),
};

export const tutoresDemo = (): TutorFake[] => [
  {
    tutorId: IDS.ana,
    nombre: 'Ana Torres',
    email: 'ana@tutorias.test',
    nivelPrioridad: 4,
    modalidad: 'AMBAS',
    capacidadMaxima: 3,
    activo: true,
    materias: { [MATERIA_CALCULO]: 5 },
    franjas: [
      { dia: 2, inicio: '14:00', fin: '16:00' },
      { dia: 4, inicio: '15:00', fin: '18:00' },
    ],
  },
  {
    tutorId: IDS.beto,
    nombre: 'Beto Ruiz',
    email: 'beto@tutorias.test',
    nivelPrioridad: 5,
    modalidad: 'VIRTUAL',
    capacidadMaxima: 2,
    activo: true,
    materias: { [MATERIA_CALCULO]: 4 },
    franjas: [{ dia: 2, inicio: '16:00', fin: '17:00' }],
  },
  {
    tutorId: IDS.carla,
    nombre: 'Carla Gómez',
    email: 'carla@tutorias.test',
    nivelPrioridad: 3,
    modalidad: 'PRESENCIAL',
    capacidadMaxima: 3,
    activo: true,
    materias: { [MATERIA_CALCULO]: 5 },
    franjas: [{ dia: 1, inicio: '08:00', fin: '10:00' }],
  },
  {
    tutorId: IDS.diego,
    nombre: 'Diego Pardo',
    email: 'diego@tutorias.test',
    nivelPrioridad: 5,
    modalidad: 'AMBAS',
    capacidadMaxima: 1,
    activo: true,
    materias: { [MATERIA_CALCULO]: 4 },
    franjas: [{ dia: 2, inicio: '14:00', fin: '17:00' }],
  },
];

export const solicitudesDemo = (): SolicitudParaMatching[] => [
  {
    solicitudId: IDS.solicitudLaura,
    estado: 'ABIERTA',
    estudianteId: IDS.estudianteLaura,
    estudianteNombre: 'Laura Méndez',
    materiaId: MATERIA_CALCULO,
    materiaNombre: 'Cálculo I',
    duracionSesionMin: 60,
    franjas: [
      { dia: 2, inicio: '14:00', fin: '17:00' },
      { dia: 4, inicio: '15:00', fin: '17:00' },
    ],
    preferencias: { modalidad: 'VIRTUAL' },
  },
  {
    solicitudId: IDS.solicitudMateo,
    estado: 'ABIERTA',
    estudianteId: IDS.estudianteMateo,
    estudianteNombre: 'Mateo Castro',
    materiaId: MATERIA_CALCULO,
    materiaNombre: 'Cálculo I',
    duracionSesionMin: 60,
    franjas: [{ dia: 2, inicio: '14:00', fin: '16:00' }],
    preferencias: {},
  },
];
