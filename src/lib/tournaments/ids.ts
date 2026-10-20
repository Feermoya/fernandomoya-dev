import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Identificador opaco URL-safe para enlaces públicos (sin directorio). */
export function createPublicId(length = 22): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function createSecretToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

export function createRecoveryKey(bytes = 18): string {
  return randomBytes(bytes).toString('base64url');
}
