/**
 * Paso 4 — justificación por plantilla (sin IA, determinista, ≤ 280 caracteres).
 * Con recomendado: nombre y score, las 2–3 frases de mayor aporte (la primera es la del criterio
 * que más aporta) y, si hay segundo, la diferencia y el criterio que más la explica.
 */
import {
  JUSTIFICACION_MAX,
  type CandidatoDescartado,
  type CriterioEvaluado,
  type CriterioId,
} from '@tutorias/contracts/matching';
import { CRITERIOS_V1 } from './criterios';
import type { CriterioDesempate } from './desempate';

export type EvaluacionParaJustificar = {
  nombre: string;
  score: number;
  desglose: CriterioEvaluado[];
  frases: Record<CriterioId, string | null>;
};

const ETIQUETA = Object.fromEntries(CRITERIOS_V1.map((c) => [c.id, c.etiqueta])) as Record<
  CriterioId,
  string
>;
const ORDEN = Object.fromEntries(CRITERIOS_V1.map((c, i) => [c.id, i])) as Record<
  CriterioId,
  number
>;

const RAZON_DESEMPATE: Record<Exclude<CriterioDesempate, 'score'>, string> = {
  prioridad: 'por tener mayor prioridad',
  carga: 'por tener menos asignaciones activas',
  horario: 'por compartir más horario',
  tutorId: 'por el orden de desempate',
};

/** 86.5 → "86,5"; 9 → "9". */
export function formatearPuntos(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

/** Criterios ordenados por aporte ↓ (empates en el orden canónico). */
export function criteriosPorAporte(desglose: CriterioEvaluado[]): CriterioEvaluado[] {
  return [...desglose].sort((a, b) => b.aporte - a.aporte || ORDEN[a.criterio] - ORDEN[b.criterio]);
}

function unir(frases: string[]): string {
  if (frases.length <= 1) return frases.join('');
  return `${frases.slice(0, -1).join(', ')} y ${frases.at(-1)}`;
}

function comparacion(
  primero: EvaluacionParaJustificar,
  segundo: EvaluacionParaJustificar | undefined,
  regla: CriterioDesempate | undefined,
): string {
  if (!segundo) return '';
  const diferencia = Math.round((primero.score - segundo.score) * 10) / 10;
  if (diferencia <= 0 || regla !== 'score') {
    const razon = regla && regla !== 'score' ? RAZON_DESEMPATE[regla] : RAZON_DESEMPATE.tutorId;
    return ` Empata en puntaje con la segunda opción y se prefiere ${razon}.`;
  }
  const aporteSegundo = new Map(segundo.desglose.map((c) => [c.criterio, c.aporte]));
  const [explica] = [...primero.desglose].sort(
    (a, b) =>
      b.aporte -
        (aporteSegundo.get(b.criterio) ?? 0) -
        (a.aporte - (aporteSegundo.get(a.criterio) ?? 0)) || ORDEN[a.criterio] - ORDEN[b.criterio],
  );
  const puntos = `${formatearPuntos(diferencia)} ${diferencia === 1 ? 'punto' : 'puntos'}`;
  return ` Supera a la segunda opción por ${puntos}, sobre todo en ${ETIQUETA[explica!.criterio]}.`;
}

function recortar(texto: string): string {
  return texto.length <= JUSTIFICACION_MAX ? texto : `${texto.slice(0, JUSTIFICACION_MAX - 1)}…`;
}

export function justificarRecomendacion(
  primero: EvaluacionParaJustificar,
  segundo?: EvaluacionParaJustificar,
  regla?: CriterioDesempate,
): string {
  const frases = criteriosPorAporte(primero.desglose)
    .map((c) => primero.frases[c.criterio])
    .filter((f): f is string => f !== null);
  const cola = comparacion(primero, segundo, regla);
  const cabeza = `${primero.nombre} (${formatearPuntos(primero.score)}/100)`;

  // Se prueba con 3, 2 y 1 frases hasta caber en el límite.
  for (let n = Math.min(3, frases.length); n >= 1; n--) {
    const texto = `${cabeza}: ${unir(frases.slice(0, n))}.${cola}`;
    if (texto.length <= JUSTIFICACION_MAX) return texto;
  }
  return recortar(`${cabeza}.${cola}`);
}

export function justificarSinCandidatos(
  totalCandidatos: number,
  descartados: CandidatoDescartado[],
): string {
  if (totalCandidatos === 0) {
    return 'No hay tutores activos que dicten esta materia, así que no hay candidatos para evaluar.';
  }
  const contar = (m: string) => descartados.filter((d) => d.motivos.some((x) => x === m)).length;
  const partes = [
    [contar('SIN_HORARIO_COMPATIBLE'), 'sin horario compatible'],
    [contar('SIN_CUPO'), 'sin cupo'],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, texto]) => `${n} ${texto}`);
  return recortar(`No hay tutores elegibles: ${partes.join(', ')}.`);
}
