import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('loadConfig', () => {
  it('aplica defaults de desarrollo', () => {
    const c = loadConfig(base);
    expect(c).toMatchObject({
      env: 'development',
      port: 3000,
      cookieSecure: false,
      sessionTtlSeconds: 28800,
      bcryptCost: 12,
      trustProxy: 0,
    });
    expect(c.jwtSecret.length).toBeGreaterThanOrEqual(32);
  });

  it('falla sin DATABASE_URL y no filtra valores en el mensaje', () => {
    expect(() => loadConfig({ JWT_SECRET: 'super-secreto' })).toThrow(ConfigError);
    try {
      loadConfig({ JWT_SECRET: 'super-secreto' });
    } catch (err) {
      expect((err as Error).message).toContain('DATABASE_URL');
      expect((err as Error).message).not.toContain('super-secreto');
    }
  });

  it('en producción no arranca sin JWT_SECRET', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('en producción rechaza un JWT_SECRET corto', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: 'corto' })).toThrow(
      /32 caracteres/,
    );
  });

  it('en producción la cookie es Secure por defecto', () => {
    const c = loadConfig({ ...base, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) });
    expect(c.cookieSecure).toBe(true);
    expect(c.isProduction).toBe(true);
  });

  it('interpreta booleanos de texto correctamente', () => {
    expect(
      loadConfig({
        ...base,
        COOKIE_SECURE: 'false',
        NODE_ENV: 'production',
        JWT_SECRET: 'x'.repeat(40),
      }).cookieSecure,
    ).toBe(false);
    expect(loadConfig({ ...base, COOKIE_SECURE: 'true' }).cookieSecure).toBe(true);
  });
});
