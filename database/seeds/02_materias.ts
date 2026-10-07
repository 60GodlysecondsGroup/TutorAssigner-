import type { Knex } from 'knex';

// Catálogo de materias (todos los entornos). Idempotente por código.
const MATERIAS = [
  ['MAT101', 'Cálculo I'],
  ['MAT102', 'Cálculo II'],
  ['MAT201', 'Álgebra Lineal'],
  ['FIS101', 'Física I'],
  ['FIS102', 'Física II'],
  ['QUI101', 'Química General'],
  ['PRG101', 'Programación I'],
  ['PRG201', 'Estructuras de Datos'],
  ['EST101', 'Estadística'],
  ['ECO101', 'Microeconomía'],
];

export async function seed(knex: Knex): Promise<void> {
  await knex('materias')
    .insert(MATERIAS.map(([codigo, nombre]) => ({ codigo, nombre, activa: true })))
    .onConflict('codigo')
    .ignore();
}
