import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';

export const workspaceRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.aiWorkspace,
      ...trang(() => import('./WorkspacePage')),
    },
  ],
};
