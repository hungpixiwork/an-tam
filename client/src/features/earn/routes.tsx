import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const tangThuNhapRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.tangThuNhap,
      ...trang(() => import('./EarnPage')),
    },
  ],
};
