// Hàng 3 — Các mục tiêu tiết kiệm: lọc theo kỳ hạn, thêm / sửa / xóa.

import { useState } from 'react';
import { ArrowRight, CalendarDays, MoreVertical, Plus } from 'lucide-react';
import type { SafetyData, SafetyGoalItem } from '@shared/types/api';
import type { Goal, GoalHorizon } from '@shared/types/domain';
import { formatVndFull } from '@shared/format';
import { Badge, Button, ProgressBar, TONE_EXT, Tabs, cx, type ExtTone } from '@/components/ui';
import { useDeleteGoal } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { goalLook } from './goalLook';

type Filter = 'all' | GoalHorizon;
const HORIZON_TONE: Record<GoalHorizon, ExtTone> = { short: 'blue', mid: 'violet', long: 'amber' };

function GoalMenu({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const del = useDeleteGoal();
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        aria-label={t('safety.goals.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1 text-ink-soft hover:bg-black/5 hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-line bg-white p-1 shadow-lift">
          <li role="none">
            <button type="button" role="menuitem" onClick={() => (setOpen(false), onEdit())} className="w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-50">
              {t('safety.goals.edit')}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={del.isPending}
              onClick={() => confirm(t('safety.goals.confirm_delete', { title: goal.title })) && del.mutate(goal.id)}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-danger-600 hover:bg-danger-50"
            >
              {t('safety.goals.delete')}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function GoalCardView({ item, onEdit }: { item: SafetyGoalItem; onEdit: () => void }) {
  const { t } = useLocale();
  const { goal } = item;
  const look = goalLook(goal);
  const Icon = look.icon;
  const pct = Math.round(item.progress * 100);
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4 pb-3">
      <div className="flex items-start gap-3">
        <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', TONE_EXT[look.tone].soft)}>
          <Icon className={cx('h-6 w-6', TONE_EXT[look.tone].text)} strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-ink">{goal.title}</h3>
          <p className="truncate text-[12.5px] text-ink-soft">{t(`safety.goals.kind.${goal.kind}`)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <GoalMenu goal={goal} onEdit={onEdit} />
          {item.essential ? (
            <Badge size="sm" tone="rose">{t('safety.goals.essential')}</Badge>
          ) : (
            <Badge size="sm" tone={HORIZON_TONE[item.horizon]}>{t(`safety.goals.tab.${item.horizon}`)}</Badge>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="truncate text-[13px] text-ink-soft tabular-nums">
          <span className="text-[15px] font-extrabold text-ink">{formatVndFull(goal.currentAmount)}</span> / {formatVndFull(goal.targetAmount)}
        </p>
        <span className="text-[13px] font-bold tabular-nums" style={{ color: look.hex }}>{pct}%</span>
      </div>
      <ProgressBar value={item.progress} color={look.hex} className="mt-2" label={goal.title} />
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {item.monthsLeft > 0 ? t('safety.goals.left', { n: item.monthsLeft }) : t('safety.goals.due')}
        </span>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 font-semibold text-accent-600 hover:text-accent-700">
          {t('safety.goals.detail')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </article>
  );
}

export function GoalsSection({ data, onEdit, onAdd }: { data: SafetyData; onEdit: (goal: Goal) => void; onAdd: () => void }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>('all');
  const items = data.goals.filter((g) => filter === 'all' || g.horizon === filter);
  return (
    <section aria-labelledby="goals-h" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 id="goals-h" className="text-[18px] font-bold text-ink">{t('safety.goals.title')}</h2>
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <Tabs<Filter>
            ariaLabel={t('safety.goals.tabs')}
            value={filter}
            onChange={setFilter}
            className="border-b-0"
            items={(['all', 'short', 'mid', 'long'] as const).map((k) => ({ key: k, label: t(`safety.goals.tab.${k}`), count: data.counts[k] }))}
          />
          <Button variant="soft" size="sm" icon={Plus} onClick={onAdd}>
            {t('safety.goals.add')}
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-6 text-center text-[14px] text-ink-soft">{t('safety.goals.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <GoalCardView key={item.goal.id} item={item} onEdit={() => onEdit(item.goal)} />
          ))}
        </div>
      )}
    </section>
  );
}
