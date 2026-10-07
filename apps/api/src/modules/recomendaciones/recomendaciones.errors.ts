import type { ErrorDetail } from '@tutorias/contracts/common';
import { RecomendacionesErrorCode as C } from '@tutorias/contracts/recomendaciones';
import { AppError } from '../../platform/http';

export const solicitudNoEncontrada = (id: string) =>
  AppError.notFound(C.SOLICITUD_NOT_FOUND, `No existe la solicitud ${id}`);

export const recomendacionNoEncontrada = (id: string) =>
  AppError.notFound(C.RECOMENDACION_NOT_FOUND, `No existe la recomendación ${id}`);

export const asignacionNoEncontrada = (id: string) =>
  AppError.notFound(C.ASIGNACION_NOT_FOUND, `No existe la asignación ${id}`);

export const configNoEncontrada = () =>
  AppError.notFound(C.CONFIG_NOT_FOUND, 'No hay una configuración de matching vigente');

export const solicitudNoAbierta = (estado: string) =>
  AppError.conflict(C.SOLICITUD_NO_ABIERTA, `La solicitud no está abierta (estado: ${estado})`);

export const solicitudYaAsignada = () =>
  AppError.conflict(C.SOLICITUD_YA_ASIGNADA, 'La solicitud ya tiene una asignación activa');

export const sinCupoTutor = () =>
  AppError.conflict(
    C.SIN_CUPO_TUTOR,
    'El tutor alcanzó su capacidad máxima de asignaciones activas',
  );

export const recomendacionObsoleta = (motivo: string) =>
  AppError.conflict(
    C.RECOMENDACION_OBSOLETA,
    `La recomendación quedó desactualizada (${motivo}). Regenera la recomendación`,
  );

export const transicionInvalida = (desde: string, hacia: string) =>
  AppError.conflict(C.TRANSICION_INVALIDA, `No se puede pasar de ${desde} a ${hacia}`);

export const motivoRequerido = () =>
  AppError.unprocessable(
    C.MOTIVO_REQUERIDO,
    'Elegir un tutor distinto al recomendado requiere un motivo de cambio',
    [{ path: 'motivoCambio', message: 'Obligatorio si el tutor no es el recomendado' }],
  );

export const tutorNoElegible = () =>
  AppError.unprocessable(C.TUTOR_NO_ELEGIBLE, 'El tutor no fue elegible en esta recomendación', [
    { path: 'tutorId', message: 'Debe ser un candidato elegible de la recomendación' },
  ]);

export const pesosInvalidos = (details: ErrorDetail[]) =>
  AppError.unprocessable(C.PESOS_INVALIDOS, 'La configuración de pesos no es válida', details);
