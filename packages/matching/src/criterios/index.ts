/** Registro de criterios v1, en el orden canónico del contrato. */
import { evaluarCarga } from './carga';
import { evaluarDominio } from './dominio';
import { evaluarHorario } from './horario';
import { evaluarPreferencias } from './preferencias';
import { evaluarPrioridad } from './prioridad';
import type { Criterio } from './tipos';

export const CRITERIOS_V1: readonly Criterio[] = [
  { id: 'dominio', etiqueta: 'dominio de la materia', evaluar: evaluarDominio },
  { id: 'horario', etiqueta: 'horario', evaluar: evaluarHorario },
  { id: 'prioridad', etiqueta: 'prioridad', evaluar: evaluarPrioridad },
  { id: 'preferencias', etiqueta: 'preferencias', evaluar: evaluarPreferencias },
  { id: 'carga', etiqueta: 'carga de trabajo', evaluar: evaluarCarga },
];

export { evaluarCarga, evaluarDominio, evaluarHorario, evaluarPreferencias, evaluarPrioridad };
export type { ContextoEvaluacion, Criterio, EvaluadorCriterio, ResultadoCriterio } from './tipos';
