import type { FranjaHoraria } from '@tutorias/contracts/matching';

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

/** "mar 14:00–16:00" */
export function formatearFranja(f: FranjaHoraria): string {
  return `${DIAS[f.dia - 1] ?? `día ${f.dia}`} ${f.inicio}–${f.fin}`;
}

/** 180 → "3 h", 90 → "1 h 30 min", 45 → "45 min". */
export function formatearDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
