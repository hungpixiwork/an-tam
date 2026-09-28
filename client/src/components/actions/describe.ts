// Mô tả trước → sau của một hành động 1 chạm, tính ở trình duyệt từ payload (không cần gọi server, không kéo zod vào bundle).

import type { SuggestedAction } from '@shared/types/api/decision';
import { formatVnd } from '@shared/format';

type T = (key: string, vars?: Record<string, string | number>) => string;
export interface ActionDiff { before: string | null; after: string; line?: string }

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const monthShort = (m: unknown) => (typeof m === 'string' && m.length >= 7 ? `T${Number(m.slice(5, 7))}/${m.slice(0, 4)}` : '—');

export function describeAction(t: T, a: SuggestedAction): ActionDiff | null {
  const p = a.payload as Record<string, unknown>;
  switch (a.type) {
    case 'safety.set_target':
      // Mục tiêu giữ nguyên, chỉ đổi mức để dành mỗi tháng → hiện đúng phần thay đổi
      if (p.targetBefore != null && num(p.targetBefore) === num(p.targetAmount) && num(p.months) === num(p.monthsBefore)) {
        return {
          before: t('action.per_month', { amount: formatVnd(num(p.monthlyBefore)) }),
          after: t('action.per_month', { amount: formatVnd(num(p.monthly)) }),
          line: t('action.reserve', { months: num(p.months), amount: formatVnd(num(p.targetAmount)) }) + ` · ${monthShort(p.targetMonth)}`,
        };
      }
      return {
        before: p.targetBefore == null ? t('action.not_set') : t('action.reserve', { months: num(p.monthsBefore), amount: formatVnd(num(p.targetBefore)) }),
        after: t('action.reserve', { months: num(p.months), amount: formatVnd(num(p.targetAmount)) }),
        line: t('action.save_monthly', { amount: formatVnd(num(p.monthly)), month: monthShort(p.targetMonth) }),
      };
    case 'budget.set':
      return {
        before: p.limitBefore == null ? t('action.not_set') : formatVnd(num(p.limitBefore)),
        after: formatVnd(num(p.limit)),
        line: t('action.budget_line', { month: monthShort(p.month), saving: formatVnd(num(p.saving)) }),
      };
    case 'holding.rebalance':
      return {
        before: `${String(p.fromName)}: ${formatVnd(num(p.fromBefore))}`,
        after: `${String(p.fromName)}: ${formatVnd(num(p.fromBefore) - num(p.amount))}`,
        line: t('action.move', { amount: formatVnd(num(p.amount)), to: String(p.toName) }),
      };
    case 'earn.set_target':
      return {
        before: t('action.per_month', { amount: formatVnd(num(p.targetBefore)) }),
        after: t('action.per_month', { amount: formatVnd(num(p.target)) }),
        line: t('action.within', { n: num(p.months) }),
      };
    case 'goal.update_progress':
      return { before: t('action.per_month', { amount: formatVnd(num(p.monthlyBefore)) }), after: t('action.per_month', { amount: formatVnd(num(p.monthlyAfter)) }) };
    case 'life_choice.update_plan':
      return { before: p.startBefore ? monthShort(p.startBefore) : t('action.not_set'), after: monthShort(p.startAfter), line: t('action.start_line') };
    case 'reminder.create': {
      const dates = Array.isArray(p.dates) ? p.dates : [];
      return { before: null, after: t('action.reminders', { n: dates.length, time: String(p.time) }) };
    }
    default:
      return null;
  }
}
