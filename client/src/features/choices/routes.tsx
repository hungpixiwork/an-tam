import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const luaChonRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.luaChon,
      ...trang(() => import('./ChoicesPage')),
    },
  ],
};
