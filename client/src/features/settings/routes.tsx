import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const caiDatRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.caiDat,
      ...trang(() => import('./SettingsPage')),
    },
  ],
};
