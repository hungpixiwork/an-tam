import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { AuthLayout } from '@/layouts/AuthLayout';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { RouteErrorBoundary } from '@/components/ErrorBoundary';
import { retryDynamicImport } from '@/lib/chunkRecovery';

function safeLazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => retryDynamicImport(factory));
}

const OnboardingPage = safeLazy(() => import('@/features/onboarding/OnboardingPage'));
const LedgerPage = safeLazy(() => import('@/features/ledger/LedgerPage'));
const OverviewPage = safeLazy(() => import('@/features/overview/OverviewPage'));
const GoalsPage = safeLazy(() => import('@/features/goals/GoalsPage'));
const SimulationPage = safeLazy(() => import('@/features/simulation/SimulationPage'));
const SimulationResultPage = safeLazy(() => import('@/features/simulation/SimulationResultPage'));
const HabitsPage = safeLazy(() => import('@/features/habits/HabitsPage'));
const PortfolioPage = safeLazy(() => import('@/features/portfolio/PortfolioPage'));
const SafetyPlanPage = safeLazy(() => import('@/features/plan/SafetyPlanPage'));
const AiMonitorPage = safeLazy(() => import('@/features/ai/AiMonitorPage'));
const CommunityPage = safeLazy(() => import('@/features/community/CommunityPage'));
const SettingsPage = safeLazy(() => import('@/features/settings/SettingsPage'));
const EarnPage = safeLazy(() => import('@/features/earn/EarnPage'));
const LoginPage = safeLazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = safeLazy(() => import('@/features/auth/RegisterPage'));
const PixelGallery = safeLazy(() => import('@/features/dev/PixelGallery'));

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/dang-nhap', element: <LoginPage /> },
          { path: '/dang-ky', element: <RegisterPage /> },
        ],
      },
      { 
        element: <OnboardingLayout />, 
        errorElement: <RouteErrorBoundary />,
        children: [{ path: '/bat-dau', element: <OnboardingPage /> }] 
      },
      {
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/', element: <OverviewPage /> },
          { path: '/thu-chi', element: <LedgerPage /> },
          { path: '/tang-thu-nhap', element: <EarnPage /> },
          { path: '/muc-tieu', element: <GoalsPage /> },
          { path: '/mo-phong', element: <SimulationPage /> },
          { path: '/mo-phong/ket-qua/:runId', element: <SimulationResultPage /> },
          { path: '/thoi-quen', element: <HabitsPage /> },
          { path: '/danh-muc', element: <PortfolioPage /> },
          { path: '/ke-hoach', element: <SafetyPlanPage /> },
          { path: '/ai-theo-doi', element: <AiMonitorPage /> },
          { path: '/cong-dong', element: <CommunityPage /> },
          { path: '/cai-dat', element: <SettingsPage /> },
        ],
      },
      ...(import.meta.env.DEV ? [{ path: '/dev/pixel', element: <PixelGallery />, errorElement: <RouteErrorBoundary /> }] : []),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
