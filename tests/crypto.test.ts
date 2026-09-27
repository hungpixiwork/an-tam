import { describe, expect, it } from 'vitest';
import { b64urlEncode, decryptToken, encryptToken, hmacSha256Hex, randomToken, sha256Hex, timingSafeEqual } from '../worker/lib/crypto';

const KEY = b64urlEncode(new Uint8Array(32).map((_, i) => i + 1));
const OTHER_KEY = b64urlEncode(new Uint8Array(32).fill(7));
const ctx = { userId: 'u1', provider: 'google' };

describe('crypto — AES-GCM token', () => {
  it('mã hóa rồi giải mã được, đúng định dạng v1.<iv>.<ct>, IV ngẫu nhiên', async () => {
    const a = await encryptToken(KEY, 'ya29.secret-token', ctx);
    const b = await encryptToken(KEY, 'ya29.secret-token', ctx);
    expect(a).toMatch(/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
    expect(await decryptToken(KEY, a, ctx)).toBe('ya29.secret-token');
  });

  it('nhận khóa base64 chuẩn (có padding) lẫn base64url', async () => {
    const std = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i + 1)));
    const token = await encryptToken(std, 'x', ctx);
    expect(await decryptToken(KEY, token, ctx)).toBe('x');
  });

  it('bản mã bị sửa → lỗi', async () => {
    const token = await encryptToken(KEY, 'hello', ctx);
    const [v, iv, ct] = token.split('.');
    const flipped = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);
    await expect(decryptToken(KEY, `${v}.${iv}.${flipped}`, ctx)).rejects.toThrow();
    await expect(decryptToken(KEY, `${v}.${iv}`, ctx)).rejects.toThrow();
    await expect(decryptToken(KEY, `v2.${iv}.${ct}`, ctx)).rejects.toThrow();
  });

  it('sai AAD (user / provider khác) hoặc sai khóa → lỗi', async () => {
    const token = await encryptToken(KEY, 'hello', ctx);
    await expect(decryptToken(KEY, token, { userId: 'u2', provider: 'google' })).rejects.toThrow();
    await expect(decryptToken(KEY, token, { userId: 'u1', provider: 'notion' })).rejects.toThrow();
    await expect(decryptToken(OTHER_KEY, token, ctx)).rejects.toThrow();
  });

  it('khóa không đủ 32 byte → lỗi rõ ràng', async () => {
    await expect(encryptToken(b64urlEncode(new Uint8Array(16)), 'x', ctx)).rejects.toThrow(/32 byte/);
  });
});

describe('crypto — hash / HMAC / so sánh', () => {
  it('sha256Hex và hmacSha256Hex khớp vector chuẩn', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog')).toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('timingSafeEqual', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('randomToken base64url', () => {
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(randomToken()).not.toBe(randomToken());
  });
});
