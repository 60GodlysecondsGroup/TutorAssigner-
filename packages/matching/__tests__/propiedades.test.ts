/** Tests de propiedades con fast-check (DoD F6). */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  JUSTIFICACION_MAX,
  ResultadoMatching,
  type FranjaHoraria,
  type SolicitudMatching,
  type TutorCandidato,
} from '@tutorias/contracts/matching';
import { evaluar } from '../src';
import { config, uid } from './helpers';

const hora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const franja: fc.Arbitrary<FranjaHoraria> = fc
  .record({
    dia: fc.integer({ min: 1, max: 7 }),
    inicio: fc.integer({ min: 12, max: 40 }), // 06:00–20:00 en pasos de 30 min
    bloques: fc.integer({ min: 1, max: 8 }),
  })
  .map(({ dia, inicio, bloques }) => ({
    dia,
    inicio: hora(inicio * 30),
    fin: hora(Math.min(inicio * 30 + bloques * 30, 23 * 60 + 30)),
  }));

const nivel = fc.integer({ min: 1, max: 5 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>;

const tutorArb = (n: number): fc.Arbitrary<TutorCandidato> =>
  fc
    .record({
      nivelPrioridad: nivel,
      nivelDominio: nivel,
      modalidad: fc.constantFrom('PRESENCIAL', 'VIRTUAL', 'AMBAS') as fc.Arbitrary<
        TutorCandidato['modalidad']
      >,
      franjas: fc.array(franja, { maxLength: 4 }),
      capacidadMaxima: fc.integer({ min: 1, max: 5 }),
      asignacionesActivas: fc.integer({ min: 0, max: 5 }),
    })
    .map((t) => ({ ...t, tutorId: uid(n), nombre: `Tutor ${n}` }));

const candidatosArb = fc
  .integer({ min: 0, max: 7 })
  .chain((k) => fc.tuple(...Array.from({ length: k }, (_, i) => tutorArb(i + 1))))
  .map((t) => [...t] as TutorCandidato[]);

const solicitudArb: fc.Arbitrary<SolicitudMatching> = fc.record({
  solicitudId: fc.constant(uid(900)),
  materiaId: fc.constant(uid(800)),
  materiaNombre: fc.constant('Cálculo I'),
  franjas: fc.array(franja, { minLength: 1, maxLength: 4 }),
  duracionSesionMin: fc.constantFrom(30, 60, 90, 120),
  preferencias: fc.record(
    {
      modalidad: fc.constantFrom('PRESENCIAL', 'VIRTUAL') as fc.Arbitrary<'PRESENCIAL' | 'VIRTUAL'>,
      tutorPreferidoId: fc.integer({ min: 1, max: 7 }).map(uid),
    },
    { requiredKeys: [] },
  ),
});

const pesosArb = fc
  .tuple(...Array.from({ length: 5 }, () => fc.integer({ min: 0, max: 20 })))
  .filter((xs) => xs.some((x) => x > 0))
  .map((xs) => {
    const total = xs.reduce((a, b) => a + b, 0);
    const [dominio, horario, prioridad, preferencias, carga] = xs.map((x) => x / total) as number[];
    return config({
      pesos: {
        dominio: dominio!,
        horario: horario!,
        prioridad: prioridad!,
        preferencias: preferencias!,
        carga: carga!,
      },
    });
  });

const RUNS = { numRuns: 300 };

describe('propiedades del motor', () => {
  it('el resultado cumple el contrato: score 0–100, justificación ≤ 280, ranking ordenado', () => {
    fc.assert(
      fc.property(solicitudArb, candidatosArb, pesosArb, (s, c, cfg) => {
        const r = evaluar(s, c, cfg);
        expect(ResultadoMatching.safeParse(r).success).toBe(true);
        expect(r.justificacion.length).toBeLessThanOrEqual(JUSTIFICACION_MAX);
        for (const cand of r.ranking) {
          expect(cand.score).toBeGreaterThanOrEqual(0);
          expect(cand.score).toBeLessThanOrEqual(100);
        }
        // Cada candidato aparece una sola vez: elegible o descartado.
        expect(r.ranking.length + r.descartados.length).toBe(c.length);
      }),
      RUNS,
    );
  });

  it('determinismo: mismo input → mismo output, y el orden de entrada no importa', () => {
    fc.assert(
      fc.property(solicitudArb, candidatosArb, (s, c) => {
        const a = evaluar(s, c, config());
        expect(evaluar(structuredClone(s), structuredClone(c), config())).toEqual(a);
        expect(evaluar(s, [...c].reverse(), config())).toEqual(a);
      }),
      RUNS,
    );
  });

  it('el recomendado tiene score ≥ que las alternativas y éstas van en orden descendente', () => {
    fc.assert(
      fc.property(solicitudArb, candidatosArb, (s, c) => {
        const r = evaluar(s, c, config());
        if (!r.recomendado) return;
        const scores = [r.recomendado, ...r.alternativas].map((x) => x.score);
        expect(scores).toEqual([...scores].sort((x, y) => y - x));
        expect(r.alternativas.length).toBeLessThanOrEqual(config().parametros.topN - 1);
      }),
      RUNS,
    );
  });

  it.each(['nivelPrioridad', 'nivelDominio'] as const)(
    'monotonicidad: subir %s nunca baja el score del tutor',
    (campo) => {
      fc.assert(
        fc.property(solicitudArb, candidatosArb, fc.nat(), (s, c, idx) => {
          if (c.length === 0) return;
          const i = idx % c.length;
          const original = c[i]!;
          if (original[campo] === 5) return;
          const mejorado = c.map((t, j) => (j === i ? { ...t, [campo]: t[campo] + 1 } : t));
          const antes = evaluar(s, c, config()).ranking.find((x) => x.tutorId === original.tutorId);
          const despues = evaluar(s, mejorado, config()).ranking.find(
            (x) => x.tutorId === original.tutorId,
          );
          expect(Boolean(antes)).toBe(Boolean(despues)); // la elegibilidad no depende de estos niveles
          if (antes && despues) expect(despues.score).toBeGreaterThanOrEqual(antes.score);
        }),
        RUNS,
      );
    },
  );
});
