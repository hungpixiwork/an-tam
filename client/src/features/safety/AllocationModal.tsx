// "Chia tiền để dành": bảng kế hoạch (mục tiêu | cần | đề xuất | khả năng đạt trước → sau) + nút áp dụng.

import { ArrowRight } from 'lucide-react';
import type { SavingsItem, SavingsPlan } from '@shared/types/api';
import { formatPct, formatVnd, formatVndFull } from '@shared/format';
import { Badge, Button, FormAlert, Modal, cx } from '@/components/ui';
import { useApplyAllocation } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const STATUS_TONE = { du: 'green', thieu: 'orange', du_du: 'blue' } as const;

function Chance({ item }: { item: SavingsItem }) {
  if (item.probabilityBefore === null || item.probabilityAfter === null) return <span className="text-ink-mute">—</span>;
  const up = item.probabilityAfter >= item.probabilityBefore;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-ink-soft">{formatPct(item.probabilityBefore)}</span>
      <ArrowRight className="h-3 w-3 text-ink-mute" aria-hidden />
      <span className={cx('font-bold', up ? 'text-success-700' : 'text-amber-600')}>{formatPct(item.probabilityAfter)}</span>
    </span>
  );
}

export function AllocationModal({ plan, onClose }: { plan: SavingsPlan; onClose: () => void }) {
  const { t } = useLocale();
  const apply = useApplyAllocation();
  const canApply = plan.capacity > 0 && plan.items.some((i) => i.goalId);
  const title = (i: SavingsItem) => (i.kind === 'debt' ? t('safety.alloc.debt', { title: i.title }) : i.title);

  return (
    <Modal title={t('safety.alloc.title')} onClose={onClose} className="max-w-2xl">
      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        {plan.capacity > 0 ? t('safety.alloc.intro', { amount: formatVnd(plan.capacity) }) : t('safety.alloc.no_capacity')}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-soft">
              <th className="py-2 pr-2 font-semibold">{t('safety.alloc.col.goal')}</th>
              <th className="px-2 py-2 text-right font-semibold">{t('safety.alloc.col.need')}</th>
              <th className="px-2 py-2 text-right font-semibold">{t('safety.alloc.col.suggest')}</th>
              <th className="py-2 pl-2 text-right font-semibold">{t('safety.alloc.col.chance')}</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((i) => (
              <tr key={i.goalId ?? i.liabilityId ?? i.kind} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-ink">{title(i)}</span>
                    <Badge size="sm" tone={STATUS_TONE[i.status]}>{t(`safety.alloc.status.${i.status}`)}</Badge>
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-ink-soft">{formatVndFull(i.required)}</td>
                <td className="px-2 py-2.5 text-right font-bold tabular-nums text-ink">{formatVndFull(i.suggested)}</td>
                <td className="py-2.5 pl-2 text-right"><Chance item={i} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[13px] font-semibold text-ink tabular-nums">
        {t('safety.alloc.total', { allocated: formatVndFull(plan.allocated), capacity: formatVndFull(Math.max(0, plan.capacity)) })}
      </p>
      {plan.unallocated >= 100_000 && <p className="mt-1 text-[12.5px] text-success-700">{t('safety.alloc.left', { amount: formatVndFull(plan.unallocated) })}</p>}

      {plan.fixes.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50/70 p-3">
          <p className="text-[13px] font-bold text-ink">{t('safety.alloc.fixes_title')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed text-ink-soft">
            {plan.fixes.map((f) => (
              <li key={f.goalId ?? f.title}>
                {f.delayMonths
                  ? t('safety.alloc.fix', { title: f.title, n: f.delayMonths, amount: formatVndFull(f.extraMonthly) })
                  : t('safety.alloc.fix_nodelay', { title: f.title, amount: formatVndFull(f.extraMonthly) })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-ink-mute">{t('safety.alloc.note')}</p>

      {apply.error && (
        <div className="mt-3">
          <FormAlert error={apply.error} />
        </div>
      )}
      {apply.isSuccess && <p className="mt-3 rounded-lg bg-success-50 px-3 py-2 text-[13px] font-medium text-success-700">{t('safety.alloc.applied')}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="white" onClick={onClose}>{t('safety.alloc.close')}</Button>
        <Button onClick={() => apply.mutate()} disabled={!canApply || apply.isPending}>
          {apply.isPending ? t('safety.alloc.applying') : t('safety.alloc.apply')}
        </Button>
      </div>
    </Modal>
  );
}
