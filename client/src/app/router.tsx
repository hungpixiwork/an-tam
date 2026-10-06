import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { AuthLayout } from '@/layouts/AuthLayout';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { RouteErrorBoundary } from '@/components/ErrorBoundary';
import { retryDynamicImport } from '@/lib/chunkRecovery';
import { MAU } from '@/duong-dan';
import type { RoutesCuaSlice } from '@/routes-type';

import { tongQuanRoutes } from '@/features/overview/routes';
import { quyAnToanRoutes } from '@/features/safety/routes';
import { danhMucRoutes } from '@/features/portfolio/routes';
import { tangThuNhapRoutes } from '@/features/earn/routes';
import { luaChonRoutes } from '@/features/choices/routes';
import { thuChiRoutes } from '@/features/ledger/routes';
import { moPhongRoutes } from '@/features/simulation/routes';
import { lichAiRoutes } from '@/features/calendar/routes';
import { workspaceRoutes } from '@/features/workspace/routes';
import { auditRoutes } from '@/features/audit/routes';
import { congDongRoutes } from '@/features/community/routes';
import { caiDatRoutes } from '@/features/settings/routes';
import { authRoutes } from '@/features/auth/routes';
import { onboardingRoutes } from '@/features/onboarding/routes';

const CAC_SLICE_CO_THANH: RoutesCuaSlice[] = [
  tongQuanRoutes,
  quyAnToanRoutes,
  danhMucRoutes,
  tangThuNhapRoutes,
  luaChonRoutes,
  thuChiRoutes,
  moPhongRoutes,
  lichAiRoutes,
  workspaceRoutes,
  auditRoutes,
  congDongRoutes,
  caiDatRoutes,
];

const CAC_ROUTE_CO_THANH = CAC_SLICE_CO_THANH.flatMap((s) => s.coThanh ?? []);

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthLayout />,
        errorElement: <RouteErrorBoundary />,
        children: authRoutes.khongThanh ?? [],
      },
      {
        element: <OnboardingLayout />,
        errorElement: <RouteErrorBoundary />,
        children: onboardingRoutes.khongThanh ?? [],
      },
      {
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: CAC_ROUTE_CO_THANH,
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: MAU.devPixel,
              lazy: async () => {
                const mod = await retryDynamicImport(() => import('@/features/dev/PixelGallery'));
                return { Component: mod.default };
              },
              errorElement: <RouteErrorBoundary />,
            },
          ]
        : []),
      { path: '*', element: <Navigate to={MAU.tongQuan} replace /> },
    ],
  },
]);
