import { useState, type FormEvent } from 'react';
import { request } from '../shared/api';
import { mensajeError, useCarga, type Estudiante } from './api';

export function EstudiantesPage() {
  const estudiantes = useCarga<Estudiante[]>('/estudiantes');
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    codigo: '',
    programa: '',
    semestre: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await request('/estudiantes', {
        method: 'POST',
        body: {
          nombre: form.nombre,
          email: form.email,
          codigo: form.codigo || undefined,
          programa: form.programa || undefined,
          semestre: form.semestre ? Number(form.semestre) : undefined,
        },
      });
      setForm({ nombre: '', email: '', codigo: '', programa: '', semestre: '' });
      estudiantes.recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  const campo = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <>
      <h1>Estudiantes</h1>
      <form className="tarjeta formulario" onSubmit={crear}>
        <label>
          Nombre <input required {...campo('nombre')} />
        </label>
        <label>
          Correo <input required type="email" {...campo('email')} />
        </label>
        <label>
          Código <input {...campo('codigo')} />
        </label>
        <label>
          Programa <input {...campo('programa')} />
        </label>
        <label>
          Semestre <input type="number" min={1} max={12} {...campo('semestre')} />
        </label>
        {error && <p className="error completo">{error}</p>}
        <button type="submit">Registrar estudiante</button>
      </form>
      <table className="tarjeta">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Código</th>
            <th>Programa</th>
            <th>Semestre</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.data?.map((e) => (
            <tr key={e.id}>
              <td>{e.nombre}</td>
              <td>{e.email}</td>
              <td>{e.codigo ?? '—'}</td>
              <td>{e.programa ?? '—'}</td>
              <td>{e.semestre ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
