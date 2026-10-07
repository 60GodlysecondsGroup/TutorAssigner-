/**
 * Sobre de respuesta estándar (contrato `common`). Los controladores responden solo con estas
 * funciones: `{ data }`, `{ data, meta }` o 204.
 */
import type { Response } from 'express';
import type { PageMeta, PaginationQuery } from '@tutorias/contracts/common';

export function sendOk<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data });
}

export function sendCreated<T>(res: Response, data: T) {
  sendOk(res, data, 201);
}

export function sendPage<T>(res: Response, data: T[], meta: PageMeta) {
  res.status(200).json({ data, meta });
}

export function sendNoContent(res: Response) {
  res.status(204).end();
}

export function pageMeta({ page, pageSize }: PaginationQuery, total: number): PageMeta {
  return { page, pageSize, total };
}
