/** Implementación en memoria de `TutoresPort` para tests y trabajo previo a H3. */
import type { Modalidad, Nivel, TutorParaMatching } from '@tutorias/contracts/tutores';
import type { FranjaHoraria } from '@tutorias/contracts/matching';
import type { TutoresPort } from '../ports';

export type TutorFake = {
  tutorId: string;
  nombre: string;
  email: string;
  nivelPrioridad: Nivel;
  modalidad: Modalidad;
  capacidadMaxima: number;
  activo: boolean;
  /** materiaId → nivel de dominio. */
  materias: Record<string, Nivel>;
  franjas: FranjaHoraria[];
};

export type TutoresFake = TutoresPort & {
  agregar(...tutores: TutorFake[]): void;
  actualizar(tutorId: string, cambios: Partial<TutorFake>): void;
};

export function createTutoresFake(iniciales: TutorFake[] = []): TutoresFake {
  const tutores = new Map(iniciales.map((t) => [t.tutorId, structuredClone(t)]));

  return {
    agregar(...nuevos) {
      for (const t of nuevos) tutores.set(t.tutorId, structuredClone(t));
    },
    actualizar(tutorId, cambios) {
      const actual = tutores.get(tutorId);
      if (!actual) throw new Error(`Tutor fake inexistente: ${tutorId}`);
      tutores.set(tutorId, { ...actual, ...structuredClone(cambios) });
    },

    async listarCandidatos(materiaId) {
      return [...tutores.values()]
        .filter((t) => t.activo && t.materias[materiaId] !== undefined)
        .sort((a, b) => (a.tutorId < b.tutorId ? -1 : 1))
        .map((t): TutorParaMatching => ({
          tutorId: t.tutorId,
          nombre: t.nombre,
          nivelPrioridad: t.nivelPrioridad,
          nivelDominio: t.materias[materiaId]!,
          modalidad: t.modalidad,
          franjas: structuredClone(t.franjas),
          capacidadMaxima: t.capacidadMaxima,
        }));
    },

    async obtenerResumenes(ids) {
      return ids.flatMap((id) => {
        const t = tutores.get(id);
        return t
          ? [
              {
                tutorId: t.tutorId,
                nombre: t.nombre,
                email: t.email,
                nivelPrioridad: t.nivelPrioridad,
                modalidad: t.modalidad,
                activo: t.activo,
              },
            ]
          : [];
      });
    },
  };
}
