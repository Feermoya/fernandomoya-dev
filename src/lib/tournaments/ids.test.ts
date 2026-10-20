import { describe, expect, it } from 'vitest';
import { createPublicId, createRecoveryKey, createSecretToken } from '@/lib/tournaments/ids';

describe('tournament ids', () => {
  it('genera public ids del largo esperado', () => {
    const id = createPublicId();
    expect(id).toHaveLength(22);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('genera secretos y recovery distintos', () => {
    const a = createSecretToken();
    const b = createSecretToken();
    const r = createRecoveryKey();
    expect(a).not.toBe(b);
    expect(r.length).toBeGreaterThan(16);
  });
});
