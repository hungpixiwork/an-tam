import { zValidator } from '@hono/zod-validator';
import { z, type ZodType } from 'zod';
import { ApiError } from './http';

/** zValidator trả lỗi theo envelope chung của API. */
export const body = <T extends ZodType>(schema: T) =>
  zValidator('json', schema, (result) => {
    if (!result.success) throw new ApiError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
  });

/** Tiền VND: số nguyên, không âm, tối đa 10 nghìn tỷ. */
export const money = z.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm').max(10_000_000_000_000, 'Số tiền quá lớn');
export const monthString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (YYYY-MM)');
export const dateString = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Ngày không hợp lệ (YYYY-MM-DD)');
