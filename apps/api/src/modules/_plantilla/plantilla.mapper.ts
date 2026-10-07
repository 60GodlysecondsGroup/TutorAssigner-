import type { Ejemplo } from './plantilla.schemas';

/** Fila de BD (snake_case) ↔ DTO del contrato (camelCase, fechas ISO). */
export type EjemploRow = {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
};

export const toEjemplo = (row: EjemploRow): Ejemplo => ({
  id: row.id,
  nombre: row.nombre,
  activo: row.activo,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});
