import { describe, expect, it } from 'vitest';
import { FranjaHoraria } from '../matching/index';
import { Materia, MateriaCrear, Tutor, TutorCrear } from './index';
import { materiaValida, tutorValido } from './fixtures';

describe('contratos tutores', () => {
  it('acepta una materia válida', () => {
    expect(Materia.parse({
      id: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338',
      codigo: 'MAT101',
      nombre: 'Cálculo I',
      activa: true,
    })).toMatchObject({ codigo: 'MAT101', activa: true });
  });

  it('acepta un alta de tutor con materias y franjas válidas', () => {
    expect(TutorCrear.parse(tutorValido)).toMatchObject({
      nombre: 'Ana Torres',
      email: 'ana@tutorias.test',
      modalidad: 'AMBAS',
      capacidadMaxima: 3,
    });
  });

  it('rechaza una franja que termina antes de empezar', () => {
    expect(() =>
      FranjaHoraria.parse({
        dia: 1,
        inicio: '10:00',
        fin: '09:00',
      }),
    ).toThrow();
  });

  it('rechaza una materia con código vacío', () => {
    expect(() => MateriaCrear.parse({ codigo: '', nombre: 'Cálculo I', activa: true })).toThrow();
  });

  it('parsea un tutor completo', () => {
    expect(
      Tutor.parse({
        id: '7f32dd9d-8b2e-4d7e-8fd8-c9f6f61cfbdd',
        nombre: 'Ana Torres',
        email: 'ana@tutorias.test',
        programa: 'Ingeniería de Sistemas',
        nivelPrioridad: 4,
        modalidad: 'AMBAS',
        capacidadMaxima: 3,
        activo: true,
        materias: [
          {
            materiaId: 'f1d8c7e8-9cc8-4b7a-b7d4-c1bf7d2f5338',
            nivelDominio: 5,
            codigo: 'MAT101',
            nombre: 'Cálculo I',
          },
        ],
        franjas: [
          { dia: 1, inicio: '09:00', fin: '11:00' },
          { dia: 3, inicio: '15:00', fin: '17:00' },
        ],
        createdAt: '2026-10-07T12:00:00.000Z',
        updatedAt: '2026-10-07T12:00:00.000Z',
      }),
    ).toMatchObject({ email: 'ana@tutorias.test' });
  });
});
