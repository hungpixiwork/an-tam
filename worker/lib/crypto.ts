// Mã hóa token tích hợp (AES-256-GCM, WebCrypto) + tiện ích hash / HMAC / so sánh an toàn.
// Định dạng bản mã: `v1.<ivB64url>.<ctB64url>`; AAD = `${userId}:${provider}` — bản mã chép sang user / provider khác sẽ không giải được.

const enc = new TextEncoder();
const dec = new TextDecoder();

const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Nhận cả base64 chuẩn và base64url. */
export function b64Decode(s: string): Uint8Array<ArrayBuffer> {
  const norm = s.trim().replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(msg: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(msg)));
}

export async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

/** So sánh chuỗi không rò rỉ thời gian theo vị trí ký tự khác nhau đầu tiên. */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Chuỗi ngẫu nhiên base64url (state OAuth, PKCE verifier...). */
export const randomToken = (bytes = 32): string => b64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));

// Cache CryptoKey theo secret — import lại mỗi request tốn thời gian.
const keyCache = new Map<string, Promise<CryptoKey>>();

function aesKey(secretB64: string): Promise<CryptoKey> {
  let key = keyCache.get(secretB64);
  if (!key) {
    const raw = b64Decode(secretB64);
    if (raw.length !== 32) throw new Error('TOKEN_ENC_KEY phải là 32 byte base64 (AES-256)');
    key = crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    keyCache.set(secretB64, key);
  }
  return key;
}

export interface TokenContext {
  userId: string;
  provider: string;
}

const aad = (ctx: TokenContext) => enc.encode(`${ctx.userId}:${ctx.provider}`);

export async function encryptToken(secretB64: string, plaintext: string, ctx: TokenContext): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(ctx) }, await aesKey(secretB64), enc.encode(plaintext));
  return `v1.${b64urlEncode(iv)}.${b64urlEncode(new Uint8Array(ct))}`;
}

/** Ném lỗi nếu sai định dạng, sai khóa, sai AAD hoặc bản mã bị sửa. */
export async function decryptToken(secretB64: string, token: string, ctx: TokenContext): Promise<string> {
  const [version, ivPart, ctPart, ...rest] = token.split('.');
  if (version !== 'v1' || !ivPart || !ctPart || rest.length) throw new Error('Bản mã không đúng định dạng');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64Decode(ivPart), additionalData: aad(ctx) },
    await aesKey(secretB64),
    b64Decode(ctPart),
  );
  return dec.decode(pt);
}
