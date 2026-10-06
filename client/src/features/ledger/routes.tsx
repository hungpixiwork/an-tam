import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';
import { Navigate } from 'react-router-dom';

export const thuChiRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.thuChi,
      ...trang(() => import('./LedgerPage')),
    },
    {
      path: '/thoi-quen',
      element: <Navigate to={`${MAU.thuChi}?tab=thoi-quen`} replace />,
    },
  ],
};
