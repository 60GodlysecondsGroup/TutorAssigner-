/**
 * Implementación en memoria de `SolicitudesPort`. Imita las reglas de Solicitudes: solo se asigna
 * una solicitud ABIERTA y solo se reabre una ASIGNADA (si no, 409 como haría el módulo real).
 */
import { AppError } from '../../../platform/http';
import type { SolicitudParaMatching, SolicitudesPort } from '../ports';

export type SolicitudesFake = SolicitudesPort & {
  agregar(...solicitudes: SolicitudParaMatching[]): void;
  actualizar(solicitudId: string, cambios: Partial<SolicitudParaMatching>): void;
  estado(solicitudId: string): SolicitudParaMatching['estado'] | undefined;
};

export function createSolicitudesFake(iniciales: SolicitudParaMatching[] = []): SolicitudesFake {
  const solicitudes = new Map(iniciales.map((s) => [s.solicitudId, structuredClone(s)]));

  const cambiarEstado = (id: string, desde: string, hacia: SolicitudParaMatching['estado']) => {
    const s = solicitudes.get(id);
    if (!s) throw AppError.notFound('SOLICITUD_NOT_FOUND', `No existe la solicitud ${id}`);
    if (s.estado !== desde) {
      throw AppError.conflict('SOLICITUD_NO_ABIERTA', `La solicitud está ${s.estado}`);
    }
    s.estado = hacia;
  };

  return {
    agregar(...nuevas) {
      for (const s of nuevas) solicitudes.set(s.solicitudId, structuredClone(s));
    },
    actualizar(solicitudId, cambios) {
      const actual = solicitudes.get(solicitudId);
      if (!actual) throw new Error(`Solicitud fake inexistente: ${solicitudId}`);
      solicitudes.set(solicitudId, { ...actual, ...structuredClone(cambios) });
    },
    estado: (solicitudId) => solicitudes.get(solicitudId)?.estado,

    async obtenerParaMatching(solicitudId) {
      const s = solicitudes.get(solicitudId);
      return s ? structuredClone(s) : null;
    },
    async marcarAsignada(solicitudId) {
      cambiarEstado(solicitudId, 'ABIERTA', 'ASIGNADA');
    },
    async reabrir(solicitudId) {
      cambiarEstado(solicitudId, 'ASIGNADA', 'ABIERTA');
    },
  };
}
