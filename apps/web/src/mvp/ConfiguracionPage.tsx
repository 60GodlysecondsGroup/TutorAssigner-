import { useEffect, useState, type FormEvent } from 'react';
import { CRITERIOS, type PesosMatching } from '@tutorias/contracts/matching';
import type { ConfiguracionMatching } from '@tutorias/contracts/recomendaciones';
import { request } from '../shared/api';
import { mensajeError, useCarga } from './api';

const ETIQUETA: Record<string, string> = {
  dominio: 'Dominio de la materia',
  horario: 'Compatibilidad horaria',
  prioridad: 'Prioridad / experiencia',
  preferencias: 'Preferencias del estudiante',
  carga: 'Balance de carga',
};

export function ConfiguracionPage() {
  const config = useCarga<ConfiguracionMatching>('/matching/config');
  const [pesos, setPesos] = useState<PesosMatching | null>(null);
  const [topN, setTopN] = useState(3);
  const [bloques, setBloques] = useState(3);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (!config.data) return;
    setPesos(config.data.pesos);
    setTopN(config.data.parametros.topN);
    setBloques(config.data.parametros.bloquesHorarioIdeal);
  }, [config.data]);

  const suma = pesos ? Object.values(pesos).reduce((a, b) => a + b, 0) : 0;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      const nueva = await request<ConfiguracionMatching>('/matching/config', {
        method: 'PUT',
        body: { pesos, parametros: { topN, bloquesHorarioIdeal: bloques } },
      });
      setMensaje({ ok: true, texto: `Guardada la versión ${nueva.version}` });
      config.recargar();
    } catch (err) {
      setMensaje({ ok: false, texto: mensajeError(err) });
    }
  }

  if (!pesos) return <p className="vacio">{config.error ?? 'Cargando…'}</p>;
  return (
    <>
      <h1>Pesos del matching</h1>
      <p>
        Versión vigente: <strong>{config.data?.version}</strong>. Guardar crea una versión nueva;
        las recomendaciones anteriores conservan la suya.
      </p>
      <form className="tarjeta formulario" onSubmit={guardar}>
        {CRITERIOS.map((c) => (
          <label key={c}>
            {ETIQUETA[c]}: <strong>{Math.round(pesos[c] * 100)}%</strong>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pesos[c]}
              onChange={(e) => setPesos({ ...pesos, [c]: Number(e.target.value) })}
            />
          </label>
        ))}
        <p className={`completo ${Math.abs(suma - 1) > 0.001 ? 'error' : 'ok'}`}>
          Suma de pesos: {(suma * 100).toFixed(0)}%{' '}
          {Math.abs(suma - 1) > 0.001 ? '(debe ser 100%)' : '✓'}
        </p>
        <label>
          Alternativas a mostrar (topN)
          <input
            type="number"
            min={1}
            max={10}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
          />
        </label>
        <label>
          Bloques horarios ideales
          <input
            type="number"
            min={1}
            max={10}
            value={bloques}
            onChange={(e) => setBloques(Number(e.target.value))}
          />
        </label>
        {mensaje && <p className={`completo ${mensaje.ok ? 'ok' : 'error'}`}>{mensaje.texto}</p>}
        <button type="submit">Guardar nueva versión</button>
      </form>
    </>
  );
}
