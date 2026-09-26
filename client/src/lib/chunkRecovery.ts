/**
 * Quản lý phục hồi lỗi nạp chunk (Chunk Load Recovery) & Dynamic Import Retry
 * Bảo vệ chống lại Reload Loop vô tận khi deploy phiên bản mới hoặc mạng chập chờn.
 */

export const RELOAD_GUARD_PREFIX = 'an_tam_chunk_reload_';
export const RELOAD_COOLDOWN_MS = 10_000; // TTL 10 giây chống reload loop

export interface ReloadRecord {
  timestamp: number;
  route: string;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  serverVersion?: string;
  buildTime?: string;
}

/**
 * Kiểm tra xem server đã deploy phiên bản mới hay chưa qua /api/version hoặc /version.json
 */
export async function checkForNewVersion(currentVersion = '1.0.0'): Promise<VersionCheckResult> {
  try {
    const res = await fetch(`/api/version?_t=${Date.now()}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      const serverVersion = data.version || data.data?.version;
      const buildTime = data.buildTime || data.data?.buildTime;
      const hasUpdate = Boolean(serverVersion && serverVersion !== currentVersion);
      return { hasUpdate, serverVersion, buildTime };
    }
  } catch {
    // network error
  }

  try {
    const staticRes = await fetch(`/version.json?_t=${Date.now()}`);
    if (staticRes.ok) {
      const data = (await staticRes.json()) as any;
      const hasUpdate = Boolean(data.version && data.version !== currentVersion);
      return { hasUpdate, serverVersion: data.version, buildTime: data.buildTime };
    }
  } catch {
    // network error
  }

  return { hasUpdate: false };
}

/**
 * Kiểm tra xem lỗi có phải do nạp chunk / mạng / dynamic import thất bại hay không.
 * Tránh nhầm lẫn với các lỗi runtime bug (SyntaxError, TypeError bên trong component).
 */
export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d\w]+ failed/i.test(message) ||
    /NetworkError/i.test(message) ||
    (err as Record<string, unknown>)?.name === 'ChunkLoadError'
  );
}

const getWindow = (): any =>
  typeof globalThis !== 'undefined' && 'window' in globalThis ? (globalThis as any).window : undefined;

const getSessionStorage = (): any => {
  const win = getWindow();
  return win?.sessionStorage ?? (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis ? (globalThis as any).sessionStorage : undefined);
};

/**
 * Trích xuất URL chunk bị lỗi từ error message (nếu trình duyệt có cung cấp).
 */
export function extractChunkUrl(err: unknown): string | null {
  if (!err) return null;
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/(https?:\/\/[^\s'")]+|\/[a-zA-Z0-9_\-./]+\.js[^\s'") ]*)/);
  return match ? match[1] : null;
}

/**
 * Tạo storage key dựa trên route pathname để bảo vệ từng route độc lập
 */
function getStorageKey(route = getWindow()?.location?.pathname ?? '/'): string {
  const safeRoute = route.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${RELOAD_GUARD_PREFIX}${safeRoute}`;
}

/**
 * Guard chống reload loop:
 * - Trả về `true` nếu ĐƯỢC PHÉP reload (chưa từng reload trong 10s qua cho route này).
 * - Trả về `false` nếu BỊ CHẶN (đã reload trong 10s qua, tránh loop sập tab).
 */
export function triggerChunkReloadGuard(route = getWindow()?.location?.pathname ?? '/'): boolean {
  const storage = getSessionStorage();
  if (!storage) return true;
  try {
    const key = getStorageKey(route);
    const raw = storage.getItem(key);
    const now = Date.now();

    if (raw) {
      const data: ReloadRecord = JSON.parse(raw);
      // Nếu đã reload trong vòng 10 giây -> Chặn loop lập tức!
      if (now - data.timestamp < RELOAD_COOLDOWN_MS) {
        return false;
      }
    }

    // Đánh dấu thời điểm reload
    storage.setItem(key, JSON.stringify({ timestamp: now, route }));
    return true;
  } catch {
    // Trường hợp sessionStorage bị vô hiệu hóa (Private mode, QuotaExceededError)
    return true;
  }
}

/**
 * Dọn dẹp cờ reload khi route nạp thành công
 */
export function clearChunkReloadGuard(route = getWindow()?.location?.pathname ?? '/'): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const key = getStorageKey(route);
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Dynamic import wrapper hỗ trợ retry in-memory kèm cache-busting (?t=timestamp)
 * trước khi quyết định reload toàn bộ trang.
 */
export async function retryDynamicImport<T>(
  factory: () => Promise<{ default: T }>,
  retriesLeft = 1,
  delayMs = 400
): Promise<{ default: T }> {
  try {
    const component = await factory();
    // Tải thành công -> Dọn dẹp cờ reload của route hiện tại
    clearChunkReloadGuard();
    return component;
  } catch (err: unknown) {
    // Nếu KHÔNG PHẢI lỗi nạp chunk (lỗi logic code component), ném lỗi ngay để ErrorBoundary xử lý
    if (!isChunkLoadError(err)) {
      throw err;
    }

    let lastError: unknown = err;

    // Bước 1: Thử retry in-memory với cache-busting query parameter (?t=timestamp)
    if (retriesLeft > 0) {
      await new Promise((r) => setTimeout(r, delayMs));

      const chunkUrl = extractChunkUrl(err);
      if (chunkUrl) {
        try {
          const cacheBustUrl = `${chunkUrl}${chunkUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
          const module = await (/* @vite-ignore */ import(/* @vite-ignore */ cacheBustUrl));
          clearChunkReloadGuard();
          return module;
        } catch {
          // Bỏ qua lỗi cache-bust, tiếp tục thử gọi factory lần cuối
        }
      }

      // Thử gọi lại factory gốc
      try {
        const component = await factory();
        clearChunkReloadGuard();
        return component;
      } catch (retryErr: unknown) {
        lastError = retryErr;
      }
    }

    // Kiểm tra và ghi nhận version mới từ server nếu có
    try {
      await checkForNewVersion();
    } catch {
      // Bỏ qua lỗi mạng
    }

    // Bước 2: Nếu retry in-memory thất bại, kiểm tra Guard trước khi hard reload
    const win = getWindow();
    if (win && triggerChunkReloadGuard(win.location?.pathname ?? '/')) {
      win.location.reload();
      // Trả về Promise không resolve để React dừng render chờ browser reload
      return new Promise<{ default: T }>(() => {});
    }

    // Bước 3: Guard chặn (đã reload 1 lần trong 10s qua) -> Throw lỗi để RouteErrorBoundary hiển thị UI fallback
    throw lastError;
  }
}
