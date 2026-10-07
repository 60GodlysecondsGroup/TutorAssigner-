import type {
  CandidatoDescartado,
  FranjaHoraria,
  MotivoDescarte,
  SolicitudMatching,
  TutorCandidato,
} from '@tutorias/contracts/matching';
import { intersecciones, duracionMin } from './franjas';

export type CandidatoElegible = {
  tutor: TutorCandidato;
  bloques: FranjaHoraria[];
  minutosCompartidos: number;
};

/**
 * Paso 1 — filtros duros. Descarta (con todos sus motivos) a quien no comparta un bloque continuo
 * de `duracionSesionMin` (`SIN_HORARIO_COMPATIBLE`) o no tenga cupo (`SIN_CUPO`).
 * Los descartados se devuelven ordenados por `tutorId` (salida determinista).
 */
export function filtrarElegibles(solicitud: SolicitudMatching, candidatos: TutorCandidato[]) {
  const elegibles: CandidatoElegible[] = [];
  const descartados: CandidatoDescartado[] = [];

  for (const tutor of candidatos) {
    const bloques = intersecciones(solicitud.franjas, tutor.franjas);
    const motivos: MotivoDescarte[] = [];
    if (!bloques.some((b) => duracionMin(b) >= solicitud.duracionSesionMin)) {
      motivos.push('SIN_HORARIO_COMPATIBLE');
    }
    if (tutor.asignacionesActivas >= tutor.capacidadMaxima) motivos.push('SIN_CUPO');

    if (motivos.length > 0) {
      descartados.push({ tutorId: tutor.tutorId, motivos });
    } else {
      const minutosCompartidos = bloques.reduce((t, b) => t + duracionMin(b), 0);
      elegibles.push({ tutor, bloques, minutosCompartidos });
    }
  }

  descartados.sort((a, b) => (a.tutorId < b.tutorId ? -1 : a.tutorId > b.tutorId ? 1 : 0));
  return { elegibles, descartados };
}
