import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Recomendacion } from '@tutorias/contracts/recomendaciones';
import { request } from '../shared/api';
import { formatoFranja, mensajeError, useCarga, type Solicitud } from './api';

const CRITERIO: Record<string, string> = {
  dominio: 'Dominio',
  horario: 'Horario',
  prioridad: 'Prioridad',
  preferencias: 'Preferencias',
  carga: 'Carga',
};
const MOTIVO: Record<string, string> = {
  SIN_HORARIO_COMPATIBLE: 'Sin horario compatible',
  SIN_CUPO: 'Sin cupo',
};

export function RecomendacionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const solicitud = useCarga<Solicitud>(`/solicitudes/${id}`);
  const historial = useCarga<Recomendacion[]>(`/recomendaciones?solicitudId=${id}`);
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const autoGenerada = useRef(false);

  const actual = historial.data?.[0];
  const abierta = solicitud.data?.estado === 'ABIERTA';

  async function generar() {
    setGenerando(true);
    setAviso(null);
    try {
      await request('/recomendaciones', { method: 'POST', body: { solicitudId: id } });
      historial.recargar();
    } catch (err) {
      setAviso(mensajeError(err));
    } finally {
      setGenerando(false);
    }
  }

  // Si la solicitud está abierta y no tiene recomendación, se genera al entrar.
  useEffect(() => {
    if (autoGenerada.current || !historial.data || !solicitud.data) return;
    if (historial.data.length === 0 && solicitud.data.estado === 'ABIERTA') {
      autoGenerada.current = true;
      void generar();
    }
  });

  async function confirmar(tutorId: string, nombre: string) {
    if (!actual) return;
    const esRecomendado = tutorId === actual.tutorRecomendadoId;
    let motivoCambio: string | undefined;
    if (!esRecomendado) {
      const m = window.prompt(`Elegiste a ${nombre} en lugar del recomendado. ¿Por qué?`);
      if (!m?.trim()) return;
      motivoCambio = m;
    } else if (!window.confirm(`¿Asignar a ${nombre}?`)) {
      return;
    }
    try {
      await request('/asignaciones', {
        method: 'POST',
        body: { recomendacionId: actual.id, tutorId, motivoCambio },
      });
      navigate('/asignaciones');
    } catch (err) {
      setAviso(mensajeError(err));
    }
  }

  const s = solicitud.data;
  return (
    <>
      <p>
        <Link to="/solicitudes">← Solicitudes</Link>
      </p>
      <h1>Recomendación de tutor</h1>

      {s && (
        <section className="tarjeta resumen">
          <div>
            <strong>{s.estudianteNombre}</strong> · {s.materiaNombre}
            {s.tema ? ` · ${s.tema}` : ''}
          </div>
          <div>
            {s.duracionSesionMin} min · {s.franjas.map(formatoFranja).join(', ')}
            {s.preferencias.modalidad
              ? ` · prefiere ${s.preferencias.modalidad.toLowerCase()}`
              : ''}
          </div>
          <span className={`badge ${s.estado}`}>{s.estado}</span>
        </section>
      )}

      {aviso && (
        <div className="error">
          {aviso}{' '}
          {abierta && (
            <button type="button" onClick={() => void generar()}>
              Regenerar recomendación
            </button>
          )}
        </div>
      )}
      {(generando || historial.cargando) && <p className="vacio">Calculando recomendación…</p>}

      {actual && (
        <>
          <section className={`tarjeta justificacion ${actual.resultado}`}>
            <div>{actual.justificacion}</div>
            <small>
              Pesos versión {actual.configVersion} · {new Date(actual.createdAt).toLocaleString()}
            </small>
            {abierta && (
              <button
                type="button"
                className="secundario"
                onClick={() => void generar()}
                disabled={generando}
              >
                Regenerar
              </button>
            )}
          </section>

          <div className="ranking">
            {actual.candidatos.map((c) => (
              <article
                key={c.tutorId}
                className={`tarjeta candidato ${c.posicion === 1 ? 'top' : ''}`}
              >
                <header>
                  <span className="pos">#{c.posicion}</span>
                  <strong>{c.nombre}</strong>
                  <span className="score">{c.score.toFixed(1)}</span>
                </header>
                <table className="desglose">
                  <thead>
                    <tr>
                      <th>Criterio</th>
                      <th>Valor</th>
                      <th>Peso</th>
                      <th>Aporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.desglose.map((d) => (
                      <tr key={d.criterio} title={d.evidencia}>
                        <td>
                          {CRITERIO[d.criterio]}
                          <br />
                          <small>{d.evidencia}</small>
                        </td>
                        <td>{d.valor.toFixed(2)}</td>
                        <td>{d.peso}</td>
                        <td>
                          <div className="barrita" style={{ width: `${d.aporte * 2}px` }} />
                          {d.aporte.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {abierta && (
                  <button
                    type="button"
                    className={c.posicion === 1 ? '' : 'secundario'}
                    onClick={() => void confirmar(c.tutorId, c.nombre)}
                  >
                    {c.posicion === 1 ? 'Confirmar asignación' : 'Elegir esta alternativa'}
                  </button>
                )}
              </article>
            ))}
          </div>

          {actual.descartados.length > 0 && (
            <section className="tarjeta">
              <h2>Descartados</h2>
              <ul>
                {actual.descartados.map((d) => (
                  <li key={d.tutorId}>
                    {d.nombre}: {d.motivos.map((m) => MOTIVO[m] ?? m).join(', ')}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(historial.data?.length ?? 0) > 1 && (
            <details className="tarjeta">
              <summary>Historial ({historial.data!.length - 1} anteriores)</summary>
              <ul>
                {historial.data!.slice(1).map((r) => (
                  <li key={r.id}>
                    {new Date(r.createdAt).toLocaleString()} · v{r.configVersion} ·{' '}
                    {r.justificacion}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
