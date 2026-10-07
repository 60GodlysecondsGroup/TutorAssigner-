import type { FranjaHoraria } from '@tutorias/contracts/matching';
import { DIAS } from './api';

export function FranjasEditor({
  value,
  onChange,
}: {
  value: FranjaHoraria[];
  onChange: (f: FranjaHoraria[]) => void;
}) {
  const set = (i: number, cambio: Partial<FranjaHoraria>) =>
    onChange(value.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  return (
    <div className="franjas">
      {value.map((f, i) => (
        <div key={i} className="fila">
          <select value={f.dia} onChange={(e) => set(i, { dia: Number(e.target.value) })}>
            {DIAS.map((d, k) => (
              <option key={d} value={k + 1}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={f.inicio}
            onChange={(e) => set(i, { inicio: e.target.value })}
          />
          <span>a</span>
          <input type="time" value={f.fin} onChange={(e) => set(i, { fin: e.target.value })} />
          <button
            type="button"
            className="secundario"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secundario"
        onClick={() => onChange([...value, { dia: 1, inicio: '14:00', fin: '16:00' }])}
      >
        + Franja
      </button>
    </div>
  );
}
