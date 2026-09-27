import { Database, Network, RefreshCw, ShieldCheck, Workflow, type LucideIcon } from 'lucide-react';
import { cx } from '@/components/ui';
import { useAuditVerify, useHealth, useIntegrations } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { relativeTime } from './util';

type Level = 'good' | 'warn' | 'bad' | 'off';
const DOT: Record<Level, string> = { good: 'bg-success-500', warn: 'bg-accent-500', bad: 'bg-danger-500', off: 'bg-slate-300' };
const TEXT: Record<Level, string> = { good: 'text-success-600', warn: 'text-accent-600', bad: 'text-danger-600', off: 'text-ink-soft' };

/** Tình trạng hệ thống: /api/health + lần đồng bộ gần nhất của các tích hợp + chuỗi hash nhật ký. */
export function SystemStatusCard() {
  const { t, locale } = useLocale();
  const health = useHealth();
  const verify = useAuditVerify();
  const { data: ints } = useIntegrations();

  const up = health.data?.ok ?? !health.isError;
  const items = ints?.items ?? [];
  const connected = items.filter((i) => i.status === 'connected' || i.status === 'pending');
  const lastSync = items.map((i) => i.lastSyncedAt).filter((x): x is string => !!x).sort().at(-1) ?? null;
  const anyError = items.some((i) => i.status === 'error');
  const chainOk = verify.data?.ok;

  const rows: { icon: LucideIcon; label: string; level: Level; state: string; right: string }[] = [
    { icon: Workflow, label: t('audit.sys.ai'), level: up ? 'good' : 'bad', state: t(up ? 'audit.sys.good' : 'audit.sys.bad'), right: health.data ? `v${health.data.version}` : '' },
    {
      icon: RefreshCw, label: t('audit.sys.sync'), level: lastSync ? 'warn' : 'off', state: t(lastSync ? 'audit.sys.syncing' : 'audit.sys.none'),
      right: lastSync ? relativeTime(lastSync, locale) : '',
    },
    {
      icon: ShieldCheck, label: t('audit.sys.security'), level: chainOk === false ? 'bad' : 'good', state: t(chainOk === false ? 'audit.chain.broken' : 'audit.sys.intact'),
      right: verify.data ? t('audit.sys.rows', { n: verify.data.count }) : '',
    },
    {
      icon: Database, label: t('audit.sys.db'), level: up ? 'good' : 'bad', state: t(up ? 'audit.sys.good' : 'audit.sys.bad'),
      right: health.data ? relativeTime(health.data.time, locale) : '',
    },
    {
      icon: Network, label: t('audit.sys.integrations'), level: anyError ? 'bad' : connected.length ? 'good' : 'off',
      state: t(anyError ? 'audit.sys.bad' : connected.length ? 'audit.sys.good' : 'audit.sys.none'),
      right: items.length ? t('audit.sys.connected_of', { n: connected.length, total: items.length }) : '',
    },
  ];
  const allGood = up && chainOk !== false && !anyError;

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="sys-title">
      <h2 id="sys-title" className="text-[19px] font-bold text-ink">{t('audit.sys.title')}</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', allGood ? 'bg-success-50' : 'bg-danger-50')}>
          <span className={cx('h-5 w-5 rounded-full', allGood ? 'bg-success-500' : 'bg-danger-500')} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={cx('text-[15px] font-bold', allGood ? 'text-primary-700' : 'text-danger-600')}>{t(allGood ? 'audit.sys.ok' : 'audit.sys.down')}</p>
          <p className="text-[12.5px] text-ink-soft">{t(allGood ? 'audit.sys.ok_body' : 'audit.sys.down_body')}</p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line/70 border-t border-line/70 text-[13px]">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-2">
            <r.icon className="h-4 w-4 text-ink-soft" aria-hidden />
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium', TEXT[r.level])}>
              <span className={cx('h-2 w-2 rounded-full', DOT[r.level])} aria-hidden />
              {r.state}
            </span>
            <span className="whitespace-nowrap text-right text-[12px] text-ink-soft">{r.right}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
