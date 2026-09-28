// Cột phải: "Điều kiện tiên quyết" (tick → điểm khả thi tính lại) và "Kế hoạch hành động do AI đề xuất" (thêm / hoàn thành / xóa việc).

import { useState, type FormEvent } from 'react';
import { Check, CircleCheck, Circle, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { LifeChoiceDetail, LifeChoiceTaskPriority } from '@shared/types/api';
import { Badge, Button, FormAlert, SectionCard, Select, TextInput, cx, type ExtTone } from '@/components/ui';
import { useAddChoiceTask, useDeleteChoiceTask, useTogglePrereq, useToggleChoiceTask } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { num } from './shared';

export function PrereqsCard({ detail }: { detail: LifeChoiceDetail }) {
  const { t, locale } = useLocale();
  const toggle = useTogglePrereq(detail.id);
  const done = detail.prereqs.filter((p) => p.done).length;
  return (
    <SectionCard
      title={t('choices.prereqs.title')}
      extra={<span className="rounded-full bg-[#E3F5EB] px-2.5 py-0.5 text-[13px] font-bold text-[#137A4F]">{done}/{detail.prereqs.length}</span>}
      bodyClassName="divide-y divide-line"
    >
      {detail.prereqs.map((p) => {
        const auto = !!p.autoKey;
        const Icon = p.done ? CircleCheck : Circle;
        return (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <button
              type="button"
              disabled={auto || toggle.isPending}
              onClick={() => toggle.mutate({ id: p.id, done: !p.done })}
              aria-pressed={p.done}
              aria-label={p.title}
              title={auto ? t('choices.prereqs.auto_hint') : undefined}
              className="shrink-0 rounded-full disabled:cursor-default"
            >
              <Icon className={cx('h-[22px] w-[22px]', p.done ? 'fill-[#1FA16B] text-white' : 'text-slate-300')} strokeWidth={p.done ? 2.4 : 1.8} aria-hidden />
            </button>
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">{p.title}</span>
            {auto ? (
              <span className={cx('shrink-0 text-[12.5px]', p.done ? 'text-ink-soft' : 'font-semibold text-danger-600')}>
                {t('choices.prereqs.current', { n: num(p.params?.months ?? 0, locale) })}
              </span>
            ) : (
              <span className={cx('shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold', p.done ? 'bg-[#E3F5EB] text-[#137A4F]' : 'bg-[#FDE8E8] text-danger-600')}>
                {p.done ? t('choices.prereqs.done') : t('choices.prereqs.todo')}
              </span>
            )}
          </div>
        );
      })}
      <FormAlert error={toggle.error} />
    </SectionCard>
  );
}

const PRIORITY_TONE: Record<LifeChoiceTaskPriority, ExtTone> = { high: 'red', mid: 'amber', low: 'blue' };

export function ActionPlanCard({ detail }: { detail: LifeChoiceDetail }) {
  const { t } = useLocale();
  const toggle = useToggleChoiceTask(detail.id);
  const remove = useDeleteChoiceTask(detail.id);
  const add = useAddChoiceTask(detail.id);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<LifeChoiceTaskPriority>('mid');
  const done = detail.tasks.filter((x) => x.done).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    add.mutate(
      { title: title.trim(), detail: note.trim(), priority },
      {
        onSuccess: () => {
          setTitle('');
          setNote('');
          setAdding(false);
        },
      },
    );
  };

  return (
    <SectionCard
      title={t('choices.plan.title')}
      icon={Sparkles}
      iconTone="blue"
      extra={<span className="text-[12.5px] text-ink-soft">{t('choices.plan.progress', { done, total: detail.tasks.length })}</span>}
    >
      <ol className="space-y-1.5">
        {detail.tasks.map((task, i) => (
          <li key={task.id} title={task.detail || undefined} className={cx('group relative flex items-start gap-2 rounded-xl border border-line p-2 pr-7', task.done && 'bg-slate-50')}>
            <button
              type="button"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ id: task.id, done: !task.done })}
              aria-pressed={task.done}
              aria-label={t(task.done ? 'choices.plan.mark_undone' : 'choices.plan.mark_done', { title: task.title })}
              className={cx(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                task.done ? 'bg-[#1FA16B] text-white' : 'bg-[#EEF3FA] text-ink hover:bg-[#E3F5EB]',
              )}
            >
              {task.done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cx('text-[13.5px] font-semibold text-ink', task.done && 'text-ink-soft line-through')}>{task.title}</p>
              {task.detail && <p className="sr-only">{task.detail}</p>}
              <Badge tone={PRIORITY_TONE[task.priority]} size="sm" className="mt-1 whitespace-nowrap">
                {t(`choices.plan.priority.${task.priority}`)}
              </Badge>
            </div>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(task.id)}
              aria-label={t('choices.plan.remove', { title: task.title })}
              className="absolute right-1 top-1 rounded-md p-1 text-ink-mute opacity-0 hover:bg-slate-100 hover:text-danger-600 focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <FormAlert error={toggle.error ?? remove.error ?? add.error} />
      {adding ? (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-line p-3">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('choices.plan.add_ph')} aria-label={t('choices.plan.add_ph')} maxLength={80} autoFocus />
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('choices.plan.detail_ph')} aria-label={t('choices.plan.detail_ph')} maxLength={160} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select
              value={priority}
              onChange={setPriority}
              label={t('choices.plan.priority.mid')}
              options={(['high', 'mid', 'low'] as const).map((p) => ({ value: p, label: t(`choices.plan.priority.${p}`) }))}
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                {t('choices.plan.cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={add.isPending || title.trim().length < 2}>
                {t('choices.plan.save')}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <Button variant="soft" size="sm" icon={Plus} className="mt-3" onClick={() => setAdding(true)}>
          {t('choices.plan.add')}
        </Button>
      )}
    </SectionCard>
  );
}
