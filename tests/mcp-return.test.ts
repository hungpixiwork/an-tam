import { describe, expect, it } from 'vitest';
import { mcpReturnPath } from '../client/src/features/auth/mcpReturn';

describe('MCP login return', () => {
  const origin = 'https://an-tam.example';

  it('giữ nguyên yêu cầu OAuth nội bộ sau đăng nhập', () => {
    const next = '/authorize?client_id=abc&state=s%2B1';
    expect(mcpReturnPath(`?next=${encodeURIComponent(next)}`, origin)).toBe(next);
  });

  it('không nhận URL ngoài origin hoặc route khác', () => {
    for (const next of ['https://evil.example/', '//evil.example/', '/\\evil.example/', '/api/me', '/dang-nhap']) {
      expect(mcpReturnPath(`?next=${encodeURIComponent(next)}`, origin)).toBeNull();
    }
  });
});
