import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me, OnboardingResult, ProfileData } from '@shared/types/api';
import { api } from '../api';
import type { GoalInput } from './goals';
import { FINANCE_KEYS, qk, useInvalidateFinance } from './keys';
import type { HoldingInput } from './portfolio';

export interface ProfileInput { monthlyIncome: number; monthlyExpense: number; emergencyTargetMonths: number }
export interface OnboardingInput { profile?: ProfileInput; holdings: HoldingInput[]; goals: GoalInput[]; lifeStage?: string; }

/* ───────── Hồ sơ tài chính & bắt đầu ───────── */
export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: () => api.get<ProfileData>('/profile') });

export function useSaveProfile() {
  const refresh = useInvalidateFinance();
  return useMutation({ mutationFn: (p: Partial<ProfileInput>) => api.put<ProfileData>('/profile', p), onSuccess: refresh });
}

/** Gửi dữ liệu màn "Bắt đầu". Chưa cập nhật `me` ngay để màn còn hiện bước kết quả — gọi `finish` khi người dùng bấm tiếp. */
export function useOnboarding() {
  const qc = useQueryClient();
  return {
    submit: useMutation({ mutationFn: (input: OnboardingInput) => api.post<OnboardingResult>('/onboarding', input) }),
    finish: (me: Me) => {
      FINANCE_KEYS.forEach((key) => qc.removeQueries({ queryKey: key }));
      qc.setQueryData(qk.me, me);
    },
  };
}
