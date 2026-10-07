/**
 * Configuración del API validada con Zod al arrancar. Si algo falta o es inválido, el proceso
 * no arranca. En producción `JWT_SECRET` es obligatorio (≥ 32 caracteres) y nunca existe un
 * flag que desactive la autenticación.
 */
import { z } from 'zod';

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me-0000';

const LogLevel = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: LogLevel.default('info'),
    DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL es obligatorio' }),
    JWT_SECRET: z.string().optional(),
    /** Duración de la sesión en segundos (por defecto 8 h). */
    SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(7 * 24 * 3600)
      .default(8 * 3600),
    COOKIE_SECURE: z.stringbool().optional(),
    BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
    /** Intentos de login fallidos permitidos por IP en cada ventana de 15 minutos. */
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
    /** Número de proxies de confianza delante del API (0 = ninguno). Necesario para la IP real. */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    BODY_LIMIT: z.string().default('100kb'),
    /** Si se define, el API sirve el build estático de Vite (imagen de producción). */
    WEB_DIST_DIR: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET es obligatorio en producción',
      });
    } else if (env.JWT_SECRET.length < 32 || env.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET de producción debe tener al menos 32 caracteres y no ser el de desarrollo',
      });
    }
  });

export type Config = {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  logLevel: z.infer<typeof LogLevel>;
  databaseUrl: string;
  jwtSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
  bcryptCost: number;
  loginRateLimitMax: number;
  trustProxy: number;
  bodyLimit: string;
  webDistDir?: string;
};

export class ConfigError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Configuración inválida:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/** Lee y valida la configuración. Los mensajes nunca incluyen los valores (pueden ser secretos). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === 'production';
  return {
    env: e.NODE_ENV,
    isProduction,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET || DEV_JWT_SECRET,
    sessionTtlSeconds: e.SESSION_TTL_SECONDS,
    cookieSecure: e.COOKIE_SECURE ?? isProduction,
    bcryptCost: e.BCRYPT_COST,
    loginRateLimitMax: e.LOGIN_RATE_LIMIT_MAX,
    trustProxy: e.TRUST_PROXY,
    bodyLimit: e.BODY_LIMIT,
    webDistDir: e.WEB_DIST_DIR || undefined,
  };
}
