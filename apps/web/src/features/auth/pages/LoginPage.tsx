import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { LoginRequest } from '@tutorias/contracts/auth';
import { ApiError } from '../../../shared/api';
import type { LoginLocationState } from '../components/RequireAuth';
import { useAuth } from '../context/AuthProvider';
import styles from './LoginPage.module.css';

type FormValues = { email: string; password: string };

/** Credenciales de demo (desarrollo): las inyecta Compose desde ADMIN_EMAIL / ADMIN_PASSWORD. */
const DEMO = {
  email: (import.meta.env.VITE_DEMO_EMAIL as string | undefined) ?? '',
  password: (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? '',
};

function CopiarTexto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className={styles.demoFila}>
      <span>{etiqueta}</span>
      <code>{valor}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(valor);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
      >
        {copiado ? '¡Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'AUTH_INVALID_CREDENTIALS') return 'Correo o contraseña incorrectos.';
    if (err.code === 'AUTH_RATE_LIMITED') return err.message;
    if (err.code === 'NETWORK_ERROR')
      return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginLocationState;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(LoginRequest),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') return <Navigate to={state.from ?? '/'} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate(state.from ?? '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
        for (const d of err.details) {
          if (d.path === 'email' || d.path === 'password') setError(d.path, { message: d.message });
        }
        return;
      }
      setFormError(mensajeDeError(err));
    }
  });

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit} noValidate aria-labelledby="login-title">
        <h1 id="login-title" className={styles.title}>
          Tutorías entre pares
        </h1>
        <p className={styles.subtitle}>Inicia sesión como coordinador</p>

        {state.expired && !formError && (
          <p className={styles.notice} role="status">
            Tu sesión expiró. Vuelve a iniciar sesión.
          </p>
        )}
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}

        <label className={styles.field}>
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            aria-invalid={errors.email ? 'true' : 'false'}
            {...register('email')}
          />
          {errors.email && <small className={styles.fieldError}>{errors.email.message}</small>}
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? 'true' : 'false'}
            {...register('password')}
          />
          {errors.password && (
            <small className={styles.fieldError}>{errors.password.message}</small>
          )}
        </label>

        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        {DEMO.email && DEMO.password && (
          <section className={styles.demo} aria-label="Credenciales de demo">
            <strong>Credenciales de demo</strong>
            <CopiarTexto etiqueta="Correo" valor={DEMO.email} />
            <CopiarTexto etiqueta="Contraseña" valor={DEMO.password} />
            <button
              type="button"
              className={styles.demoUsar}
              onClick={() => {
                setValue('email', DEMO.email);
                setValue('password', DEMO.password);
              }}
            >
              Rellenar el formulario
            </button>
          </section>
        )}
      </form>
    </main>
  );
}
