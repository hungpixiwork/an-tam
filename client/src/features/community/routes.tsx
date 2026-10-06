import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const congDongRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.congDong,
      ...trang(() => import('./CommunityPage')),
    },
  ],
};
