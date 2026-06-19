import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, encryptSecret, decryptSecret, randomToken } from '../src/crypto';

describe('signed tokens', () => {
  it('roundtrips a payload', async () => {
    const tok = await signToken('secret', { email: 'a@b.c' }, 60);
    const payload = await verifyToken<{ email: string }>('secret', tok);
    expect(payload?.email).toBe('a@b.c');
  });

  it('rejects wrong secret, tampering and expiry', async () => {
    const tok = await signToken('secret', { x: 1 }, 60);
    expect(await verifyToken('wrong-secret', tok)).toBeNull();
    expect(await verifyToken('secret', tok + 'x')).toBeNull();
    expect(await verifyToken('secret', await signToken('secret', { x: 1 }, -1))).toBeNull();
  });

  it('randomToken is unique', () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe('at-rest encryption', () => {
  it('roundtrips a private key', async () => {
    const enc = await encryptSecret('key', '-----BEGIN PRIVATE KEY-----\nabc\n');
    expect(enc).not.toContain('BEGIN');
    expect(await decryptSecret('key', enc)).toBe('-----BEGIN PRIVATE KEY-----\nabc\n');
  });
});
