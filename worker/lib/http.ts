import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const ok = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) => c.json({ success: true as const, data }, status);

export class ApiError extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(status, { message });
  }
}

export const notFound = (what = 'Không tìm thấy dữ liệu') => new ApiError(404, 'not_found', what);
export const unauthorized = () => new ApiError(401, 'unauthorized', 'Bạn cần đăng nhập để tiếp tục');
