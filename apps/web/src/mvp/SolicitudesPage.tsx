import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { FranjaHoraria } from '@tutorias/contracts/matching';
import { request } from '../shared/api';
import {
  formatoFranja,
  mensajeError,
  useCarga,
  type Estudiante,
  type Materia,
  type Solicitud,
} from './api';
import { FranjasEditor } from './FranjasEditor';

export function SolicitudesPage() {
  const navigate = useNavigate();
  const solicitudes = useCarga<Solicitud[]>('/solicitudes');
  const estudiantes = useCarga<Estudiante[]>('/estudiantes');
  const materias = useCarga<Materia[]>('/materias');
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    estudianteId: '',
    materiaId: '',
    tema: '',
    duracion: 60,
    modalidad: '',
  });
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([
    { dia: 2, inicio: '14:00', fin: '17:00' },
  ]);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const s = await request<Solicitud>('/solicitudes', {
        method: 'POST',
        body: {
          estudianteId: form.estudianteId,
          materiaId: form.materiaId,
          tema: form.tema || undefined,
          duracionSesionMin: form.duracion,
          franjas,
          preferencias: form.modalidad ? { modalidad: form.modalidad } : {},
        },
      });
      navigate(`/solicitudes/${s.id}/recomendacion`);
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm('¿Cancelar esta solicitud?')) return;
    try {
      await request(`/solicitudes/${id}/cancelar`, { method: 'POST' });
    } catch (err) {
      window.alert(mensajeError(err));
    }
    solicitudes.recargar();
  }

  const campo = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) =>
      setForm({ ...form, [k]: k === 'duracion' ? Number(e.target.value) : e.target.value }),
  });

  return (
    <>
      <div className="titulo">
        <h1>Solicitudes</h1>
        <button type="button" onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Cerrar' : '+ Nueva solicitud'}
        </button>
      </div>

      {abierto && (
        <form className="tarjeta formulario" onSubmit={crear}>
          <label>
            Estudiante
            <select required {...campo('estudianteId')}>
              <option value="">— Elegir —</option>
              {estudiantes.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Materia
            <select required {...campo('materiaId')}>
              <option value="">— Elegir —</option>
              {materias.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tema <input {...campo('tema')} />
          </label>
          <label>
            Duración de la sesión (min)
            <select {...campo('duracion')}>
              {[30, 60, 90, 120].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Modalidad preferida
            <select {...campo('modalidad')}>
              <option value="">Sin preferencia</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
            </select>
          </label>
          <div className="completo">
            <span>Disponibilidad del estudiante</span>
            <FranjasEditor value={franjas} onChange={setFranjas} />
          </div>
          {error && <p className="error completo">{error}</p>}
          <button type="submit">Crear y recomendar tutor</button>
        </form>
      )}

      {solicitudes.error && <p className="error">{solicitudes.error}</p>}
      <table className="tarjeta">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Materia</th>
            <th>Tema</th>
            <th>Disponibilidad</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {solicitudes.data?.map((s) => (
            <tr key={s.id}>
              <td>{s.estudianteNombre}</td>
              <td>{s.materiaNombre}</td>
              <td>{s.tema ?? '—'}</td>
              <td>{s.franjas.map(formatoFranja).join(', ')}</td>
              <td>
                <span className={`badge ${s.estado}`}>{s.estado}</span>
              </td>
              <td className="acciones">
                <Link className="boton" to={`/solicitudes/${s.id}/recomendacion`}>
                  Recomendación
                </Link>
                {s.estado === 'ABIERTA' && (
                  <button type="button" className="secundario" onClick={() => void cancelar(s.id)}>
                    Cancelar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
