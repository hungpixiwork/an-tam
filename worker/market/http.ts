// Gọi nguồn công khai: timeout 5 giây, User-Agent trình duyệt (một số nguồn chặn client lạ).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const TIMEOUT_MS = 5_000;

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${new URL(url).host}`);
  return res;
}

export const getJson = async <T>(url: string, init?: RequestInit): Promise<T> => (await request(url, init)).json() as Promise<T>;
export const getText = async (url: string, init?: RequestInit): Promise<string> => (await request(url, init)).text();

/** Chạy song song theo từng mã, bỏ các mã lỗi. */
export async function perKey<T>(keys: string[], fn: (key: string) => Promise<T | null>): Promise<T[]> {
  const settled = await Promise.allSettled(keys.map(fn));
  return settled.flatMap((s) => (s.status === 'fulfilled' && s.value ? [s.value] : []));
}

/** '08:34 26/09/2026' hoặc '9/28/2026 7:38:17 AM' (giờ Việt Nam) → ISO. */
export function vnDateToIso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): string {
  return new Date(Date.UTC(y, mo - 1, d, h - 7, mi, s)).toISOString();
}

/** Giờ Việt Nam của một thời điểm. */
export function vnClock(at: Date | string = new Date()) {
  const d = new Date(new Date(at).getTime() + 7 * 3_600_000);
  return {
    day: d.toISOString().slice(0, 10),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    /** 0 = Chủ nhật. */
    weekday: d.getUTCDay(),
  };
}

export const unixToIso = (sec: number) => new Date(sec * 1000).toISOString();
