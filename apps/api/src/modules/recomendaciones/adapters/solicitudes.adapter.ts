/**
 * Traduce la API pública de Solicitudes (Dev 3) a `SolicitudesPort`. Un 404 del proveedor se
 * normaliza a `null`; la respuesta se valida contra la forma que espera el puerto.
 */
import { AppError } from '../../../platform/http';
import type { Trx } from '../../../platform/db';
import { SolicitudParaMatching, type SolicitudesPort } from '../ports';

export type SolicitudesApiPublica = {
  obtenerParaMatching(solicitudId: string): Promise<unknown>;
  marcarAsignada(solicitudId: string, trx: Trx): Promise<unknown>;
  reabrir?(solicitudId: string, trx: Trx): Promise<unknown>;
};

export function createSolicitudesAdapter(api: SolicitudesApiPublica): SolicitudesPort {
  return {
    async obtenerParaMatching(solicitudId) {
      try {
        const solicitud = await api.obtenerParaMatching(solicitudId);
        return solicitud == null ? null : SolicitudParaMatching.parse(solicitud);
      } catch (err) {
        if (err instanceof AppError && err.status === 404) return null;
        throw err;
      }
    },
    async marcarAsignada(solicitudId, trx) {
      await api.marcarAsignada(solicitudId, trx);
    },
    async reabrir(solicitudId, trx) {
      if (!api.reabrir) {
        throw AppError.notImplemented('Solicitudes aún no expone reabrir(id, trx)');
      }
      await api.reabrir(solicitudId, trx);
    },
  };
}
