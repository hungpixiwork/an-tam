import { useState } from 'react';
import { AlertCircle, Check, ChevronUp, CircleCheck, Clock, Loader2, Zap } from 'lucide-react';
import type { AgentRunView, AgentStepView } from '@shared/types/api';
import { useLocale } from '@/app/locale';
import { Timeline, cx, type TimelineItem } from '@/components/ui';
import { ACTION_ICON, AGENT_META, isAgentKey, vnTime } from './meta';

const RUN_BADGE: Record<AgentRunView['status'], { key: string; cls: string }> = {
  running: { key: 'running', cls: 'bg-accent-50 text-accent-700' },
  awaiting_approval: { key: 'awaiting', cls: 'bg-success-50 text-success-600' },
  completed: { key: 'completed', cls: 'bg-success-50 text-success-600' },
  failed: { key: 'failed', cls: 'bg-danger-50 text-danger-600' },
  cancelled: { key: 'cancelled', cls: 'bg-slate-100 text-ink-soft' },
};

const SRC = new Set(['google_calendar', 'calendar_local', 'ledger', 'goals']);

/** Nhật ký: bước chính (plan / propose / tool / error) + các ý con (note) gom vào bước chính ngay trước. */
function groupSteps(steps: AgentStepView[]) {
  const out: { step: AgentStepView; notes: AgentStepView[] }[] = [];
  for (const s of steps) {
    if (s.kind === 'note' && out.length) out[out.length - 1].notes.push(s);
    else out.push({ step: s, notes: [] });
  }
  return out;
}

/** Nhật ký hoạt động & quy trình thực thi + "Chờ phê duyệt" + danh sách hành động đánh số. */
export function ActivityLog({ run }: { run: AgentRunView }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(true);
  const badge = RUN_BADGE[run.status];
  const pending = run.actions.filter((a) => a.status === 'pending');

  const items: TimelineItem[] = groupSteps(run.steps).map(({ step, notes }) => {
    const list = step.detail && /^[a-z_,]+$/.test(step.detail) ? step.detail.split(',') : null;
    const chips = list?.every(isAgentKey) ? (
      <div className="flex flex-wrap gap-1.5">
        {list.filter(isAgentKey).map((k) => {
          const m = AGENT_META[k];
          return (
            <span key={k} className={cx('flex h-7 w-7 items-center justify-center rounded-lg', m.chip)} title={t(`workspace.agent.${k}`)}>
              <m.icon className="h-4 w-4" aria-label={t(`workspace.agent.${k}`)} />
            </span>
          );
        })}
      </div>
    ) : list?.every((x) => SRC.has(x)) ? (
      <div className="flex flex-wrap gap-1.5">
        {list.map((x) => (
          <span key={x} className="rounded-md border border-line bg-white px-2 py-0.5 text-[11.5px] font-medium text-ink">{t(`workspace.src.${x}`)}</span>
        ))}
      </div>
    ) : null;
    return {
      id: step.id,
      time: vnTime(step.startedAt),
      title: step.title,
      sub: list ? undefined : step.detail ?? undefined,
      state: step.status === 'failed' || step.kind === 'error' ? 'error' : step.status === 'running' ? 'running' : 'done',
      children:
        chips || notes.length ? (
          <>
            {chips}
            {notes.length > 0 && (
              <ul className="space-y-1">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-1.5 text-[12.5px] text-ink-soft">
                    <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 fill-success-500 text-white" aria-hidden />
                    {n.title}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : undefined,
    };
  });

  return (
    <section aria-labelledby="log-title" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="log-title" className="flex items-center gap-2 text-[15.5px] font-bold leading-snug text-ink">
          <Clock className="h-5 w-5 shrink-0 text-accent-600" aria-hidden />
          {t('workspace.log.title')}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold', badge.cls)}>
            {run.status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Check className="h-3 w-3" aria-hidden />}
            {t(`workspace.log.${badge.key}`)}
          </span>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t('workspace.log.toggle')} className="rounded p-1 text-ink-soft hover:bg-slate-50">
            <ChevronUp className={cx('h-4 w-4 transition-transform', !open && 'rotate-180')} aria-hidden />
          </button>
        </div>
      </div>

      {open && <Timeline items={items} ariaLabel={t('workspace.log.title')} />}

      {pending.length > 0 && (
        <div role="status" className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 fill-amber-500 text-white" aria-hidden />
          <div>
            <p className="text-[13.5px] font-bold text-amber-700">{t('workspace.pending.title')}</p>
            <p className="text-[12.5px] text-ink-soft">{t('workspace.pending.body')}</p>
          </div>
        </div>
      )}

      {run.actions.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2.5 flex items-center justify-between gap-2 text-[14px] font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-accent-600" aria-hidden />
              {t('workspace.actions.title')}
            </span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-50 px-1.5 text-[12px] font-bold text-accent-700">{run.actions.length}</span>
          </h3>
          <ol className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {run.actions.map((a, i) => {
              const ic = ACTION_ICON[a.type] ?? ACTION_ICON['calendar.create_events'];
              return (
                <li key={a.id} className="flex min-w-0 items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[12px] font-semibold text-ink-soft">{i + 1}</span>
                  <ic.icon className={cx('mt-0.5 h-4 w-4 shrink-0', ic.cls)} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12.5px] leading-snug text-ink">{a.title}</p>
                    {a.preview?.after && <p className="text-[11.5px] text-ink-soft">{a.preview.before ? `${a.preview.before} → ` : ''}{a.preview.after}</p>}
                    {a.status !== 'pending' && (
                      <span className={cx('mt-0.5 inline-block rounded px-1.5 text-[11px] font-semibold', a.status === 'done' ? 'bg-success-50 text-success-600' : a.status === 'failed' ? 'bg-danger-50 text-danger-600' : 'bg-slate-100 text-ink-soft')}>
                        {t(`workspace.actions.status.${a.status}`)}
                      </span>
                    )}
                    {a.error && <p className="text-[11.5px] text-danger-600">{a.error}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
