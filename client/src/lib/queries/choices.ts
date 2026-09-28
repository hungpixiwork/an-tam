import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DecisionMode, LifeChoice, LifeChoiceDetail, LifeChoiceInput, LifeChoiceOptionInput, LifeChoicePreview, LifeChoiceTaskCategory, LifeChoiceTaskPriority, LifeChoiceTemplate } from '@shared/types/api';
import { api } from '../api';

/* ───────── 06 · Lựa chọn cuộc đời ───────── */
export const qk_choices = {
  list: ['life-choices'] as const,
  detail: (id: string) => ['life-choices', id] as const,
  templates: ['life-choices', 'templates'] as const,
  preview: (id: string, mode: DecisionMode) => ['life-choices', id, 'preview', mode] as const,
};

export const useLifeChoices = () => useQuery({ queryKey: qk_choices.list, queryFn: () => api.get<LifeChoice[]>('/life-choices') });

export const useLifeChoice = (id: string | undefined) =>
  useQuery({ queryKey: qk_choices.detail(id ?? ''), queryFn: () => api.get<LifeChoiceDetail>(`/life-choices/${id}`), enabled: !!id });

export const useLifeChoiceTemplates = () =>
  useQuery({ queryKey: qk_choices.templates, queryFn: () => api.get<LifeChoiceTemplate[]>('/life-choices/templates'), staleTime: Infinity });

export const useLifeChoicePreview = (id: string | undefined, mode: DecisionMode) =>
  useQuery({ queryKey: qk_choices.preview(id ?? '', mode), queryFn: () => api.get<LifeChoicePreview>(`/life-choices/${id}/preview?mode=${mode}`), enabled: !!id });

/** Mọi thay đổi → tải lại danh sách + chi tiết (điểm khả thi tính lại ở máy chủ) + Tổng quan (thẻ lựa chọn ghim). */
function useChoiceMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk_choices.list });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export const useCreateLifeChoice = () => useChoiceMutation((v: LifeChoiceInput) => api.post<{ id: string }>('/life-choices', v));

export const useUpdateLifeChoice = (choiceId: string) =>
  useChoiceMutation((v: Partial<LifeChoiceInput>) => api.patch<null>(`/life-choices/${choiceId}`, v));

export const useUpdateChoiceOption = (choiceId: string, optionId: string) =>
  useChoiceMutation((v: Partial<LifeChoiceOptionInput>) => api.patch<null>(`/life-choices/${choiceId}/options/${optionId}`, v));

export const useSelectOption = (choiceId: string) =>
  useChoiceMutation((optionId: string) => api.patch<null>(`/life-choices/${choiceId}/options/${optionId}`, { selected: true }));

export const useTogglePrereq = (choiceId: string) =>
  useChoiceMutation(({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/life-choices/${choiceId}/prereqs/${id}`, { done }));

export const useAddChoiceTask = (choiceId: string) =>
  useChoiceMutation((v: { title: string; detail?: string; priority: LifeChoiceTaskPriority; category?: LifeChoiceTaskCategory; today?: boolean }) => api.post<{ id: string }>(`/life-choices/${choiceId}/tasks`, v));

export const useToggleChoiceTask = (choiceId: string) =>
  useChoiceMutation(({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/life-choices/${choiceId}/tasks/${id}`, { done }));

export const useDeleteChoiceTask = (choiceId: string) => useChoiceMutation((id: string) => api.del<null>(`/life-choices/${choiceId}/tasks/${id}`));
