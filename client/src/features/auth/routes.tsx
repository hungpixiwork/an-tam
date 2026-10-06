import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const authRoutes: RoutesCuaSlice = {
  khongThanh: [
    {
      path: MAU.dangNhap,
      ...trang(() => import('./LoginPage')),
    },
    {
      path: MAU.dangKy,
      ...trang(() => import('./RegisterPage')),
    },
  ],
};
