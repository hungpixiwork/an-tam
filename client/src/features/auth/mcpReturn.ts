/** Chỉ cho phép quay lại endpoint consent trên cùng origin sau khi đăng nhập. */
export function mcpReturnPath(search: string, origin: string): string | null {
  const raw = new URLSearchParams(search).get('next');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  try {
    const url = new URL(raw, origin);
    return url.origin === origin && url.pathname === '/authorize'
      ? `${url.pathname}${url.search}`
      : null;
  } catch {
    return null;
  }
}
