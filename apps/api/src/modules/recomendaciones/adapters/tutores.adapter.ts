/**
 * Traduce la API pública de Tutores (Dev 2) a `TutoresPort`. Valida la respuesta con el contrato:
 * un desajuste se detecta en la frontera y se corrige en el contrato, no aquí.
 */
import { z } from 'zod';
import { TutorParaMatching, TutorResumenPublico } from '@tutorias/contracts/tutores';
import type { TutoresPort } from '../ports';

export type TutoresApiPublica = {
  listarCandidatos(materiaId: string): Promise<unknown>;
  obtenerResumenes(ids: string[]): Promise<unknown>;
};

export function createTutoresAdapter(api: TutoresApiPublica): TutoresPort {
  return {
    async listarCandidatos(materiaId) {
      return z.array(TutorParaMatching).parse(await api.listarCandidatos(materiaId));
    },
    async obtenerResumenes(ids) {
      if (ids.length === 0) return [];
      return z.array(TutorResumenPublico).parse(await api.obtenerResumenes(ids));
    },
  };
}
