/**
 * @tutorias/contracts/auth — login, sesión y usuario. Dueño: Dev 1.
 *
 * POST /api/v1/auth/login   LoginRequest → Ok<Usuario> + cookie de sesión   (400, 401, 429)
 * POST /api/v1/auth/logout  —            → 204 (borra la cookie)
 * GET  /api/v1/auth/me      cookie       → Ok<Usuario>                      (401)
 */
import { z } from 'zod';
import { Id } from '../common/index';

/** Roles. Hoy solo existe el coordinador (S-12); ampliable si PV-02 abre cuentas. */
export const Rol = z.enum(['COORDINADOR']);
export type Rol = z.infer<typeof Rol>;

/** Nombre de la cookie httpOnly que transporta el JWT de sesión. */
export const SESSION_COOKIE = 'tutorias_session';

/** Límite superior de la contraseña: bcrypt solo usa 72 bytes y evita payloads abusivos. */
export const PASSWORD_MAX = 72;

export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Correo inválido' }));

export const LoginRequest = z.object({
  email: Email,
  password: z
    .string()
    .min(1, { error: 'La contraseña es obligatoria' })
    .max(PASSWORD_MAX, { error: `Máximo ${PASSWORD_MAX} caracteres` }),
});
export type LoginRequest = z.input<typeof LoginRequest>;

/** Usuario público: nunca incluye la contraseña ni su hash. */
export const Usuario = z.object({
  id: Id,
  email: z.email(),
  nombre: z.string().min(1),
  rol: Rol,
});
export type Usuario = z.infer<typeof Usuario>;

export const LoginResponse = z.object({ data: Usuario });
export type LoginResponse = z.infer<typeof LoginResponse>;

export const MeResponse = z.object({ data: Usuario });
export type MeResponse = z.infer<typeof MeResponse>;

export const AuthErrorCode = {
  /** 401: correo o contraseña incorrectos, o usuario inactivo (mismo mensaje a propósito). */
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  /** 429: demasiados intentos de login desde la misma IP. */
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
} as const;
export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
