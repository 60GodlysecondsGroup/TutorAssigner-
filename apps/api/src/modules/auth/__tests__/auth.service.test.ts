import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRepository } from '../auth.repository';
import type { UsuarioRecord } from '../auth.mapper';
import { createAuthService } from '../auth.service';
import type { PasswordHasher } from '../password';

const activo: UsuarioRecord = {
  id: '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
  email: 'coordinador@tutorias.test',
  nombre: 'Coordinación',
  passwordHash: 'hash-correcto',
  rol: 'COORDINADOR',
  activo: true,
};
const inactivo: UsuarioRecord = {
  ...activo,
  id: '1b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
  email: 'baja@tutorias.test',
  activo: false,
};

function fakeRepo(registros: UsuarioRecord[]): AuthRepository {
  return {
    findByEmail: async (email) => registros.find((r) => r.email === email.toLowerCase()),
    findById: async (id) => registros.find((r) => r.id === id),
  };
}

const passwords: PasswordHasher = {
  hash: async (p) => `hash-${p}`,
  verify: async (p, h) => h === 'hash-correcto' && p === 'correcta',
  verifyDummy: vi.fn(async () => false as const),
};

describe('AuthService', () => {
  const session = { sign: vi.fn(() => 'token-firmado') };
  let service: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService({ repo: fakeRepo([activo, inactivo]), passwords, session });
  });

  it('login correcto devuelve el usuario público y el token', async () => {
    const res = await service.login('coordinador@tutorias.test', 'correcta');
    expect(res.token).toBe('token-firmado');
    expect(res.usuario).toEqual({
      id: activo.id,
      email: activo.email,
      nombre: activo.nombre,
      rol: 'COORDINADOR',
    });
    expect(JSON.stringify(res.usuario)).not.toContain('hash');
    expect(session.sign).toHaveBeenCalledWith({ id: activo.id, rol: 'COORDINADOR' });
  });

  it('contraseña incorrecta → 401 AUTH_INVALID_CREDENTIALS', async () => {
    await expect(service.login(activo.email, 'mala')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
  });

  it('correo inexistente → mismo error y compara contra el hash ficticio (tiempo constante)', async () => {
    await expect(service.login('nadie@tutorias.test', 'correcta')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(passwords.verifyDummy).toHaveBeenCalledOnce();
  });

  it('usuario inactivo → mismo error genérico', async () => {
    const svc = createAuthService({
      repo: fakeRepo([{ ...inactivo, passwordHash: 'hash-correcto' }]),
      passwords,
      session,
    });
    await expect(svc.login(inactivo.email, 'correcta')).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect(session.sign).not.toHaveBeenCalled();
  });

  it('me devuelve el usuario activo', async () => {
    await expect(service.me(activo.id)).resolves.toMatchObject({
      id: activo.id,
      rol: 'COORDINADOR',
    });
  });

  it('me con usuario inactivo o inexistente → 401', async () => {
    await expect(service.me(inactivo.id)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    await expect(service.me('2b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d')).rejects.toMatchObject({
      status: 401,
    });
  });
});
