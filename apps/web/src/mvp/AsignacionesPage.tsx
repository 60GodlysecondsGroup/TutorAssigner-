import { useState } from 'react';
import { Link } from 'react-router';
import type { Asignacion } from '@tutorias/contracts/recomendaciones';
import { request } from '../shared/api';
import { mensajeError, useCarga } from './api';

export function AsignacionesPage() {
  const [estado, setEstado] = useState('ACTIVA');
  const asignaciones = useCarga<Asignacion[]>(
    `/asignaciones?pageSize=100${estado ? `&estado=${estado}` : ''}`,
  );

  async function cambiar(a: Asignacion, nuevo: 'FINALIZADA' | 'CANCELADA') {
    const verbo = nuevo === 'FINALIZADA' ? 'Finalizar' : 'Cancelar';
    if (!window.confirm(`¿${verbo} la tutoría de ${a.tutorNombre} con ${a.estudianteNombre}?`))
      return;
    try {
      await request(`/asignaciones/${a.id}`, { method: 'PATCH', body: { estado: nuevo } });
    } catch (err) {
      window.alert(mensajeError(err));
    }
    asignaciones.recargar();
  }

  return (
    <>
      <div className="titulo">
        <h1>Asignaciones</h1>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="ACTIVA">Activas</option>
          <option value="FINALIZADA">Finalizadas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="">Todas</option>
        </select>
      </div>
      {asignaciones.error && <p className="error">{asignaciones.error}</p>}
      {asignaciones.data?.length === 0 && (
        <p className="vacio">No hay asignaciones con este filtro.</p>
      )}
      {!!asignaciones.data?.length && (
        <table className="tarjeta">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Tutor</th>
              <th>Materia</th>
              <th>Score</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {asignaciones.data.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link to={`/solicitudes/${a.solicitudId}/recomendacion`}>
                    {a.estudianteNombre}
                  </Link>
                </td>
                <td>
                  {a.tutorNombre}
                  {a.motivoCambio && (
                    <span className="badge alterno" title={a.motivoCambio}>
                      alternativa
                    </span>
                  )}
                </td>
                <td>{a.materiaNombre}</td>
                <td>{a.score?.toFixed(1) ?? '—'}</td>
                <td>
                  <span className={`badge ${a.estado}`}>{a.estado}</span>
                </td>
                <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="acciones">
                  {a.estado === 'ACTIVA' && (
                    <>
                      <button
                        type="button"
                        className="secundario"
                        onClick={() => void cambiar(a, 'FINALIZADA')}
                      >
                        Finalizar
                      </button>
                      <button
                        type="button"
                        className="peligro"
                        onClick={() => void cambiar(a, 'CANCELADA')}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
