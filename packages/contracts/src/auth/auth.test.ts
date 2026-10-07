import { describe, expect, it } from 'vitest';
import { ApiErrorBody } from '../common/index';
import { LoginRequest, LoginResponse, MeResponse, Usuario } from './index';
import { errorCredenciales, invalidos, loginValido, usuarioCoordinador } from './fixtures';

describe('contracts/auth', () => {
  it('acepta los fixtures válidos', () => {
    expect(LoginRequest.safeParse(loginValido).success).toBe(true);
    expect(Usuario.safeParse(usuarioCoordinador).success).toBe(true);
    expect(LoginResponse.safeParse({ data: usuarioCoordinador }).success).toBe(true);
    expect(MeResponse.safeParse({ data: usuarioCoordinador }).success).toBe(true);
    expect(ApiErrorBody.safeParse(errorCredenciales).success).toBe(true);
  });

  it('rechaza los fixtures inválidos', () => {
    expect(LoginRequest.safeParse(invalidos.login).success).toBe(false);
    expect(LoginRequest.safeParse(invalidos.loginPasswordLarga).success).toBe(false);
    expect(Usuario.safeParse(invalidos.usuarioRolInvalido).success).toBe(false);
  });

  it('normaliza el correo (espacios y mayúsculas)', () => {
    const parsed = LoginRequest.parse({ email: '  Coordinador@Tutorias.TEST ', password: 'x' });
    expect(parsed.email).toBe('coordinador@tutorias.test');
  });

  it('el usuario público descarta campos sensibles', () => {
    const parsed = Usuario.parse({ ...usuarioCoordinador, password_hash: '$2b$...' });
    expect(parsed).not.toHaveProperty('password_hash');
  });
});
