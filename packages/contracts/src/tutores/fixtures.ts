import type { ApiErrorBody } from '../common/index';
import type {
  Materia,
  MateriaCrear,
  Tutor,
  TutorCrear,
  TutorParaMatching,
  TutorResumenPublico,
} from './index';

export const materiaValida: MateriaCrear = {
  codigo: 'MAT101',
  nombre: 'Cálculo I',
  activa: true,
};

export const materiaPersistida: Materia = {
  id: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338',
  codigo: 'MAT101',
  nombre: 'Cálculo I',
  activa: true,
};

export const tutorValido: TutorCrear = {
  nombre: 'Ana Torres',
  email: 'ana@tutorias.test',
  programa: 'Ingeniería de Sistemas',
  nivelPrioridad: 4,
  modalidad: 'AMBAS',
  capacidadMaxima: 3,
  materias: [{ materiaId: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338', nivelDominio: 5 }],
  franjas: [
    { dia: 1, inicio: '09:00', fin: '11:00' },
    { dia: 3, inicio: '15:00', fin: '17:00' },
  ],
};

export const tutorPersistido: Tutor = {
  id: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd',
  nombre: 'Ana Torres',
  email: 'ana@tutorias.test',
  programa: 'Ingeniería de Sistemas',
  nivelPrioridad: 4,
  modalidad: 'AMBAS',
  capacidadMaxima: 3,
  activo: true,
  materias: [
    {
      materiaId: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338',
      nivelDominio: 5,
      codigo: 'MAT101',
      nombre: 'Cálculo I',
    },
  ],
  franjas: [
    { dia: 1, inicio: '09:00', fin: '11:00' },
    { dia: 3, inicio: '15:00', fin: '17:00' },
  ],
  createdAt: '2026-10-07T12:00:00.000Z',
  updatedAt: '2026-10-07T12:00:00.000Z',
};

export const tutorParaMatchingValido: TutorParaMatching = {
  tutorId: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd',
  nombre: 'Ana Torres',
  nivelPrioridad: 4,
  nivelDominio: 5,
  modalidad: 'AMBAS',
  franjas: [
    { dia: 1, inicio: '09:00', fin: '11:00' },
    { dia: 3, inicio: '15:00', fin: '17:00' },
  ],
  capacidadMaxima: 3,
};

export const resumenPublicoValido: TutorResumenPublico = {
  tutorId: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd',
  nombre: 'Ana Torres',
  email: 'ana@tutorias.test',
  nivelPrioridad: 4,
  modalidad: 'AMBAS',
  activo: true,
};

export const errorMateriaDuplicada: ApiErrorBody = {
  error: {
    code: 'MATERIA_DUPLICADA_NOMBRE',
    message: 'Ya existe una materia con ese nombre',
    requestId: 'b7d2c1a0-0000-4000-8000-000000000010',
  },
};

export const invalidos = {
  materiaCodigoVacio: { codigo: '', nombre: 'Cálculo I', activa: true },
  materiaNombreVacio: { codigo: 'MAT101', nombre: '', activa: true },
  tutorEmailInvalido: { ...tutorValido, email: 'correo-no-valido' },
  tutorPrioridadFueraDeRango: { ...tutorValido, nivelPrioridad: 6 },
  tutorCapacidadNoPositiva: { ...tutorValido, capacidadMaxima: 0 },
  franjaFinAntesInicio: { dia: 1, inicio: '10:00', fin: '09:00' },
};
