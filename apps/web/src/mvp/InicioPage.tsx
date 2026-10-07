import { Link } from 'react-router';
import type { Asignacion } from '@tutorias/contracts/recomendaciones';
import { useCarga, type Solicitud } from './api';

export function InicioPage() {
  const solicitudes = useCarga<Solicitud[]>('/solicitudes');
  const asignaciones = useCarga<Asignacion[]>('/asignaciones?estado=ACTIVA&pageSize=100');
  const abiertas = solicitudes.data?.filter((s) => s.estado === 'ABIERTA') ?? [];

  const porTutor = new Map<string, number>();
  for (const a of asignaciones.data ?? [])
    porTutor.set(a.tutorNombre, (porTutor.get(a.tutorNombre) ?? 0) + 1);

  return (
    <>
      <h1>Panel del coordinador</h1>
      <div className="tarjetas">
        <div className="tarjeta kpi">
          <span>{abiertas.length}</span>Solicitudes abiertas
        </div>
        <div className="tarjeta kpi">
          <span>{asignaciones.data?.length ?? 0}</span>Asignaciones activas
        </div>
        <div className="tarjeta kpi">
          <span>{porTutor.size}</span>Tutores con carga
        </div>
      </div>

      <section className="tarjeta">
        <h2>Solicitudes abiertas sin asignar</h2>
        {abiertas.length === 0 ? (
          <p className="vacio">No hay solicitudes abiertas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Materia</th>
                <th>Tema</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {abiertas.map((s) => (
                <tr key={s.id}>
                  <td>{s.estudianteNombre}</td>
                  <td>{s.materiaNombre}</td>
                  <td>{s.tema}</td>
                  <td>
                    <Link className="boton" to={`/solicitudes/${s.id}/recomendacion`}>
                      Ver recomendación
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tarjeta">
        <h2>Asignaciones activas por tutor</h2>
        {porTutor.size === 0 ? (
          <p className="vacio">Aún no hay asignaciones activas.</p>
        ) : (
          <ul>
            {[...porTutor].map(([tutor, n]) => (
              <li key={tutor}>
                {tutor}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
