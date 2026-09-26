// Fetch wrapper cho API cùng origin (cookie session tự gửi kèm).

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Thân request: object hoặc mảng, gửi dạng JSON. */
type Json = object;

async function request<T>(method: string, path: string, body?: Json): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    throw new ApiError(res.status, json?.error?.code ?? 'unknown', json?.error?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại');
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: Json) => request<T>('POST', path, body),
  put: <T>(path: string, body?: Json) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: Json) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
