import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { GoalCard } from '@shared/engine/analysis';
import { addMonths, currentMonth } from '@shared/engine/month';
import type { GoalKind } from '@shared/types/domain';
import { Button, FormAlert, FormField, Modal, MoneyInput, Segmented, Select, TextInput } from '@/components/ui';
import { useDeleteGoal, useSaveGoal, type GoalInput } from '@/lib/queries';

const KINDS: { value: GoalKind; label: string }[] = [
  { value: 'home', label: 'Mua nhà' },
  { value: 'education', label: 'Học cho con' },
  { value: 'retirement', label: 'Nghỉ hưu' },
  { value: 'emergency', label: 'Quỹ dự phòng' },
  { value: 'custom', label: 'Khác' },
];

const PRIORITIES = [
  { value: '1', label: 'Cao' },
  { value: '2', label: 'Vừa' },
  { value: '3', label: 'Thấp' },
] as const;

/** Thêm / sửa mục tiêu. Mount lại theo `key` mỗi lần mở để form luôn khớp mục tiêu đang sửa. */
export function GoalFormModal({ goal, onClose }: { goal: GoalCard | null; onClose: () => void }) {
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? 'home');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ?? 0);
  const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount ?? 0);
  const [targetMonth, setTargetMonth] = useState(goal?.targetMonth ?? addMonths(currentMonth(), 36));
  const [monthlyContribution, setMonthlyContribution] = useState(goal?.monthlyContribution ?? 0);
  const [priority, setPriority] = useState<'1' | '2' | '3'>(String(goal?.priority ?? 2) as '1' | '2' | '3');
  const save = useSaveGoal();
  const del = useDeleteGoal();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: GoalInput = {
      kind,
      title: title.trim() || KINDS.find((k) => k.value === kind)!.label,
      targetAmount,
      currentAmount,
      targetMonth,
      monthlyContribution,
      priority: Number(priority),
    };
    save.mutate(goal ? { ...input, id: goal.id } : input, { onSuccess: onClose });
  }

  const busy = save.isPending || del.isPending;

  return (
    <Modal title={goal ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu mới'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">Loại mục tiêu</p>
            <Select label="Loại mục tiêu" value={kind} onChange={setKind} options={KINDS} className="h-11 w-full text-[15px]" />
          </div>
          <FormField label="Tên mục tiêu">
            {(id) => <TextInput id={id} value={title} maxLength={60} placeholder={KINDS.find((k) => k.value === kind)!.label} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
        </div>
        <FormField label="Cần bao nhiêu">{(id) => <MoneyInput id={id} value={targetAmount} onChange={setTargetAmount} />}</FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Đã có">{(id) => <MoneyInput id={id} value={currentAmount} onChange={setCurrentAmount} />}</FormField>
          <FormField label="Muốn đạt vào">
            {(id) => <TextInput id={id} type="month" value={targetMonth} min={currentMonth()} onChange={(e) => e.target.value && setTargetMonth(e.target.value)} />}
          </FormField>
        </div>
        <FormField label="Mỗi tháng để dành" hint="Số tiền bạn đang thực sự dành riêng cho mục tiêu này mỗi tháng.">
          {(id) => <MoneyInput id={id} value={monthlyContribution} onChange={setMonthlyContribution} />}
        </FormField>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Mức ưu tiên</p>
          <Segmented label="Mức ưu tiên" value={priority} onChange={setPriority} options={[...PRIORITIES]} />
        </div>
        <FormAlert error={save.error ?? del.error} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={busy || targetAmount <= 0}>
            {save.isPending ? 'Đang lưu…' : goal ? 'Lưu thay đổi' : 'Thêm mục tiêu'}
          </Button>
          {goal && (
            <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => confirm(`Xóa mục tiêu "${goal.title}"?`) && del.mutate(goal.id, { onSuccess: onClose })}>
              Xóa
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
