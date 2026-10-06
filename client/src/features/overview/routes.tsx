import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const tongQuanRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.tongQuan,
      ...trang(() => import('./OverviewPage')),
    },
  ],
};
