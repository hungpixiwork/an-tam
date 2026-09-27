import { useState } from 'react';
import { CheckCircle2, ShieldAlert, ShieldCheck, User, XCircle } from 'lucide-react';
import type { AuditLogItem, AuditStatus } from '@shared/types/api';
import { Badge, Button, ErrorState, IconTile, MenuButton, Modal, Select, Skeleton, TONE_EXT, cx } from '@/components/ui';
import { useAuditLog, useAuditVerify, type AuditFilters, type AuditRange } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { STATUS_TONE, agentLook, agentName, dateTimeParts } from './util';

const STATUSES: AuditStatus[] = ['completed', 'approved', 'rejected', 'failed'];
const RANGES: AuditRange[] = [7, 30, 90];
const GRID = 'md:grid-cols-[88px_minmax(150px,1fr)_minmax(170px,1.3fr)_minmax(130px,1fr)_128px_112px_28px]';

/** Nhật ký hoạt động AI: 3 bộ lọc + bảng (phân trang "Xem thêm") + dấu "Nhật ký toàn vẹn". */
export function AuditLogCard() {
  const { t } = useLocale();
  const [f, setF] = useState<AuditFilters>({ agent: '', status: '', days: 7 });
  const log = useAuditLog(f);
  const verify = useAuditVerify();
  const [detail, setDetail] = useState<AuditLogItem | null>(null);
  const items = log.data?.pages.flatMap((p) => p.items) ?? [];
  const agents = log.data?.pages[0]?.agents ?? [];

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="audit-log-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[260px] flex-1">
          <h2 id="audit-log-title" className="flex flex-wrap items-center gap-2 text-[19px] font-bold text-ink">
            {t('audit.log.title')}
            {verify.data && (
              <span title={verify.data.ok ? t('audit.chain.ok_hint', { n: verify.data.count }) : t('audit.chain.broken_hint')}>
                <Badge tone={verify.data.ok ? 'green' : 'red'} size="sm" icon={verify.data.ok ? ShieldCheck : ShieldAlert}>
                  {t(verify.data.ok ? 'audit.chain.ok' : 'audit.chain.broken')}
                </Badge>
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">{t('audit.log.subtitle')}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 md:shrink-0">
          <Select
            label={t('audit.log.filter_agent')}
            value={f.agent}
            onChange={(agent) => setF({ ...f, agent })}
            options={[{ value: '', label: t('audit.log.all_agents') }, ...agents.map((a) => ({ value: a, label: agentName(t, a) }))]}
            className="w-[162px]"
          />
          <Select
            label={t('audit.log.filter_status')}
            value={f.status}
            onChange={(status) => setF({ ...f, status })}
            options={[{ value: '' as const, label: t('audit.log.all_status') }, ...STATUSES.map((s) => ({ value: s, label: t(`audit.status.${s}`) }))]}
            className="w-[162px]"
          />
          <Select
            label={t('audit.log.filter_range')}
            value={f.days}
            onChange={(days) => setF({ ...f, days })}
            options={RANGES.map((n) => ({ value: n, label: t('audit.log.days', { n }) }))}
            className="w-[132px]"
          />
        </div>
      </div>

      <div role="table" aria-labelledby="audit-log-title" className="text-[13px]">
        <div role="row" className={cx('hidden gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] font-semibold text-ink md:grid', GRID)}>
          {['col_time', 'col_agent', 'col_action', 'col_data', 'col_status', 'col_approver'].map((k) => (
            <span role="columnheader" key={k}>{t(`audit.log.${k}`)}</span>
          ))}
          <span aria-hidden />
        </div>

        {log.isPending ? (
          <div className="space-y-2 pt-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : log.error ? (
          <ErrorState error={log.error} onRetry={() => log.refetch()} />
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-ink-soft">{t('audit.log.empty')}</p>
        ) : (
          items.map((it) => <Row key={it.id} it={it} onView={() => setDetail(it)} />)
        )}
      </div>

      {log.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button variant="soft" size="sm" onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>{t('audit.log.more')}</Button>
        </div>
      )}

      {detail && <DetailModal it={detail} onClose={() => setDetail(null)} />}
    </section>
  );
}

function Row({ it, onView }: { it: AuditLogItem; onView: () => void }) {
  const { t, locale } = useLocale();
  const [day, time] = dateTimeParts(it.at, locale);
  const look = agentLook(it.agent);
  const tone = STATUS_TONE[it.status];
  return (
    <div role="row" className={cx('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-line/70 px-3 py-2.5 last:border-b-0', GRID)}>
      <span role="cell" className="order-2 text-[12.5px] leading-snug text-ink-soft md:order-none">{day}<br className="hidden md:block" /> <span className="md:hidden">· </span>{time}</span>
      <span role="cell" className="order-1 flex min-w-0 items-center gap-2.5 font-semibold text-ink md:order-none">
        <IconTile icon={look.icon} tone={look.tone} size="sm" />
        <span className="min-w-0 leading-snug">{agentName(t, it.agent)}</span>
      </span>
      <span role="cell" className="order-3 col-span-2 leading-snug text-ink md:order-none md:col-span-1">{it.summary}</span>
      <span role="cell" className="order-4 col-span-2 leading-snug text-ink-soft md:order-none md:col-span-1">{it.dataLabel ?? '—'}</span>
      <span role="cell" className="order-5 md:order-none">
        <span className={cx('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-semibold', TONE_EXT[tone].soft, TONE_EXT[tone].text)}>
          {it.status === 'rejected' ? <XCircle className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
          {t(`audit.status.${it.status}`)}
        </span>
      </span>
      <span role="cell" className="order-6 flex items-center gap-1.5 text-ink md:order-none">
        {it.approver === 'user' && <User className="h-4 w-4 text-accent-600" aria-hidden />}
        {it.approver ? t(`audit.approver.${it.approver}`) : '—'}
      </span>
      <span role="cell" className="order-7 justify-self-end md:order-none">
        <MenuButton label={t('audit.log.menu')} items={[{ label: t('audit.log.view'), onSelect: onView }]} />
      </span>
    </div>
  );
}

function DetailModal({ it, onClose }: { it: AuditLogItem; onClose: () => void }) {
  const { t, locale } = useLocale();
  const [day, time] = dateTimeParts(it.at, locale);
  const rows: [string, string][] = [
    [t('audit.log.col_time'), `${day} ${time}`],
    [t('audit.log.col_agent'), agentName(t, it.agent)],
    [t('audit.log.detail_actor'), t(`audit.actor.${it.actor}`)],
    [t('audit.log.col_action'), it.summary],
    [t('audit.log.col_data'), it.dataLabel ?? '—'],
    [t('audit.log.col_status'), t(`audit.status.${it.status}`)],
    [t('audit.log.col_approver'), it.approver ? t(`audit.approver.${it.approver}`) : '—'],
    [t('audit.log.detail_code'), it.action],
  ];
  return (
    <Modal title={t('audit.log.detail_title')} onClose={onClose}>
      <dl className="space-y-2.5 text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[130px_1fr] gap-3">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="break-words font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-lg bg-success-50 px-3 py-2 text-[12.5px] text-success-600">{t('audit.log.detail_note')}</p>
    </Modal>
  );
}
