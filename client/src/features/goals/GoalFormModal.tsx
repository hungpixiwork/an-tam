import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { GoalCard } from '@shared/engine/analysis';
import type { GoalKind } from '@shared/types/domain';
import { Button } from '@/components/ui';
import { useSaveGoal, useDeleteGoal, type GoalInput } from '@/lib/queries';

interface GoalFormModalProps {
  open: boolean;
  goal: GoalCard | null;
  onClose: () => void;
}

export function GoalFormModal({ open, goal, onClose }: GoalFormModalProps) {
  const [form, setForm] = useState<{
    title: string;
    kind: GoalKind;
    targetAmount: string;
    currentAmount: string;
    targetMonth: string;
    monthlyContribution: string;
  }>({
    title: goal?.title ?? '',
    kind: goal?.kind ?? 'custom',
    targetAmount: goal ? (goal.targetAmount / 1_000_000).toString() : '',
    currentAmount: goal ? (goal.currentAmount / 1_000_000).toString() : '',
    targetMonth: goal?.targetMonth ?? new Date().toISOString().slice(0, 7),
    monthlyContribution: goal ? (goal.monthlyContribution / 1_000_000).toString() : '',
  });

  const save = useSaveGoal();
  const del = useDeleteGoal();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: GoalInput & { id?: string } = {
      title: form.title,
      kind: form.kind,
      targetAmount: Math.round(Number(form.targetAmount) * 1_000_000),
      currentAmount: Math.round(Number(form.currentAmount) * 1_000_000),
      targetMonth: form.targetMonth,
      monthlyContribution: Math.round(Number(form.monthlyContribution) * 1_000_000),
      priority: goal?.priority ?? 0,
    };
    if (goal) payload.id = goal.id;

    save.mutate(payload as any, { onSuccess: onClose });
  };

  const handleDelete = () => {
    if (goal && confirm('Bạn chắc chắn muốn xóa mục tiêu này?')) {
      del.mutate(goal.id, { onSuccess: onClose });
    }
  };

  const error = save.error || del.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30" onClick={onClose} role="dialog" aria-modal="true" aria-label={goal ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu mới'}>
      <div className="w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">{goal ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu mới'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-slate-100" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex gap-3 rounded-lg bg-danger-50 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
            <p className="text-sm text-danger-600">{error instanceof Error ? error.message : 'Đã có lỗi'}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink">Tên mục tiêu</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100" placeholder="VD: Mua nhà riêng" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Loại mục tiêu</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GoalKind })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100">
              <option value="home">Mua nhà</option>
              <option value="education">Giáo dục</option>
              <option value="retirement">Nghỉ hưu</option>
              <option value="emergency">Quỹ dự phòng</option>
              <option value="custom">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Mục tiêu (triệu đ)</label>
            <input type="number" step="0.1" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100" placeholder="500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Đã có (triệu đ)</label>
            <input type="number" step="0.1" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100" placeholder="100" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Thời gian mục tiêu</label>
            <input type="month" value={form.targetMonth} onChange={(e) => setForm({ ...form, targetMonth: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">Mỗi tháng để dành (triệu đ)</label>
            <input type="number" step="0.1" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-100" placeholder="10" required />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" variant="primary" className="flex-1" disabled={save.isPending || del.isPending}>
              {goal ? 'Cập nhật' : 'Thêm mục tiêu'}
            </Button>
            {goal && (
              <Button type="button" variant="danger" onClick={handleDelete} disabled={save.isPending || del.isPending}>
                Xóa
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
