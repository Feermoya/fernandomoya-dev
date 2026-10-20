import { describe, expect, it } from 'vitest';
import {
  createAdminSessionToken,
  hashSecret,
  verifyAdminSessionToken,
  verifySecret,
} from '@/lib/tournaments/secrets';

describe('hashSecret / verifySecret', () => {
  it('verifica el secreto original y rechaza otro', () => {
    const raw = 'super-secret-token-value-123';
    const stored = hashSecret(raw);
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifySecret(raw, stored)).toBe(true);
    expect(verifySecret('otra-cosa', stored)).toBe(false);
  });
});

describe('admin session token', () => {
  it('firma y valida payload con group id y version', () => {
    // Requiere secreto derivado; en test sin env usa fallback vacío → create puede fallar.
    // Si no hay secret configurado, saltamos con un mock vía env.
    const prev = process.env.TOURNAMENTS_SESSION_SECRET;
    process.env.TOURNAMENTS_SESSION_SECRET = 'test-session-secret-for-tournaments';

    try {
      const token = createAdminSessionToken('group-uuid-1', 2);
      const payload = verifyAdminSessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.gid).toBe('group-uuid-1');
      expect(payload?.ver).toBe(2);
      expect(verifyAdminSessionToken('invalid')).toBeNull();
      expect(verifyAdminSessionToken(token + 'x')).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.TOURNAMENTS_SESSION_SECRET;
      else process.env.TOURNAMENTS_SESSION_SECRET = prev;
    }
  });
});
