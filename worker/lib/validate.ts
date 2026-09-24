import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';
import { ApiError } from './http';

/** zValidator trả lỗi theo envelope chung của API. */
export const body = <T extends ZodType>(schema: T) =>
  zValidator('json', schema, (result) => {
    if (!result.success) throw new ApiError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  });
