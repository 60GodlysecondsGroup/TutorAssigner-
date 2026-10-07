/**
 * Utilidades de franjas: única implementación de validación, solapes y minutos compartidos.
 * Las usan el motor, Tutores (Dev 2) y Solicitudes (Dev 3): `@tutorias/matching/franjas`.
 */
export { aMinutos, duracionMin, validarFranja } from './validar';
export { detectarSolapes, haySolape } from './solapes';
export {
  bloquesContinuos,
  intersecciones,
  minutosCompartidos,
  tieneBloqueSuficiente,
} from './compartidos';
export { formatearDuracion, formatearFranja } from './formato';
