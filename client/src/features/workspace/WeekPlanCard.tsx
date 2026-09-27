import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CalendarDays, Check, CircleDollarSign, FileSpreadsheet, FileText, GraduationCap, Info, Mail, Pencil, Plus, SlidersHorizontal, X } from 'lucide-react';
import type { AgentRunView, CalendarEvent } from '@shared/types/api';
import { useLocale } from '@/app/locale';
import { Modal, WeekGrid, cx, type WeekCategoryStyle, type WeekEvent } from '@/components/ui';
import { addDays } from '../calendar/util';

type Tab = 'all' | 'finance' | 'skill' | 'work';
const TABS: { key: Tab; icon: typeof CalendarDays }[] = [
  { key: 'all', icon: CalendarDays },
  { key: 'finance', icon: CircleDollarSign },
  { key: 'skill', icon: GraduationCap },
  { key: 'work', icon: Briefcase },
];

/** Buổi AI đề xuất: viền nét đứt để phân biệt với lịch đã có. */
const PROPOSED: Record<string, WeekCategoryStyle> = {
  'p:finance': { block: 'bg-success-50 border-success-500 text-success-600 outline-dashed outline-1 outline-success-500/50', dot: 'bg-success-500' },
  'p:skill': { block: 'bg-violet-50 border-violet-500 text-violet-600 outline-dashed outline-1 outline-violet-500/50', dot: 'bg-violet-500' },
  'p:work': { block: 'bg-accent-50 border-accent-500 text-accent-700 outline-dashed outline-1 outline-accent-500/50', dot: 'bg-accent-500' },
  'p:rest': { block: 'bg-rose-50 border-rose-500 text-rose-600 outline-dashed outline-1 outline-rose-500/50', dot: 'bg-rose-500' },
  'p:personal': { block: 'bg-amber-50 border-amber-500 text-amber-600 outline-dashed outline-1 outline-amber-500/50', dot: 'bg-amber-500' },
};

const TOOLS = [
  { key: 'google_calendar', name: 'Google Calendar', icon: CalendarDays, cls: 'text-accent-600' },
  { key: 'google_sheets', name: 'Google Sheets', icon: FileSpreadsheet, cls: 'text-success-600' },
  { key: 'notion', name: 'Notion', icon: FileText, cls: 'text-ink' },
  { key: 'gmail', name: 'Gmail', icon: Mail, cls: 'text-danger-500' },
] as const;

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export interface PlanCardProps {
  run: AgentRunView;
  weekEvents: CalendarEvent[];
  googleConnected: boolean;
  busy: 'approve' | 'reject' | 'request' | 'edit' | null;
  onApprove: () => void;
  onReject: () => void;
  onRequest: (note: string) => void;
  onEdit: (events: { startsAt: string; endsAt: string }[]) => void;
  message: string | null;
}

/** Kế hoạch tuần tới (lịch đã có + buổi đề xuất) · công cụ & MCP · thanh phê duyệt. */
export function WeekPlanCard({ run, weekEvents, googleConnected, busy, onApprove, onReject, onRequest, onEdit, message }: PlanCardProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>('all');
  const [modal, setModal] = useState<'edit' | 'request' | null>(null);
  const cal = run.actions.find((a) => a.type === 'calendar.create_events');
  const calPending = cal?.status === 'pending';
  const pending = run.actions.filter((a) => a.status === 'pending');
  const days = Array.from({ length: 7 }, (_, i) => addDays(run.weekStart, i));

  const events: WeekEvent[] = useMemo(() => {
    const idx = (s: string) => days.indexOf(s.slice(0, 10));
    const existing = weekEvents.map((e) => ({ id: e.id, dayIndex: idx(e.startsAt), start: e.startsAt.slice(11, 16), end: e.endsAt.slice(11, 16), title: e.title, category: e.category, base: e.category }));
    const planned = calPending
      ? run.plannedEvents.map((e, i) => ({ id: `p${i}`, dayIndex: idx(e.startsAt), start: e.startsAt.slice(11, 16), end: e.endsAt.slice(11, 16), title: e.title, category: `p:${e.category}`, base: e.category }))
      : [];
    return [...existing, ...planned].filter((e) => e.dayIndex >= 0 && (tab === 'all' || e.base === tab)).map(({ base: _b, ...e }) => e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents, run, calPending, tab]);

  const toolStatus = (key: string) => (key === 'google_calendar' ? googleConnected : false);

  return (
    <section aria-labelledby="plan-title" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-title" className="text-[18px] font-bold text-ink">
          {t('workspace.plan.title')} <span className="font-semibold">({ddmm(days[0])} – {ddmm(days[6])}/{days[6].slice(0, 4)})</span>
        </h2>
        <div role="tablist" aria-label={t('workspace.plan.tabs')} className="flex flex-wrap gap-1">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold', tab === key ? 'bg-accent-50 text-accent-700 ring-1 ring-accent-200' : 'text-ink-soft hover:bg-slate-50')}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {t(`workspace.plan.tab.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <WeekGrid
        days={days.map((d, i) => ({ date: d, label: t(`workspace.day.${i}`), sub: ddmm(d) }))}
        events={events}
        startHour={8}
        endHour={21}
        hourHeight={20}
        categoryStyles={PROPOSED}
        ariaLabel={t('workspace.plan.grid')}
      />
      {calPending && (
        <p className="mt-2 flex items-center gap-3 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-violet-50 outline-dashed outline-1 outline-violet-500" aria-hidden />{t('workspace.plan.proposed')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border-l-[3px] border-accent-500 bg-accent-50" aria-hidden />{t('workspace.plan.existing')}</span>
        </p>
      )}

      {/* Công cụ & MCP */}
      <div className="mt-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-ink">
          {t('workspace.tools.title')}
          <span title={t('workspace.tools.info')} className="text-ink-mute"><Info className="h-3.5 w-3.5" aria-label={t('workspace.tools.info')} /></span>
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          {TOOLS.map((tool) => {
            const on = toolStatus(tool.key);
            return (
              <li key={tool.key} className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1">
                <tool.icon className={cx('h-6 w-6 shrink-0', tool.cls)} aria-hidden />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-ink">
                    {tool.name}
                    {on && <Check className="h-3.5 w-3.5 text-success-500" aria-label={t('workspace.tools.connected')} />}
                  </p>
                  {!on && <p className="text-[11px] font-medium text-warning-600">{t('workspace.tools.not_connected')}</p>}
                  <p className="truncate text-[11.5px] text-ink-soft">{t(`workspace.tools.${tool.key}`)}</p>
                </div>
              </li>
            );
          })}
          <li className="flex items-center">
            <Link to="/nhat-ky-ai" className="inline-flex items-center gap-1 rounded-lg border border-accent-200 px-3 py-1.5 text-[12.5px] font-semibold text-accent-700 hover:bg-accent-50">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('workspace.tools.add')}
            </Link>
          </li>
        </ul>
      </div>

      {/* Thanh phê duyệt */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" disabled={!calPending || !!busy} onClick={() => setModal('edit')} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-accent-200 bg-white px-4 text-[13px] font-semibold text-accent-700 hover:bg-accent-50 disabled:opacity-50">
          <Pencil className="h-4 w-4" aria-hidden />
          {t('workspace.btn.edit')}
        </button>
        <button type="button" disabled={!pending.length || !!busy} onClick={() => setModal('request')} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-accent-200 bg-white px-4 text-[13px] font-semibold text-accent-700 hover:bg-accent-50 disabled:opacity-50">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t('workspace.btn.request')}
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" disabled={!pending.length || !!busy} onClick={onReject} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:bg-slate-50 disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden />
            {t('workspace.btn.reject')}
          </button>
          <button type="button" disabled={!pending.length || !!busy} onClick={onApprove} aria-busy={busy === 'approve'} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-700 px-5 text-[13.5px] font-semibold text-white shadow-sm hover:bg-primary-800 disabled:opacity-50">
            <Check className="h-4 w-4" aria-hidden />
            {t('workspace.btn.approve')}
          </button>
        </div>
      </div>
      {message && <p role="status" className="mt-2 text-right text-[12.5px] font-medium text-ink-soft">{message}</p>}

      {modal === 'edit' && cal && <EditModal events={run.plannedEvents} onClose={() => setModal(null)} onSave={(ev) => { onEdit(ev); setModal(null); }} />}
      {modal === 'request' && <RequestModal onClose={() => setModal(null)} onSend={(note) => { onRequest(note); setModal(null); }} />}
    </section>
  );
}

function EditModal({ events, onClose, onSave }: { events: AgentRunView['plannedEvents']; onClose: () => void; onSave: (e: { startsAt: string; endsAt: string }[]) => void }) {
  const { t } = useLocale();
  const [rows, setRows] = useState(events.map((e) => ({ day: e.startsAt.slice(0, 10), start: e.startsAt.slice(11, 16), end: e.endsAt.slice(11, 16), title: e.title })));
  const valid = rows.every((r) => r.end > r.start);
  const set = (i: number, k: 'start' | 'end', v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <Modal title={t('workspace.edit.title')} onClose={onClose}>
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2 text-[13px]">
            <span className="min-w-0 flex-1 font-medium text-ink">{ddmm(r.day)} · {r.title}</span>
            <label className="sr-only" htmlFor={`s${i}`}>{t('workspace.edit.start')}</label>
            <input id={`s${i}`} type="time" value={r.start} onChange={(e) => set(i, 'start', e.target.value)} className="rounded-md border border-line px-2 py-1" />
            <span aria-hidden>–</span>
            <label className="sr-only" htmlFor={`e${i}`}>{t('workspace.edit.end')}</label>
            <input id={`e${i}`} type="time" value={r.end} onChange={(e) => set(i, 'end', e.target.value)} className="rounded-md border border-line px-2 py-1" />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2 text-[13px] font-semibold">{t('workspace.edit.cancel')}</button>
        <button type="button" disabled={!valid} onClick={() => onSave(rows.map((r) => ({ startsAt: `${r.day}T${r.start}`, endsAt: `${r.day}T${r.end}` })))} className="rounded-xl bg-primary-700 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {t('workspace.edit.save')}
        </button>
      </div>
    </Modal>
  );
}

function RequestModal({ onClose, onSend }: { onClose: () => void; onSend: (note: string) => void }) {
  const { t } = useLocale();
  const [note, setNote] = useState('');
  return (
    <Modal title={t('workspace.request.title')} onClose={onClose}>
      <label htmlFor="req-note" className="mb-1.5 block text-[13px] font-medium text-ink">{t('workspace.request.label')}</label>
      <textarea id="req-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder={t('workspace.request.placeholder')} className="w-full rounded-xl border border-line p-3 text-[13.5px] focus:border-accent-500 focus:outline-none" />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2 text-[13px] font-semibold">{t('workspace.edit.cancel')}</button>
        <button type="button" disabled={note.trim().length < 3} onClick={() => onSend(note.trim())} className="rounded-xl bg-primary-700 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{t('workspace.request.send')}</button>
      </div>
    </Modal>
  );
}
