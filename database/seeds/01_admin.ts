import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

// Seed base (Dev 1, todos los entornos): coordinador inicial desde ADMIN_EMAIL / ADMIN_PASSWORD.
// Idempotente: si el correo ya existe no toca nada (no restablece la contraseña).
// El costo de bcrypt es el mismo que usa el API (`BCRYPT_COST`, por defecto 12).

export async function seed(knex: Knex): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE?.trim() || 'Coordinación de Tutorías';

  if (!email || !password) {
    console.warn(
      '[seed 01_admin] ADMIN_EMAIL o ADMIN_PASSWORD no definidos: se omite el coordinador inicial',
    );
    return;
  }

  const existente = await knex('usuarios').whereRaw('lower(email) = ?', [email]).first('id');
  if (existente) return;

  const cost = Number.parseInt(process.env.BCRYPT_COST ?? '12', 10);
  const passwordHash = await bcrypt.hash(password, cost);
  await knex('usuarios').insert({ email, nombre, password_hash: passwordHash, rol: 'COORDINADOR' });
  console.info(`[seed 01_admin] coordinador inicial creado: ${email}`);
}
