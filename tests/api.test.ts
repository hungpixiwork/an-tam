import { describe, it, expect } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/env';

const mockEnv: Env = {
  DB: {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ meta: { changes: 0 } }),
      }),
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ meta: { changes: 0 } }),
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database,
};

const mockAuthedEnv: Env = {
  DB: {
    prepare: (query: string) => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        first: async () => {
          if (query.includes('FROM sessions')) {
            return { user_id: 'mock-user-123' };
          }
          return null;
        },
        run: async () => ({ meta: { changes: 0 } }),
      }),
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ meta: { changes: 0 } }),
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database,
};

describe('Worker API & Error Handling Audit', () => {
  it('GET /api/version trả về thông tin phiên bản 200 JSON cho chunk-load recovery', async () => {
    const res = await worker.fetch(new Request('http://localhost/api/version'), mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.version).toBe('1.0.0');
    expect(body.buildTime).toBeDefined();
    expect(body.data).toEqual({
      version: '1.0.0',
      buildTime: body.buildTime,
    });
  });

  it('Kiểm tra 401 Unauthorized trả về JSON chuẩn khi không có session cookie', async () => {
    const endpoints = [
      '/api/overview',
      '/api/transactions',
      '/api/goals/summary',
      '/api/earn',
      '/api/simulations/runs',
      '/api/onboarding',
      '/api/settings',
      '/api/auth/me',
    ];

    for (const ep of endpoints) {
      const res = await worker.fetch(new Request(`http://localhost${ep}`), mockEnv);
      expect(res.status).toBe(401);
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('unauthorized');
    }
  });

  it('Kiểm tra 404 Not Found trả về JSON chuẩn cho route không tồn tại', async () => {
    // 1. Route không khớp route nào (ngoài /api/*)
    const resPublic = await worker.fetch(new Request('http://localhost/khong-ton-tai'), mockEnv);
    expect(resPublic.status).toBe(404);
    expect(resPublic.headers.get('content-type')).toContain('application/json');
    const bodyPublic = (await resPublic.json()) as any;
    expect(bodyPublic.success).toBe(false);
    expect(bodyPublic.error?.code).toBe('not_found');

    // 2. Route dưới /api/* khi đã đăng nhập nhưng endpoint không tồn tại
    const resAuthed = await worker.fetch(
      new Request('http://localhost/api/khong-ton-tai', {
        headers: { Cookie: 'at_session=mock-token' },
      }),
      mockAuthedEnv,
    );
    expect(resAuthed.status).toBe(404);
    expect(resAuthed.headers.get('content-type')).toContain('application/json');
    const bodyAuthed = (await resAuthed.json()) as any;
    expect(bodyAuthed.success).toBe(false);
    expect(bodyAuthed.error?.code).toBe('not_found');
  });

  it('Kiểm tra body malformed JSON trả về lỗi 400 JSON chuẩn thay vì HTML', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{',
      }),
      mockEnv,
    );
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  describe('Static Assets & SPA Fallback Prevention', () => {
    it('Chặn SPA fallback nuốt file /assets/* không tồn tại thành 200 text/html', async () => {
      // Giả lập Cloudflare Assets SPA fallback trả về 200 text/html (index.html)
      const mockEnvWithSpaFallbackHtml: Env = {
        ...mockEnv,
        ASSETS: {
          fetch: async () =>
            new Response('<!DOCTYPE html><html><head></head><body>SPA Root</body></html>', {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }),
        } as unknown as Fetcher,
      };

      const res = await worker.fetch(new Request('http://localhost/assets/missing-chunk-123.js'), mockEnvWithSpaFallbackHtml);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('text/plain');
      expect(res.headers.get('cache-control')).toContain('no-cache');
      expect(res.headers.get('cache-control')).toContain('no-store');
      const text = await res.text();
      expect(text).not.toContain('<!DOCTYPE html>');
      expect(text).toBe('Not Found');
    });

    it('Xử lý đúng khi ASSETS trả về 404 cho asset không tồn tại', async () => {
      const mockEnvWithAssets404: Env = {
        ...mockEnv,
        ASSETS: {
          fetch: async () => new Response('Not Found', { status: 404 }),
        } as unknown as Fetcher,
      };

      const res = await worker.fetch(new Request('http://localhost/assets/non-existent.css'), mockEnvWithAssets404);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('text/plain');
      expect(res.headers.get('cache-control')).toContain('no-cache');
      expect(res.headers.get('cache-control')).toContain('no-store');
    });

    it('Cho phép tải file tĩnh hợp lệ khi asset tồn tại', async () => {
      const mockEnvWithValidAsset: Env = {
        ...mockEnv,
        ASSETS: {
          fetch: async () =>
            new Response('console.log("valid-module");', {
              status: 200,
              headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            }),
        } as unknown as Fetcher,
      };

      const res = await worker.fetch(new Request('http://localhost/assets/main-hash123.js'), mockEnvWithValidAsset);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(await res.text()).toBe('console.log("valid-module");');
    });

    it('Từ chối method không hợp lệ cho static asset (POST /assets/* -> 405)', async () => {
      const res = await worker.fetch(
        new Request('http://localhost/assets/some-file.js', { method: 'POST' }),
        mockEnv,
      );
      expect(res.status).toBe(405);
      expect(res.headers.get('content-type')).toContain('text/plain');
    });
  });
});
