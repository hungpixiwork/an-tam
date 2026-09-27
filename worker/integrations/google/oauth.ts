// Google OAuth 2.0 + PKCE (S256). Scope tối thiểu cho Lịch AI:
//   calendar.events.readonly — đọc lịch chính để hiện cùng kế hoạch và tìm khung trống
//   calendar.app.created     — chỉ ghi vào lịch phụ "An Tâm" do ứng dụng tạo (dễ thu hồi, không đụng lịch chính)

import type { Env } from '../../env';
import { b64urlEncode } from '../../lib/crypto';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

/** Đủ cấu hình để kết nối Google (client + khóa mã hóa token). */
export const googleConfigured = (env: Env): boolean => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENC_KEY);

export const redirectUri = (env: Env, requestUrl: string) => `${(env.APP_ORIGIN || new URL(requestUrl).origin).replace(/\/$/, '')}/api/integrations/google/callback`;

export async function pkceChallenge(verifier: string): Promise<string> {
  return b64urlEncode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

export function authUrl(env: Env, opts: { state: string; challenge: string; redirectUri: string }): string {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${q}`;
}

export interface GoogleTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export class GoogleAuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

async function tokenRequest(params: Record<string, string>): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const json = (await res.json().catch(() => ({}))) as Partial<GoogleTokens> & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new GoogleAuthError(json.error ?? `http_${res.status}`, json.error_description ?? 'Google từ chối yêu cầu cấp quyền');
  return json as GoogleTokens;
}

export const exchangeCode = (env: Env, code: string, verifier: string, redirect: string) =>
  tokenRequest({ client_id: env.GOOGLE_CLIENT_ID ?? '', client_secret: env.GOOGLE_CLIENT_SECRET ?? '', code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });

export const refreshAccessToken = (env: Env, refreshToken: string) =>
  tokenRequest({ client_id: env.GOOGLE_CLIENT_ID ?? '', client_secret: env.GOOGLE_CLIENT_SECRET ?? '', refresh_token: refreshToken, grant_type: 'refresh_token' });

/** Thu hồi token phía Google (bỏ qua lỗi — token có thể đã hết hạn / bị thu hồi). */
export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) }).catch(() => undefined);
}
