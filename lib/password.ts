import bcrypt from "bcryptjs";

/** Costul bcrypt — un singur loc, ca să fie identic peste tot. */
const ROUNDS = 12;

/** Lungimea minimă acceptată la crearea sau schimbarea unei parole. */
export const MIN_PASSWORD_LENGTH = 8;

/** Transformă parola în hash. Nicio parolă nu se salvează în clar. */
export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, ROUNDS);
}

/** Verifică o parolă introdusă față de hash-ul salvat. */
export async function verifyPassword(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
