import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const lichAiRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.lichAi,
      ...trang(() => import('./CalendarPage')),
    },
  ],
};
