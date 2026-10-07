import { AppError } from '../../platform/http';

/** Códigos del módulo: `<MODULO>_<MOTIVO>`. Se documentan en el SPEC.md y en el contrato. */
export const PlantillaErrorCode = {
  EJEMPLO_NOT_FOUND: 'EJEMPLO_NOT_FOUND',
  EJEMPLO_DUPLICADO: 'EJEMPLO_DUPLICADO',
  EJEMPLO_INACTIVO: 'EJEMPLO_INACTIVO',
} as const;

export const ejemploNoEncontrado = (id: string) =>
  AppError.notFound(PlantillaErrorCode.EJEMPLO_NOT_FOUND, `No existe el ejemplo ${id}`);

export const ejemploDuplicado = () =>
  AppError.conflict(PlantillaErrorCode.EJEMPLO_DUPLICADO, 'Ya existe un ejemplo con ese nombre');

export const ejemploInactivo = () =>
  AppError.unprocessable(PlantillaErrorCode.EJEMPLO_INACTIVO, 'El ejemplo está inactivo', [
    { path: 'activo', message: 'Debe estar activo para renombrarse' },
  ]);
