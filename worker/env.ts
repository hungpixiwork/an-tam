export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  /** Workers AI (Qwen3) — binding thêm ở wave AI. */
  AI?: Ai;
  /** KV cho @cloudflare/workers-oauth-provider (MCP) — binding thêm ở wave MCP. */
  OAUTH_KV?: KVNamespace;

  // vars (wrangler.jsonc)
  /** Origin công khai, ví dụ https://antam.example — dùng cho redirect OAuth. */
  APP_ORIGIN?: string;
  /** 'rules' | 'workers-ai' — bộ phân loại ý định cho agent. */
  INTENT_PROVIDER?: string;

  // secrets (wrangler secret put / .dev.vars)
  /** 32 byte base64 — AES-256-GCM cho token tích hợp (worker/lib/crypto.ts). */
  TOKEN_ENC_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NOTION_CLIENT_ID?: string;
  NOTION_CLIENT_SECRET?: string;
  SEPAY_WEBHOOK_KEY?: string;
  SEPAY_API_TOKEN?: string;
  /** Khóa HMAC cho chuỗi hash audit_log (worker/lib/audit.ts). */
  AUDIT_HASH_SALT?: string;
}

export interface Variables {
  userId: string;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
