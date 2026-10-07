import bcrypt from 'bcrypt';

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  /** Compara contra un hash ficticio: iguala el tiempo de respuesta cuando el correo no existe. */
  verifyDummy(password: string): Promise<false>;
};

export function createPasswordHasher(cost: number): PasswordHasher {
  let dummyHash: Promise<string> | undefined;
  return {
    hash: (password) => bcrypt.hash(password, cost),
    verify: (password, hash) => bcrypt.compare(password, hash),
    async verifyDummy(password) {
      dummyHash ??= bcrypt.hash('dummy-password-for-timing', cost);
      await bcrypt.compare(password, await dummyHash);
      return false;
    },
  };
}
