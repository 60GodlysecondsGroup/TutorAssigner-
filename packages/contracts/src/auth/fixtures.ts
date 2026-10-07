import type { ApiErrorBody } from '../common/index';
import type { LoginRequest, Usuario } from './index';

export const usuarioCoordinador: Usuario = {
  id: '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
  email: 'coordinador@tutorias.test',
  nombre: 'Coordinación de Tutorías',
  rol: 'COORDINADOR',
};

export const loginValido: LoginRequest = {
  email: 'coordinador@tutorias.test',
  password: 'contrasena-de-prueba',
};

export const errorCredenciales: ApiErrorBody = {
  error: {
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Correo o contraseña incorrectos',
    requestId: 'b7d2c1a0-0000-4000-8000-000000000003',
  },
};

/** Fixtures inválidos: cada uno debe ser rechazado por su esquema. */
export const invalidos = {
  login: { email: 'no-es-correo', password: '' },
  loginPasswordLarga: { email: 'a@b.co', password: 'x'.repeat(73) },
  usuarioRolInvalido: {
    ...usuarioCoordinador,
    rol: 'ADMIN',
  },
};
