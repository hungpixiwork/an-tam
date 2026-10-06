import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

/** Mỗi slice nghiệp vụ xuất một đối tượng này từ features/<slice>/routes.tsx. Router tự gom lại. */
export interface RoutesCuaSlice {
  /** Trang nằm trong khung giao diện chính AppShell (có thanh tab hoặc điều hướng). */
  coThanh?: RouteObject[];
  /** Trang toàn màn hình / độc lập (Đăng nhập, Đăng ký, Bắt đầu onboarding). */
  khongThanh?: RouteObject[];
}

/** Tải trang theo nhu cầu (code-splitting): `...trang(() => import("./TrangChinh"))`. Trang phải `export default`. */
export const trang = (f: () => Promise<{ default: ComponentType<any> }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await f()).default }),
});
