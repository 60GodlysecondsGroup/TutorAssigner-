import { AuthErrorCode } from '@tutorias/contracts/auth';
import { AppError } from '../../platform/http';

export const credencialesInvalidas = () =>
  new AppError(AuthErrorCode.AUTH_INVALID_CREDENTIALS, 401, 'Correo o contraseña incorrectos');

export const demasiadosIntentos = () =>
  new AppError(
    AuthErrorCode.AUTH_RATE_LIMITED,
    429,
    'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos',
  );
