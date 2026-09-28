// Chặn thao tác dồn dập bằng Workers Rate Limiting. Thiếu binding (test / mock env) → cho qua.

import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/http';

export const RATE_LIMIT_MESSAGE = 'Bạn thao tác hơi nhanh, thử lại sau ít phút.';

type Binding = 'RL_AUTH' | 'RL_AI';

export const clientIp = (c: Context<AppEnv>) => c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

/** `key` chọn khóa đếm (IP khi chưa đăng nhập, userId khi đã đăng nhập). Chỉ áp cho `methods`. */
export const rateLimit = (binding: Binding, key: (c: Context<AppEnv>) => string, methods = ['POST']): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const rl = c.env[binding];
    if (rl && methods.includes(c.req.method)) {
      const { success } = await rl.limit({ key: `${binding}:${key(c)}` });
      if (!success) throw new ApiError(429, 'rate_limited', RATE_LIMIT_MESSAGE);
    }
    await next();
  };
