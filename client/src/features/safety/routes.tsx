import type { RoutesCuaSlice } from '@/routes-type';
import { trang } from '@/routes-type';
import { MAU } from '@/duong-dan';
import { Navigate } from 'react-router-dom';

export const quyAnToanRoutes: RoutesCuaSlice = {
  coThanh: [
    {
      path: MAU.quyAnToan,
      ...trang(() => import('./SafetyPage')),
    },
    // Chuyển hướng các đường dẫn cũ về trang Quỹ an toàn
    {
      path: '/muc-tieu',
      element: <Navigate to={MAU.quyAnToan} replace />,
    },
    {
      path: '/ke-hoach',
      element: <Navigate to={MAU.quyAnToan} replace />,
    },
  ],
};
