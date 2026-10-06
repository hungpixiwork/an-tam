import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const danhMucRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.danhMuc,
      ...trang(() => import('./PortfolioPage')),
    },
  ],
};
