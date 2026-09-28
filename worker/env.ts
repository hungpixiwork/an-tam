export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  /** Workers AI (Qwen3). Tùy chọn để test / môi trường thiếu binding vẫn chạy (dùng luật). */
  AI?: Ai;
  /** KV cho @cloudflare/workers-oauth-provider (MCP). */
  OAUTH_KV?: KVNamespace;
  /** Queue an-tam-jobs (producer). Thiếu (test) → job chạy trực tiếp. */
  JOBS?: Queue<JobMessage>;
  /** Workers Rate Limiting: đăng nhập / đăng ký (10 lần / 60 giây theo IP). */
  RL_AUTH?: RateLimit;
  /** Workers Rate Limiting: lượt chạy agent (30 lần / 60 giây theo người dùng). */
  RL_AI?: RateLimit;
  /** Workflow bàn đầu tư theo mã (worker/desk/workflow.ts). Thiếu (test) → chạy thẳng. */
  DESK_WORKFLOW?: Workflow<import('./desk/pipeline').DeskParams>;
  /** Một Durable Object Agent theo user, chỉ gọi qua Hono sau xác thực. */
  USER_COORDINATOR?: DurableObjectNamespace<import('./agents/coordinator').UserCoordinatorAgent>;

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
  /** Tài khoản nhận tiền nâng gói (VietQR): mã BIN ngân hàng, số tài khoản, tên chủ tài khoản. */
  PLAN_RECEIVER_BANK?: string;
  PLAN_RECEIVER_ACCOUNT?: string;
  PLAN_RECEIVER_NAME?: string;
}

/** Thông điệp trong Queue an-tam-jobs — worker/jobs/handlers.ts xử lý theo `type`. */
export interface JobMessage { type: 'user.refresh' | 'market.alerts' | (string & {}); userId?: string }

export interface Variables {
  userId: string;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
