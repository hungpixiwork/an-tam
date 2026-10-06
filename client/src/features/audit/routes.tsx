import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';
import { Navigate } from 'react-router-dom';

export const auditRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.nhatKyAi,
      ...trang(() => import('./AuditPage')),
    },
    {
      path: '/ai-theo-doi',
      element: <Navigate to={MAU.nhatKyAi} replace />,
    },
  ],
};
