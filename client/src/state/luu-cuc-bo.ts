// Trạng thái RIÊNG của một slice, lưu localStorage (chuẩn mực nguyenvongai).
// Dùng khi một slice cần lưu thêm bộ lọc, tab đang mở, hoặc thông số nháp mà store.tsx chưa có.

import { useCallback, useEffect, useState } from 'react';

export function useLuuCucBo<T>(khoa: string, macDinh: T): [T, (v: T | ((c: T) => T)) => void] {
  const k = `antam:slice:${khoa}`;
  const [gia, setGia] = useState<T>(() => {
    try {
      const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? (globalThis as any).localStorage : null;
      const t = storage ? storage.getItem(k) : null;
      return t ? ({ ...(macDinh as object), ...JSON.parse(t) } as T) : macDinh;
    } catch {
      return macDinh;
    }
  });

  useEffect(() => {
    try {
      const storage = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? (globalThis as any).localStorage : null;
      if (storage) {
        storage.setItem(k, JSON.stringify(gia));
      }
    } catch {
      /* Trình duyệt chặn lưu: bỏ qua an toàn */
    }
  }, [k, gia]);

  const dat = useCallback((v: T | ((c: T) => T)) => setGia(v), []);
  return [gia, dat];
}
