import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  LifeChoice, LifeChoiceDetail, LifeChoiceInput, LifeChoiceOptionInput, LifeChoiceTaskCategory, LifeChoiceTaskPriority, LifeChoiceTemplate,
} from '@shared/types/api';
import { api } from '../api';

/* ───────── 06 · Lựa chọn cuộc đời ─────────
 * Khóa tách riêng để một thay đổi chỉ tải lại đúng phần bị ảnh hưởng:
 * danh sách · chi tiết (kèm lộ trình 3 kịch bản) · mẫu tình huống (tĩnh). */
export const qk_choices = {
  list: ['life-choices'] as const,
  detail: (id: string) => ['life-choice', id] as const,
  templates: ['life-choice-templates'] as const,
};

export const useLifeChoices = () => useQuery({ queryKey: qk_choices.list, queryFn: () => api.get<LifeChoice[]>('/life-choices') });

/** Chi tiết + lộ trình Bull / Base / Bear trong 1 request (đổi kịch bản không gọi lại server). */
export const useLifeChoice = (id: string | undefined) =>
  useQuery({ queryKey: qk_choices.detail(id ?? ''), queryFn: () => api.get<LifeChoiceDetail>(`/life-choices/${id}?previews=1`), enabled: !!id });

export const useLifeChoiceTemplates = () =>
  useQuery({ queryKey: qk_choices.templates, queryFn: () => api.get<LifeChoiceTemplate[]>('/life-choices/templates'), staleTime: Infinity });

/** Thay đổi làm điểm / lộ trình tính lại → tải lại chi tiết của lựa chọn đó (+ danh sách nếu tên đổi) và thẻ ở Tổng quan. */
function useChoiceMutation<V, R = unknown>(choiceId: string | null, fn: (v: V) => Promise<R>, opts: { list?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (choiceId) qc.invalidateQueries({ queryKey: qk_choices.detail(choiceId) });
      if (opts.list || !choiceId) qc.invalidateQueries({ queryKey: qk_choices.list });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

/** Sửa chi tiết tại chỗ (tick việc) — không cần tải lại vì không đổi điểm khả thi. */
function patchTask(qc: QueryClient, choiceId: string, taskId: string, done: boolean) {
  const key = qk_choices.detail(choiceId);
  const prev = qc.getQueryData<LifeChoiceDetail>(key);
  if (prev) qc.setQueryData<LifeChoiceDetail>(key, { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) });
  return prev;
}

export const useCreateLifeChoice = () => useChoiceMutation(null, (v: LifeChoiceInput) => api.post<{ id: string }>('/life-choices', v));

/** Sửa tình huống + phương án trong 1 request (chọn phương án, chi phí, thời gian, tháng bắt đầu). */
export const useUpdateLifeChoice = (choiceId: string) =>
  useChoiceMutation(
    choiceId,
    (v: Partial<LifeChoiceInput> & { option?: { id: string; select?: boolean } & Partial<LifeChoiceOptionInput> }) => api.patch<null>(`/life-choices/${choiceId}`, v),
    { list: true },
  );

export const useSelectOption = (choiceId: string) =>
  useChoiceMutation(choiceId, (optionId: string) => api.patch<null>(`/life-choices/${choiceId}/options/${optionId}`, { selected: true }));

export const useTogglePrereq = (choiceId: string) =>
  useChoiceMutation(choiceId, ({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/life-choices/${choiceId}/prereqs/${id}`, { done }));

export const useAddChoiceTask = (choiceId: string) =>
  useChoiceMutation(choiceId, (v: { title: string; detail?: string; priority: LifeChoiceTaskPriority; category?: LifeChoiceTaskCategory; today?: boolean }) =>
    api.post<{ id: string }>(`/life-choices/${choiceId}/tasks`, v));

/** Tick việc: cập nhật lạc quan, lỗi thì trả lại như cũ. */
export function useToggleChoiceTask(choiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<null>(`/life-choices/${choiceId}/tasks/${id}`, { done }),
    onMutate: ({ id, done }) => ({ prev: patchTask(qc, choiceId, id, done) }),
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(qk_choices.detail(choiceId), ctx.prev); },
  });
}

export const useDeleteChoiceTask = (choiceId: string) =>
  useChoiceMutation(choiceId, (id: string) => api.del<null>(`/life-choices/${choiceId}/tasks/${id}`));
