import type { Rol, Usuario } from '@tutorias/contracts/auth';

/** Fila de `usuarios` tal como la devuelve PostgreSQL. */
export type UsuarioRow = {
  id: string;
  email: string;
  nombre: string;
  password_hash: string;
  rol: Rol;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
};

/** Registro interno del módulo: incluye el hash, nunca sale del servicio. */
export type UsuarioRecord = {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
};

export const toRecord = (row: UsuarioRow): UsuarioRecord => ({
  id: row.id,
  email: row.email,
  nombre: row.nombre,
  passwordHash: row.password_hash,
  rol: row.rol,
  activo: row.activo,
});

/** DTO público del contrato: sin hash ni campos internos. */
export const toUsuario = (u: UsuarioRecord): Usuario => ({
  id: u.id,
  email: u.email,
  nombre: u.nombre,
  rol: u.rol,
});
