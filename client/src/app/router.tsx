import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { AuthLayout } from '@/layouts/AuthLayout';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';

const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
const LedgerPage = lazy(() => import('@/features/ledger/LedgerPage'));
const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'));
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'));
const SimulationPage = lazy(() => import('@/features/simulation/SimulationPage'));
const SimulationResultPage = lazy(() => import('@/features/simulation/SimulationResultPage'));
const HabitsPage = lazy(() => import('@/features/habits/HabitsPage'));
const PortfolioPage = lazy(() => import('@/features/portfolio/PortfolioPage'));
const SafetyPlanPage = lazy(() => import('@/features/plan/SafetyPlanPage'));
const AiMonitorPage = lazy(() => import('@/features/ai/AiMonitorPage'));
const CommunityPage = lazy(() => import('@/features/community/CommunityPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const PixelGallery = lazy(() => import('@/features/dev/PixelGallery'));

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/dang-nhap', element: <LoginPage /> },
      { path: '/dang-ky', element: <RegisterPage /> },
    ],
  },
  { element: <OnboardingLayout />, children: [{ path: '/bat-dau', element: <OnboardingPage /> }] },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <OverviewPage /> },
      { path: '/thu-chi', element: <LedgerPage /> },
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
  ...(import.meta.env.DEV ? [{ path: '/dev/pixel', element: <PixelGallery /> }] : []),
  { path: '*', element: <Navigate to="/" replace /> },
]);
