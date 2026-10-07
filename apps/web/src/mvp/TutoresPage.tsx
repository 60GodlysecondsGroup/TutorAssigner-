import { useState, type FormEvent } from 'react';
import type { FranjaHoraria } from '@tutorias/contracts/matching';
import type { Tutor } from '@tutorias/contracts/tutores';
import { request } from '../shared/api';
import { formatoFranja, mensajeError, useCarga, type Materia } from './api';
import { FranjasEditor } from './FranjasEditor';

const vacio = {
  nombre: '',
  email: '',
  nivelPrioridad: 3,
  modalidad: 'AMBAS',
  capacidadMaxima: 3,
  materiaId: '',
  nivelDominio: 4,
};

export function TutoresPage() {
  const tutores = useCarga<Tutor[]>('/tutores');
  const materias = useCarga<Materia[]>('/materias');
  const [form, setForm] = useState(vacio);
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([
    { dia: 2, inicio: '14:00', fin: '16:00' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const campo = (k: keyof typeof vacio) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) =>
      setForm({
        ...form,
        [k]: typeof vacio[k] === 'number' ? Number(e.target.value) : e.target.value,
      }),
  });

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await request('/tutores', {
        method: 'POST',
        body: {
          nombre: form.nombre,
          email: form.email,
          nivelPrioridad: form.nivelPrioridad,
          modalidad: form.modalidad,
          capacidadMaxima: form.capacidadMaxima,
          materias: form.materiaId
            ? [{ materiaId: form.materiaId, nivelDominio: form.nivelDominio }]
            : [],
          franjas,
        },
      });
      setForm(vacio);
      setAbierto(false);
      tutores.recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  async function alternarActivo(t: Tutor) {
    await request(`/tutores/${t.id}`, { method: 'PATCH', body: { activo: !t.activo } });
    tutores.recargar();
  }

  return (
    <>
      <div className="titulo">
        <h1>Tutores</h1>
        <button type="button" onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Cerrar' : '+ Nuevo tutor'}
        </button>
      </div>

      {abierto && (
        <form className="tarjeta formulario" onSubmit={crear}>
          <label>
            Nombre <input required {...campo('nombre')} />
          </label>
          <label>
            Correo <input required type="email" {...campo('email')} />
          </label>
          <label>
            Prioridad (1–5) <input type="number" min={1} max={5} {...campo('nivelPrioridad')} />
          </label>
          <label>
            Modalidad
            <select {...campo('modalidad')}>
              <option value="AMBAS">Ambas</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
            </select>
          </label>
          <label>
            Capacidad máxima <input type="number" min={1} max={10} {...campo('capacidadMaxima')} />
          </label>
          <label>
            Materia que domina
            <select {...campo('materiaId')}>
              <option value="">— Ninguna —</option>
              {materias.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nivel de dominio (1–5){' '}
            <input type="number" min={1} max={5} {...campo('nivelDominio')} />
          </label>
          <div className="completo">
            <span>Disponibilidad semanal</span>
            <FranjasEditor value={franjas} onChange={setFranjas} />
          </div>
          {error && <p className="error completo">{error}</p>}
          <button type="submit">Guardar tutor</button>
        </form>
      )}

      {tutores.error && <p className="error">{tutores.error}</p>}
      <table className="tarjeta">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Materias (dominio)</th>
            <th>Prioridad</th>
            <th>Modalidad</th>
            <th>Capacidad</th>
            <th>Disponibilidad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {tutores.data?.map((t) => (
            <tr key={t.id} className={t.activo ? '' : 'inactivo'}>
              <td>
                {t.nombre}
                <br />
                <small>{t.email}</small>
              </td>
              <td>
                {t.materias.map((m) => `${m.nombre} (${m.nivelDominio}/5)`).join(', ') || '—'}
              </td>
              <td>{t.nivelPrioridad}/5</td>
              <td>{t.modalidad}</td>
              <td>{t.capacidadMaxima}</td>
              <td>{t.franjas.map(formatoFranja).join(', ') || '—'}</td>
              <td>
                <button type="button" className="secundario" onClick={() => void alternarActivo(t)}>
                  {t.activo ? 'Activo · desactivar' : 'Inactivo · activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
