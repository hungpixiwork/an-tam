import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const moPhongRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.moPhong,
      ...trang(() => import('./SimulationPage')),
    },
    {
      path: MAU.moPhongKetQua,
      ...trang(() => import('./SimulationResultPage')),
    },
  ],
};
