import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const onboardingRoutes: RoutesCuaSlice = {
  khongThanh: [
    {
      path: MAU.batDau,
      ...trang(() => import('./OnboardingPage')),
    },
  ],
};
