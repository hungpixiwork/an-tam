import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Deep link `?focus=<key>` từ gợi ý / hành động: khi trang sẵn sàng thì cuộn tới khối `#focus-<key>`
 * (hoặc id trong `ids`) và viền sáng 2 giây để người dùng thấy ngay chỗ vừa được cập nhật.
 */
export function useFocusParam(ready: boolean, ids: Record<string, string> = {}): string | null {
  const [params] = useSearchParams();
  const focus = params.get('focus');
  useEffect(() => {
    if (!ready || !focus) return;
    const el = document.getElementById(ids[focus] ?? `focus-${focus}`);
    if (!el) return;
    const raf = requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const ring = ['ring-2', 'ring-accent-500', 'ring-offset-2', 'rounded-2xl'];
    el.classList.add(...ring);
    const timer = setTimeout(() => el.classList.remove(...ring), 2200);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); el.classList.remove(...ring); };
    // ids là hằng ở nơi gọi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus]);
  return focus;
}
