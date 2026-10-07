import { z } from 'zod';
import { Id, IsoDateTime } from '../common/index';
import { FranjaHoraria } from '../matching/index';

export const Nivel = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type Nivel = z.infer<typeof Nivel>;

export const Modalidad = z.enum(['PRESENCIAL', 'VIRTUAL', 'AMBAS']);
export type Modalidad = z.infer<typeof Modalidad>;

export const Materia = z.object({
  id: Id,
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  activa: z.boolean(),
});
export type Materia = z.infer<typeof Materia>;

export const MateriaCrear = z.object({
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  activa: z.boolean().default(true),
});
export type MateriaCrear = z.input<typeof MateriaCrear>;

export const MateriaActualizar = MateriaCrear.partial();
export type MateriaActualizar = z.input<typeof MateriaActualizar>;

export const TutorMateria = z.object({
  materiaId: Id,
  nivelDominio: Nivel,
});
export type TutorMateria = z.infer<typeof TutorMateria>;

export const TutorMateriaDetalle = TutorMateria.extend({
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
});
export type TutorMateriaDetalle = z.infer<typeof TutorMateriaDetalle>;

export const Tutor = z.object({
  id: Id,
  nombre: z.string().trim().min(1),
  email: z.email(),
  programa: z.string().trim().min(1).nullable().optional(),
  nivelPrioridad: Nivel,
  modalidad: Modalidad,
  capacidadMaxima: z.number().int().positive(),
  activo: z.boolean(),
  materias: z.array(TutorMateriaDetalle),
  franjas: z.array(FranjaHoraria),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Tutor = z.infer<typeof Tutor>;

export const TutorResumen = z.object({
  id: Id,
  nombre: z.string().trim().min(1),
  email: z.email(),
  nivelPrioridad: Nivel,
  modalidad: Modalidad,
  capacidadMaxima: z.number().int().positive(),
  activo: z.boolean(),
  materias: z.array(
    z.object({
      materiaId: Id,
      codigo: z.string().trim().min(1),
      nombre: z.string().trim().min(1),
    }),
  ),
});
export type TutorResumen = z.infer<typeof TutorResumen>;

export const TutorCrear = z.object({
  nombre: z.string().trim().min(1),
  email: z.email(),
  programa: z.string().trim().min(1).optional(),
  nivelPrioridad: Nivel,
  modalidad: Modalidad.default('AMBAS'),
  capacidadMaxima: z.number().int().positive().default(3),
  materias: z.array(TutorMateria).default([]),
  franjas: z.array(FranjaHoraria).default([]),
});
export type TutorCrear = z.input<typeof TutorCrear>;

export const TutorActualizar = z.object({
  nombre: z.string().trim().min(1).optional(),
  email: z.email().optional(),
  programa: z.string().trim().min(1).nullable().optional(),
  nivelPrioridad: Nivel.optional(),
  modalidad: Modalidad.optional(),
  capacidadMaxima: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});
export type TutorActualizar = z.input<typeof TutorActualizar>;

export const TutorMateriasReemplazar = z.array(TutorMateria);
export type TutorMateriasReemplazar = z.input<typeof TutorMateriasReemplazar>;

export const TutorFranjasReemplazar = z.array(FranjaHoraria);
export type TutorFranjasReemplazar = z.input<typeof TutorFranjasReemplazar>;

export const TutorParaMatching = z.object({
  tutorId: Id,
  nombre: z.string().trim().min(1),
  nivelPrioridad: Nivel,
  nivelDominio: Nivel,
  modalidad: Modalidad,
  franjas: z.array(FranjaHoraria),
  capacidadMaxima: z.number().int().positive(),
});
export type TutorParaMatching = z.infer<typeof TutorParaMatching>;

export const TutorResumenPublico = z.object({
  tutorId: Id,
  nombre: z.string().trim().min(1),
  email: z.email(),
  nivelPrioridad: Nivel,
  modalidad: Modalidad,
  activo: z.boolean(),
});
export type TutorResumenPublico = z.infer<typeof TutorResumenPublico>;

export const TutorErrorCode = {
  TUTORES_NOT_FOUND: 'TUTORES_NOT_FOUND',
  MATERIAS_NOT_FOUND: 'MATERIAS_NOT_FOUND',
  TUTOR_EMAIL_DUPLICADO: 'TUTOR_EMAIL_DUPLICADO',
  MATERIA_DUPLICADA_CODIGO: 'MATERIA_DUPLICADA_CODIGO',
  MATERIA_DUPLICADA_NOMBRE: 'MATERIA_DUPLICADA_NOMBRE',
  MATERIA_INACTIVA: 'MATERIA_INACTIVA',
  MATERIA_NO_ENCONTRADA: 'MATERIA_NO_ENCONTRADA',
  MATERIA_DUPLICADA: 'MATERIA_DUPLICADA',
  FRANJAS_SOLAPADAS: 'FRANJAS_SOLAPADAS',
  FRANJA_INVALIDA: 'FRANJA_INVALIDA',
} as const;
export type TutorErrorCode = (typeof TutorErrorCode)[keyof typeof TutorErrorCode];
