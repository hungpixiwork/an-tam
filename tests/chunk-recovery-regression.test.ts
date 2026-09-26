import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/env';
import {
  isChunkLoadError,
  triggerChunkReloadGuard,
  clearChunkReloadGuard,
  retryDynamicImport,
  checkForNewVersion,
  RELOAD_GUARD_PREFIX,
  RELOAD_COOLDOWN_MS,
} from '../client/src/lib/chunkRecovery';

// Mock storage dùng cho giả lập sessionStorage của trình duyệt
class MockSessionStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe('Regression Test: Đang mở phiên bản cũ -> deploy phiên bản mới -> tiếp tục click sang lazy route', () => {
  const originalWindow = (globalThis as any).window;
  let mockStorage: MockSessionStorage;
  let reloadCount: number;
  let mockWindow: any;

  beforeEach(() => {
    mockStorage = new MockSessionStorage();
    reloadCount = 0;

    // Giả lập môi trường trình duyệt client
    mockWindow = {
      location: {
        pathname: '/thu-chi',
        href: 'http://localhost/thu-chi',
        reload: vi.fn(() => {
          reloadCount++;
        }),
      },
      sessionStorage: mockStorage,
    };

    (globalThis as any).window = mockWindow;
    (globalThis as any).sessionStorage = mockStorage;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('1. Cloudflare Worker HTTP Response cho chunk tĩnh (Yêu cầu 3)', () => {
    it('Chunk cũ không tồn tại -> Worker PHẢI trả về 404 sạch sẽ, tuyệt đối KHÔNG trả về 200 index.html', async () => {
      // Giả lập Cloudflare ASSETS binding khi request asset cũ đã bị xóa khỏi bản build mới
      const mockEnvWithAssets: Env = {
        DB: {} as unknown as D1Database,
        ASSETS: {
          fetch: async () =>
            new Response('Not found in assets directory', {
              status: 404,
              headers: { 'Content-Type': 'text/plain' },
            }),
        } as unknown as Fetcher,
      };

      const req = new Request('http://localhost/assets/LedgerPage-oldhash123.js', {
        method: 'GET',
        headers: { 'Sec-Fetch-Dest': 'script' },
      });

      const res = await worker.fetch(req, mockEnvWithAssets);

      // Phản hồi phải là 404 sạch sẽ
      expect(res.status).toBe(404);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('text/html');
      expect(contentType).toContain('text/plain');

      const body = await res.text();
      expect(body).toBe('Not Found');
      expect(res.headers.get('cache-control')).toContain('no-store');
    });

    it('Chặn triệt để SPA Fallback: Nếu ASSETS ngầm fallback trả về 200 text/html cho file .js -> Worker phải biến thành 404', async () => {
      // Giả lập tình huống lỗi kinh điển: Static asset binding bị cấu hình nhầm fallback index.html cho mọi 404
      const mockBuggySpaAssetsEnv: Env = {
        DB: {} as unknown as D1Database,
        ASSETS: {
          fetch: async () =>
            new Response('<!DOCTYPE html><html><head><title>An Tâm</title></head><body><div id="root"></div></body></html>', {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }),
        } as unknown as Fetcher,
      };

      const req = new Request('http://localhost/assets/LedgerPage-oldhash123.js', {
        method: 'GET',
      });

      const res = await worker.fetch(req, mockBuggySpaAssetsEnv);

      // Worker PHẢI phát hiện text/html và chuyển thành 404 text/plain để ngăn browser SyntaxError "<"
      expect(res.status).toBe(404);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).not.toContain('text/html');
      expect(contentType).toContain('text/plain');

      const body = await res.text();
      expect(body).toBe('Not Found');
    });

    it('Chunk mới hợp lệ -> Worker trả về 200 OK với đúng JavaScript content type', async () => {
      const mockValidAssetsEnv: Env = {
        DB: {} as unknown as D1Database,
        ASSETS: {
          fetch: async () =>
            new Response('export default function LedgerPage() { return "Ledger v2"; }', {
              status: 200,
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            }),
        } as unknown as Fetcher,
      };

      const req = new Request('http://localhost/assets/LedgerPage-newhash456.js', {
        method: 'GET',
      });

      const res = await worker.fetch(req, mockValidAssetsEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      const body = await res.text();
      expect(body).toContain('Ledger v2');
    });

    it('Phương thức không hợp lệ trên /assets/* (POST/PUT/DELETE) -> Worker trả về 405 Method Not Allowed', async () => {
      const req = new Request('http://localhost/assets/LedgerPage-oldhash123.js', {
        method: 'POST',
      });

      const res = await worker.fetch(req, { DB: {} as D1Database });
      expect(res.status).toBe(405);
      expect(await res.text()).toBe('Method Not Allowed');
    });

    it('Endpoint /api/version luôn trả về 200 JSON chứa thông tin phiên bản phục vụ chunk recovery', async () => {
      const req = new Request('http://localhost/api/version', { method: 'GET' });
      const res = await worker.fetch(req, { DB: {} as D1Database });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.version).toBeDefined();
      expect(body.buildTime).toBeDefined();
    });
  });

  describe('2. Phân loại lỗi nạp chunk (isChunkLoadError)', () => {
    it('Nhận diện chính xác các biến thể lỗi nạp chunk của trình duyệt và Vite', () => {
      expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: http://localhost/assets/LedgerPage-oldhash.js'))).toBe(true);
      expect(isChunkLoadError(new Error('error loading dynamically imported module: /assets/LedgerPage-oldhash.js'))).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
      expect(isChunkLoadError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true);
      expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Chunk 123 failed' })).toBe(true);
    });

    it('Từ chối các lỗi runtime/logic thông thường để không kích hoạt reload nhầm', () => {
      expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'balance')"))).toBe(false);
      expect(isChunkLoadError(new SyntaxError("Unexpected token '}'"))).toBe(false);
      expect(isChunkLoadError(new ReferenceError('variable is not defined'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });
  });

  describe('3. Phát hiện phiên bản mới từ máy chủ (checkForNewVersion)', () => {
    it('Phát hiện máy chủ đã deploy phiên bản mới khác với phiên bản client hiện tại', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, version: '1.0.1', buildTime: '2026-09-26T12:00:00Z' }),
      } as Response);

      const result = await checkForNewVersion('1.0.0');
      expect(result.hasUpdate).toBe(true);
      expect(result.serverVersion).toBe('1.0.1');
    });

    it('Xác định không có cập nhật nếu máy chủ cùng phiên bản với client', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, version: '1.0.0', buildTime: '2026-09-26T00:00:00Z' }),
      } as Response);

      const result = await checkForNewVersion('1.0.0');
      expect(result.hasUpdate).toBe(false);
      expect(result.serverVersion).toBe('1.0.0');
    });

    it('Fallback sang static version.json nếu /api/version lỗi mạng', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/version')) {
          return Promise.reject(new Error('API Down'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ version: '1.0.2', buildTime: '2026-09-26T14:00:00Z' }),
        } as Response);
      });

      const result = await checkForNewVersion('1.0.0');
      expect(result.hasUpdate).toBe(true);
      expect(result.serverVersion).toBe('1.0.2');
    });
  });

  describe('4. Cơ chế Reload Guard chống Reload Loop vô hạn (triggerChunkReloadGuard)', () => {
    it('Lần đầu tiên lỗi chunk: Cho phép reload an toàn 1 lần và ghi nhận timestamp vào sessionStorage', () => {
      const allowed = triggerChunkReloadGuard('/thu-chi');
      expect(allowed).toBe(true);

      const saved = mockStorage.getItem(`${RELOAD_GUARD_PREFIX}_thu-chi`);
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.route).toBe('/thu-chi');
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('Lần lỗi thứ 2 liên tiếp trong vòng 10 giây (cooldown): BỊ CHẶN LẬP TỨC để chống vòng lặp vô tận', () => {
      // Lần 1: Cho phép
      expect(triggerChunkReloadGuard('/thu-chi')).toBe(true);

      // Lần 2 (ngay sau đó, ví dụ server vẫn lỗi hoặc mạng đứt): Bị chặn
      expect(triggerChunkReloadGuard('/thu-chi')).toBe(false);
    });

    it('Cách ly cờ reload theo từng route riêng biệt', () => {
      // Route /thu-chi đã reload
      expect(triggerChunkReloadGuard('/thu-chi')).toBe(true);
      expect(triggerChunkReloadGuard('/thu-chi')).toBe(false);

      // Route /danh-muc vẫn độc lập và được phép reload lần đầu
      expect(triggerChunkReloadGuard('/danh-muc')).toBe(true);
      expect(triggerChunkReloadGuard('/danh-muc')).toBe(false);
    });

    it('Sau khi hết thời gian cooldown (10 giây): Được phép reload lại nếu phát sinh lỗi mới', () => {
      const now = Date.now();
      // Giả lập bản ghi đã lưu cách đây 11 giây
      mockStorage.setItem(
        `${RELOAD_GUARD_PREFIX}_thu-chi`,
        JSON.stringify({ timestamp: now - (RELOAD_COOLDOWN_MS + 1000), route: '/thu-chi' }),
      );

      // Hết cooldown -> Được phép reload lại
      expect(triggerChunkReloadGuard('/thu-chi')).toBe(true);
    });

    it('clearChunkReloadGuard dọn sạch cờ reload khi nạp route thành công', () => {
      triggerChunkReloadGuard('/thu-chi');
      expect(mockStorage.getItem(`${RELOAD_GUARD_PREFIX}_thu-chi`)).not.toBeNull();

      clearChunkReloadGuard('/thu-chi');
      expect(mockStorage.getItem(`${RELOAD_GUARD_PREFIX}_thu-chi`)).toBeNull();
    });
  });

  describe('5. Mô phỏng trọn vẹn kịch bản người dùng (End-to-End Simulation)', () => {
    it('KỊCH BẢN THÀNH CÔNG: Mở v1 -> Deploy v2 -> Click sang lazy route -> Reload an toàn 1 lần -> Hiển thị đúng v2', async () => {
      // BƯỚC 1: Client v1 đang chạy trên route '/'
      mockWindow.location.pathname = '/thu-chi';

      let attempt = 0;
      const MockNewLedgerComponent = () => 'Ledger Page v2';

      // Giả lập dynamic import factory:
      // Lần nạp 1: Client v1 gọi hash cũ -> Bị 404 (ném lỗi)
      // Lần nạp 2 (sau reload): Client v2 gọi hash mới -> Thành công
      const dynamicImportFactory = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Failed to fetch dynamically imported module: http://localhost/assets/LedgerPage-oldhash.js');
        }
        return { default: MockNewLedgerComponent };
      });

      // Giả lập server trả về version mới khi client kiểm tra
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, version: '1.0.1', buildTime: '2026-09-26T12:00:00Z' }),
      } as Response);

      // BƯỚC 2: Người dùng click vào tab /thu-chi -> Kích hoạt retryDynamicImport
      // Chạy lần 1 (trước reload): factory ném lỗi chunk cũ -> kích hoạt reload 1 lần
      const firstLoadPromise = retryDynamicImport(dynamicImportFactory, 0);

      // Chờ microtasks hoàn tất
      await new Promise((r) => setTimeout(r, 50));

      // Kiểm tra: window.location.reload PHẢI được gọi đúng 1 lần
      expect(mockWindow.location.reload).toHaveBeenCalledTimes(1);
      expect(reloadCount).toBe(1);

      // Promise của lần 1 sẽ pending vĩnh viễn để trình duyệt thực hiện hard reload
      let firstResolved = false;
      firstLoadPromise.then(() => {
        firstResolved = true;
      });
      await new Promise((r) => setTimeout(r, 20));
      expect(firstResolved).toBe(false);

      // BƯỚC 3: Trình duyệt reload xong, nạp phiên bản v2 mới
      // Lần này dynamic import tải đúng hash mới thành công
      const secondLoadResult = await retryDynamicImport(dynamicImportFactory, 0);

      expect(secondLoadResult.default).toBe(MockNewLedgerComponent);
      // Cờ reload phải được dọn dẹp sạch sẽ
      expect(mockStorage.getItem(`${RELOAD_GUARD_PREFIX}_thu_chi`)).toBeNull();
    });

    it('KỊCH BẢN PHÒNG CHỐNG VÒNG LẶP: Lỗi dai dẳng (mạng hỏng vĩnh viễn) -> Không bị lặp vô tận, ném lỗi ra ErrorBoundary', async () => {
      mockWindow.location.pathname = '/thu-chi';

      // Giả lập chunk bị hỏng vĩnh viễn
      const alwaysFailingFactory = vi.fn().mockImplementation(async () => {
        throw new Error('Failed to fetch dynamically imported module: http://localhost/assets/BrokenChunk.js');
      });

      // Lần 1: Thất bại -> Reload lần 1
      retryDynamicImport(alwaysFailingFactory, 0);
      await new Promise((r) => setTimeout(r, 50));
      expect(mockWindow.location.reload).toHaveBeenCalledTimes(1);

      // Giả lập sau reload, tải lại vẫn bị lỗi chunk (trong vòng 10 giây cooldown)
      let caughtError: unknown = null;
      try {
        await retryDynamicImport(alwaysFailingFactory, 0);
      } catch (err) {
        caughtError = err;
      }

      // Kiểm tra: KHÔNG ĐƯỢC RELOAD LẦN 2! window.location.reload vẫn chỉ được gọi đúng 1 lần
      expect(mockWindow.location.reload).toHaveBeenCalledTimes(1);

      // Lỗi PHẢI được ném ra để RouteErrorBoundary bắt và render UI thông báo, không crash trình duyệt
      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toContain('BrokenChunk.js');
    });
  });
});
