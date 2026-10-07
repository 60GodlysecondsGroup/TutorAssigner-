import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ApiErrorBody,
  COMMON_ERROR_STATUS,
  CommonErrorCode,
  Id,
  PaginationQuery,
  okEnvelope,
  pageEnvelope,
} from './index';
import { errorNoAutenticado, errorValidacion, idValido, invalidos, paginaValida } from './fixtures';

const Item = z.object({ id: Id });

describe('contracts/common', () => {
  it('acepta los fixtures válidos', () => {
    expect(pageEnvelope(Item).safeParse(paginaValida).success).toBe(true);
    expect(okEnvelope(Item).safeParse({ data: { id: idValido } }).success).toBe(true);
    expect(ApiErrorBody.safeParse(errorValidacion).success).toBe(true);
    expect(ApiErrorBody.safeParse(errorNoAutenticado).success).toBe(true);
  });

  it('rechaza los fixtures inválidos', () => {
    expect(pageEnvelope(Item).safeParse(invalidos.pagina).success).toBe(false);
    expect(ApiErrorBody.safeParse(invalidos.error).success).toBe(false);
    expect(PaginationQuery.safeParse(invalidos.paginacionQuery).success).toBe(false);
    expect(Id.safeParse('no-es-uuid').success).toBe(false);
  });

  it('aplica defaults de paginación y convierte strings del query', () => {
    expect(PaginationQuery.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(PaginationQuery.parse({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
  });

  it('cada código transversal tiene estado HTTP', () => {
    for (const code of Object.values(CommonErrorCode)) {
      expect(COMMON_ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
});
