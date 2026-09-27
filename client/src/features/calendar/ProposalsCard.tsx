import { useState } from 'react';
import { CalendarCheck, CircleDollarSign, GraduationCap, Receipt, Target, Users, type LucideIcon } from 'lucide-react';
import type { CalendarProposal } from '@shared/types/api';
import { ApprovalBar, Badge, Button, IconTile, MenuButton, Modal, SectionCard, type ExtTone } from '@/components/ui';
import { useApproveProposal, useEditProposal, useRejectProposal } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { ddmm, weekdayShort } from './util';

const RULE_ICON: Record<string, { icon: LucideIcon; tone: ExtTone }> = {
  bill_reminder: { icon: Receipt, tone: 'amber' },
  skill_block: { icon: GraduationCap, tone: 'violet' },
  weekly_review: { icon: CircleDollarSign, tone: 'green' },
  freelance_followup: { icon: Users, tone: 'rose' },
  goal: { icon: Target, tone: 'blue' },
};
const BADGE_TONE: Record<CalendarProposal['priority'], ExtTone> = { high: 'red', goal: 'green', normal: 'blue' };

/** Đề xuất AI chờ duyệt: Duyệt (thêm vào lịch + nhật ký) · Chỉnh sửa giờ · Từ chối. */
export function ProposalsCard({ proposals }: { proposals: CalendarProposal[] }) {
  const { t } = useLocale();
  const [all, setAll] = useState(false);
  const list = all ? proposals : proposals.slice(0, 2);
  return (
    <SectionCard
      title={t('calendar.proposals.title')}
      className="!p-4"
      action={proposals.length > 2 ? { label: all ? t('calendar.proposals.less') : `${t('calendar.proposals.more')} (${proposals.length - 2})`, onClick: () => setAll((v) => !v) } : undefined}
      bodyClassName="space-y-3"
    >
      {list.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-ink-soft">{t('calendar.proposals.empty')}</p>}
      {list.map((p) => <ProposalItem key={p.id} p={p} />)}
    </SectionCard>
  );
}

function ProposalItem({ p }: { p: CalendarProposal }) {
  const { t, locale } = useLocale();
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [editing, setEditing] = useState(false);
  const meta = RULE_ICON[p.rule] ?? { icon: CalendarCheck, tone: 'blue' as ExtTone };
  const busy = approve.isPending ? 'approve' : reject.isPending ? 'reject' : false;
  const err = approve.error ?? reject.error;
  return (
    <article className="rounded-xl border border-line p-3">
      <div className="flex gap-3">
        <IconTile icon={meta.icon} tone={meta.tone} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-bold leading-snug text-ink">
              {p.title}
              <Badge tone={BADGE_TONE[p.priority]} size="sm" className="!h-5 !px-2 !text-[11px]">{t(`calendar.proposals.badge.${p.priority}`)}</Badge>
            </h3>
            <MenuButton
              label={t('calendar.proposals.menu')}
              items={[
                { label: t('calendar.proposals.edit'), onSelect: () => setEditing(true) },
                { label: t('calendar.proposals.reject'), onSelect: () => reject.mutate(p.id) },
              ]}
            />
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{p.reason}</p>
          {p.events.length > 1 && (
            <p className="mt-1 text-[12px] text-ink-soft">
              {p.events.map((e) => `${weekdayShort(e.startsAt.slice(0, 10), locale)} ${ddmm(e.startsAt.slice(0, 10))} ${e.startsAt.slice(11, 16)}`).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <ApprovalBar
        className="mt-2.5 min-[1600px]:pl-[52px] [&>button]:h-8 [&>button]:px-3"
        busy={busy}
        onApprove={() => approve.mutate(p.id)}
        onEdit={() => setEditing(true)}
        onReject={() => reject.mutate(p.id)}
        labels={{ approve: t('calendar.proposals.approve'), edit: t('calendar.proposals.edit'), reject: t('calendar.proposals.reject') }}
      />
      {err && <p role="alert" className="mt-2 text-[12.5px] text-danger-600">{err.message}</p>}
      {editing && <EditModal p={p} onClose={() => setEditing(false)} />}
    </article>
  );
}

function EditModal({ p, onClose }: { p: CalendarProposal; onClose: () => void }) {
  const { t } = useLocale();
  const edit = useEditProposal();
  const [rows, setRows] = useState(p.events.map((e) => ({ date: e.startsAt.slice(0, 10), start: e.startsAt.slice(11, 16), end: e.endsAt.slice(11, 16) })));
  const set = (i: number, k: 'date' | 'start' | 'end', v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const input = 'h-10 w-full rounded-lg border border-line px-2.5 text-[14px] text-ink focus:border-accent-500 focus:outline-none';
  return (
    <Modal title={t('calendar.proposals.edit_title')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          edit.mutate({ id: p.id, events: rows.map((r) => ({ startsAt: `${r.date}T${r.start}`, endsAt: `${r.date}T${r.end}` })) }, { onSuccess: onClose });
        }}
      >
        {rows.map((r, i) => (
          <fieldset key={i} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
            <legend className="sr-only">{p.events[i].title}</legend>
            <label className="text-[12px] text-ink-soft">{t('calendar.proposals.date')}<input type="date" required className={input} value={r.date} onChange={(e) => set(i, 'date', e.target.value)} /></label>
            <label className="text-[12px] text-ink-soft">{t('calendar.proposals.start')}<input type="time" required className={input} value={r.start} onChange={(e) => set(i, 'start', e.target.value)} /></label>
            <label className="text-[12px] text-ink-soft">{t('calendar.proposals.end')}<input type="time" required className={input} value={r.end} onChange={(e) => set(i, 'end', e.target.value)} /></label>
          </fieldset>
        ))}
        {edit.error && <p role="alert" className="text-[12.5px] text-danger-600">{edit.error.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="white" size="sm" onClick={onClose}>{t('calendar.proposals.cancel')}</Button>
          <Button type="submit" size="sm" disabled={edit.isPending}>{t('calendar.proposals.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
