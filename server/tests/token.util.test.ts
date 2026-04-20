/**
 * Unit tests — Auth utilities (token.util.ts)
 *
 * Covers:
 *  - signAccessToken / signRefreshToken produce valid JWTs
 *  - verifyRefreshToken decodes payload correctly
 *  - verifyRefreshToken throws on tampered token
 *  - Algorithm is pinned to HS256 (alg: none attack prevention)
 *  - hashToken produces consistent SHA-256 hex output
 *  - Different inputs produce different hashes (collision resistance)
 */

import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../src/modules/auth/token.util';
import { AuthPayload } from '../src/types';

const samplePayload: AuthPayload = {
  id: '64f000000000000000000001',
  name: 'Token Test User',
  email: 'tokentest@test.com',
  role: 'employee',
};

describe('signAccessToken', () => {
  it('returns a non-empty JWT string', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds the correct payload fields', () => {
    const token = signAccessToken(samplePayload);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.id).toBe(samplePayload.id);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.role).toBe(samplePayload.role);
  });

  it('uses HS256 algorithm (alg: none attack prevention)', () => {
    const token = signAccessToken(samplePayload);
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString()
    );
    expect(header.alg).toBe('HS256');
  });

  it('includes an exp claim (token expires)', () => {
    const token = signAccessToken(samplePayload);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.exp).toBeDefined();
    expect(typeof decoded.exp).toBe('number');
    expect((decoded.exp as number)).toBeGreaterThan(Date.now() / 1000);
  });
});

describe('signRefreshToken', () => {
  it('uses HS256 algorithm', () => {
    const token = signRefreshToken(samplePayload);
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString()
    );
    expect(header.alg).toBe('HS256');
  });

  it('produces a different token from signAccessToken for the same payload', () => {
    // Different secrets → different signatures
    const access = signAccessToken(samplePayload);
    const refresh = signRefreshToken(samplePayload);
    expect(access).not.toBe(refresh);
  });
});

describe('verifyRefreshToken', () => {
  it('decodes a valid refresh token and returns the payload', () => {
    const token = signRefreshToken(samplePayload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(samplePayload.id);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.role).toBe(samplePayload.role);
  });

  it('throws on a tampered token', () => {
    const token = signRefreshToken(samplePayload);
    const [header, , sig] = token.split('.');
    // Swap in a crafted payload with role=admin
    const fakePayload = Buffer.from(JSON.stringify({ ...samplePayload, role: 'admin' })).toString('base64url');
    const tampered = `${header}.${fakePayload}.${sig}`;
    expect(() => verifyRefreshToken(tampered)).toThrow();
  });

  it('throws on an access token signed with the access secret (wrong secret)', () => {
    const accessToken = signAccessToken(samplePayload);
    // verifyRefreshToken uses JWT_REFRESH_SECRET — different from JWT_SECRET
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('rejects alg:none attack — unsigned token', () => {
    const payload = { ...samplePayload, iat: Math.floor(Date.now() / 1000) };
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const noneToken = `${header}.${body}.`;
    expect(() => verifyRefreshToken(noneToken)).toThrow();
  });
});

describe('hashToken', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('sometoken');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});
