// "Kế hoạch liên hoàn" (3 checklist: tài chính / công việc / quỹ thời gian) và "Agent đồng hành hôm nay"
// (việc Agent đề xuất cho tuần này + nút sang Mô phỏng cú sốc kép). Tick → PATCH /life-choices/:id/tasks/:taskId.

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BriefcaseBusiness, Check, Clock3, Coins, Link2, Plus, type LucideIcon } from 'lucide-react';
import type { DecisionMode, LifeChoiceDetail, LifeChoiceTask, LifeChoiceTaskCategory } from '@shared/types/api';
import { Button, FormAlert, TextInput, cx } from '@/components/ui';
import { useAddChoiceTask, useToggleChoiceTask } from '@/lib/queries';
import { useLocale } from '@/app/locale';

const COLUMNS: { key: LifeChoiceTaskCategory; icon: LucideIcon; head: string; box: string }[] = [
  { key: 'finance', icon: Coins, head: 'bg-[#EAF7F0] text-[#126349]', box: 'accent-[#1FA16B]' },
  { key: 'career', icon: BriefcaseBusiness, head: 'bg-[#EDF4FF] text-accent-700', box: 'accent-[#2563EB]' },
  { key: 'time', icon: Clock3, head: 'bg-[#F4F0FF] text-violet-700', box: 'accent-[#7C3AED]' },
];

function TaskCheck({ task, onToggle, disabled, accent }: { task: LifeChoiceTask; onToggle: () => void; disabled: boolean; accent: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-[12.5px] leading-snug text-ink">
      <input type="checkbox" checked={task.done} disabled={disabled} onChange={onToggle} className={cx('mt-0.5 h-4 w-4 shrink-0 rounded', accent)} />
      <span className={cx('min-w-0', task.done && 'text-ink-soft')}>{task.title}</span>
    </label>
  );
}

function AddTask({ detail, category, onDone }: { detail: LifeChoiceDetail; category: LifeChoiceTaskCategory; onDone: () => void }) {
  const { t } = useLocale();
  const add = useAddChoiceTask(detail.id);
  const [title, setTitle] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    add.mutate({ title: title.trim(), priority: 'mid', category }, { onSuccess: () => { setTitle(''); onDone(); } });
  };
  return (
    <form onSubmit={submit} className="mt-1 flex gap-1.5">
      <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t('choices.chain.add_placeholder')} aria-label={t('choices.chain.add')} className="h-8 text-[12.5px]" autoFocus />
      <Button type="submit" size="sm" disabled={add.isPending || title.trim().length < 2}>{t('choices.plan.save')}</Button>
      <FormAlert error={add.error} />
    </form>
  );
}

export function ChainPlans({ detail }: { detail: LifeChoiceDetail }) {
  const { t } = useLocale();
  const toggle = useToggleChoiceTask(detail.id);
  const [adding, setAdding] = useState<LifeChoiceTaskCategory | null>(null);
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="chain-title">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <h2 id="chain-title" className="text-[17px] font-bold text-ink">{t('choices.plans.title')}</h2>
        <span className="text-[12px] text-ink-soft">{t('choices.chain.subtitle')}</span>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {COLUMNS.map(({ key, icon: Icon, head, box }) => {
          const tasks = detail.tasks.filter((x) => x.category === key && !x.today);
          const done = tasks.filter((x) => x.done).length;
          return (
            <div key={key} className="min-w-0 overflow-hidden rounded-xl border border-line">
              <h3 className={cx('flex items-center gap-2 px-3 py-2.5 text-[14px] font-bold', head)}>
                <Icon className="h-4 w-4" aria-hidden />{t(`choices.plans.${key === 'career' ? 'work' : key}`)}
                <span className="ml-auto text-[11.5px] font-semibold opacity-80">{done}/{tasks.length}</span>
              </h3>
              <div className="px-3 py-2">
                {tasks.map((task) => (
                  <TaskCheck key={task.id} task={task} accent={box} disabled={toggle.isPending} onToggle={() => toggle.mutate({ id: task.id, done: !task.done })} />
                ))}
                {!tasks.length && <p className="py-1 text-[12px] text-ink-soft">{t('choices.chain.empty')}</p>}
                {adding === key ? (
                  <AddTask detail={detail} category={key} onDone={() => setAdding(null)} />
                ) : (
                  <button type="button" onClick={() => setAdding(key)} className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-accent-600 hover:underline">
                    <Plus className="h-3.5 w-3.5" aria-hidden />{t('choices.chain.add')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <FormAlert error={toggle.error} />
    </section>
  );
}

export function CompanionCard({ detail, mode }: { detail: LifeChoiceDetail; mode: DecisionMode }) {
  const { t } = useLocale();
  const toggle = useToggleChoiceTask(detail.id);
  const today = detail.tasks.filter((x) => x.today);
  const to = `/mo-phong?choiceId=${encodeURIComponent(detail.id)}&mode=${mode}`;
  return (
    <div className="min-w-0 space-y-2.5">
      <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="companion-title">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF4FF] text-accent-600"><Bot className="h-6 w-6" aria-hidden /></span>
          <div className="min-w-0">
            <h2 id="companion-title" className="text-[16px] font-bold text-ink">{t('choices.today.title')}</h2>
            <p className="text-[12px] text-ink-soft">{t('choices.today.subtitle')}</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {today.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: task.id, done: !task.done })}
                aria-pressed={task.done}
                className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-[12.5px] leading-snug text-ink hover:bg-slate-50"
              >
                <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', task.done ? 'border-[#1FA16B] bg-[#1FA16B] text-white' : 'border-slate-300')}>
                  {task.done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                </span>
                <span className={cx('min-w-0', task.done && 'text-ink-soft')}>{task.title}</span>
              </button>
            </li>
          ))}
          {!today.length && <li className="text-[12.5px] text-ink-soft">{t('choices.today.empty')}</li>}
        </ul>
        <FormAlert error={toggle.error} />
      </section>
      <Link to={to} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B5E44] px-3 py-2 text-center text-[14px] font-bold text-white shadow-sm hover:bg-[#094D38]">
        {t('choices.simulation.cta')}<ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      <div className="flex gap-2 rounded-xl bg-[#EFF7FE] px-3 py-2.5 text-[12px] text-accent-700">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p>{t('choices.simulation.note')}</p>
          <Link to={to} className="mt-1 inline-block font-bold hover:underline">{t('choices.today.view_sim')} →</Link>
        </div>
      </div>
    </div>
  );
}
