/**
 * En un módulo real estos esquemas viven en `packages/contracts/src/<modulo>/index.ts`
 * (con sus fixtures) para que web y API compartan la misma fuente. La plantilla los deja aquí
 * porque no es un módulo del producto.
 */
import { z } from 'zod';
import { Id, IsoDateTime, PaginationQuery } from '@tutorias/contracts/common';

export const Ejemplo = z.object({
  id: Id,
  nombre: z.string().min(1).max(120),
  activo: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Ejemplo = z.infer<typeof Ejemplo>;

export const CrearEjemploRequest = z.object({
  nombre: z.string().trim().min(1).max(120),
});
export type CrearEjemploRequest = z.infer<typeof CrearEjemploRequest>;

export const EditarEjemploRequest = z
  .object({
    nombre: z.string().trim().min(1).max(120).optional(),
    activo: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { error: 'Debe enviar al menos un campo' });
export type EditarEjemploRequest = z.infer<typeof EditarEjemploRequest>;

export const ListarEjemplosQuery = PaginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  activo: z.stringbool().optional(),
});
export type ListarEjemplosQuery = z.infer<typeof ListarEjemplosQuery>;
