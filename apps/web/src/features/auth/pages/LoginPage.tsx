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
      </form>
    </main>
  );
}
