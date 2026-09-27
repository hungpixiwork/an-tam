import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Landmark, Mail, NotebookPen, Plus, Sheet, type LucideIcon } from 'lucide-react';
import type { IntegrationInfo } from '@shared/types/api';
import { Button, ErrorState, FormAlert, MenuButton, Modal, Skeleton, TextInput, cx } from '@/components/ui';
import { connectGoogleUrl, useIntegrations, useLinkBank, useUnlinkBank, useVerifyBank } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { relativeTime } from './util';

type State = 'connected' | 'disconnected' | 'pending' | 'error';
const DOT: Record<State, string> = { connected: 'bg-success-500', disconnected: 'bg-slate-300', pending: 'bg-warning-500', error: 'bg-danger-500' };
const PILL: Record<State, string> = { connected: 'bg-success-50 text-success-600', disconnected: 'bg-slate-100 text-ink-soft', pending: 'bg-warning-50 text-warning-600', error: 'bg-danger-50 text-danger-600' };
const BANKS = ['VCB', 'TCB', 'MB', 'ACB', 'BIDV', 'VPB', 'TPB', 'VTB'];
const GRID = 'lg:grid-cols-[minmax(220px,1.6fr)_120px_minmax(150px,1.2fr)_minmax(150px,1.1fr)_84px_28px]';

interface AppRow {
  key: string;
  icon: LucideIcon;
  iconClass: string;
  name: string;
  desc: string;
  state: State;
  scope: string;
  updated: string;
  action: { label: string; onClick?: () => void; disabled?: boolean; variant?: 'soft' | 'outline' };
  menu?: { label: string; onSelect: () => void }[];
}

/** Ứng dụng & tích hợp: Google Calendar (thật), ngân hàng SePay (thật), Gmail / Sheets / Notion (sắp có). Neo #integrations. */
export function IntegrationsCard() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { data, error, refetch, isPending } = useIntegrations();
  const verify = useVerifyBank();
  const unlink = useUnlinkBank();
  const [modal, setModal] = useState<'choose' | 'link' | null>(null);

  const google = data?.items.find((i) => i.provider === 'google');
  const sepay = data?.items.find((i) => i.provider === 'sepay');
  const since = (iso: string | null | undefined) => (iso ? relativeTime(iso, locale) : t('audit.int.never'));
  const soon = (key: string, icon: LucideIcon, iconClass: string): AppRow => ({
    key, icon, iconClass, name: t(`audit.int.${key}`), desc: t(`audit.int.${key}_desc`), state: 'disconnected', scope: t(`audit.int.scope_${key}`), updated: '—',
    action: { label: t('audit.int.soon'), disabled: true },
  });

  const rows: AppRow[] = [];
  if (google) rows.push(googleRow(google));
  rows.push(soon('gmail', Mail, 'text-danger-500'), soon('sheets', Sheet, 'text-success-600'));
  if (sepay) rows.push(bankRow(sepay));
  rows.push(soon('notion', NotebookPen, 'text-ink'));

  function googleRow(g: IntegrationInfo): AppRow {
    const state: State = g.status === 'connected' ? 'connected' : g.status === 'error' ? 'error' : 'disconnected';
    return {
      key: 'google', icon: CalendarDays, iconClass: 'text-accent-600', name: t('audit.int.google'), desc: t('audit.int.google_desc'), state,
      scope: t('audit.int.scope_google'), updated: state === 'disconnected' ? '—' : since(g.lastSyncedAt),
      action: state === 'connected'
        ? { label: t('audit.int.manage'), onClick: () => navigate('/lich-ai') }
        : { label: t('audit.int.connect'), onClick: () => (g.configured ? window.location.assign(connectGoogleUrl('/nhat-ky-ai')) : navigate('/lich-ai')) },
    };
  }

  function bankRow(s: IntegrationInfo): AppRow {
    const b = s.bank;
    const state: State = !b ? 'disconnected' : b.status === 'active' ? 'connected' : 'pending';
    return {
      key: 'bank', icon: Landmark, iconClass: 'text-primary-700', name: b ? `${t('audit.int.bank')} · ${b.bankCode}` : t('audit.int.bank'),
      desc: b ? `${b.accountMasked} · ${t('audit.int.bank_desc')}` : t('audit.int.bank_desc'), state, scope: t('audit.int.scope_bank'),
      updated: !b ? '—' : state === 'pending' ? (b.events ? t('audit.int.bank_pending', { n: b.events }) : t('audit.int.bank_waiting')) : since(b.lastEventAt),
      action: !b
        ? { label: t('audit.int.link'), onClick: () => setModal('link') }
        : state === 'pending'
          ? { label: t('audit.int.verify'), onClick: () => verify.mutate(), disabled: verify.isPending, variant: 'outline' }
          : { label: t('audit.int.manage'), onClick: () => navigate('/thu-chi') },
      menu: b ? [{ label: t('audit.int.unlink'), onSelect: () => unlink.mutate() }] : undefined,
    };
  }

  return (
    <section id="integrations" className="min-w-0 scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="int-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="int-title" className="text-[19px] font-bold text-ink">{t('audit.int.title')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">{t('audit.int.subtitle')}</p>
        </div>
        <Button variant="soft" size="sm" icon={Plus} onClick={() => setModal('choose')}>{t('audit.int.connect_app')}</Button>
      </div>

      {isPending ? (
        <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <ul className="divide-y divide-line/70 text-[13px]">
          {rows.map((r) => (
            <li key={r.key} className={cx('grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5', GRID)}>
              <div className="flex min-w-0 items-center gap-3">
                <r.icon className={cx('h-7 w-7 shrink-0', r.iconClass)} strokeWidth={2} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{r.name}</p>
                  <p className="truncate text-[12px] text-ink-soft">{r.desc}</p>
                </div>
              </div>
              <span className={cx('inline-flex h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold', PILL[r.state])}>
                <span className={cx('h-2 w-2 rounded-full', DOT[r.state])} aria-hidden />
                {t(`audit.int.state_${r.state}`)}
              </span>
              <p className="col-span-2 text-ink-soft lg:col-span-1"><span className="mr-1">{t('audit.int.scope')}</span><span className="text-ink">{r.scope}</span></p>
              <p className="text-ink-soft"><span className="mr-1">{t('audit.int.updated')}</span><span className="text-ink">{r.updated}</span></p>
              <Button variant={r.action.variant ?? 'soft'} size="sm" onClick={r.action.onClick} disabled={r.action.disabled} className="h-8 px-3 text-[12.5px]">{r.action.label}</Button>
              {r.menu ? <MenuButton label={t('audit.int.more')} items={r.menu} /> : <span aria-hidden />}
            </li>
          ))}
        </ul>
      )}
      {verify.error && <p role="alert" className="mt-2 text-[12.5px] text-danger-600">{verify.error.message}</p>}
      {verify.isSuccess && <p role="status" className="mt-2 text-[12.5px] text-success-600">{t('audit.int.verified')}</p>}

      {modal === 'choose' && (
        <Modal title={t('audit.int.choose_title')} onClose={() => setModal(null)}>
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.key}
                type="button"
                disabled={r.action.disabled || r.state === 'connected'}
                onClick={() => (setModal(null), r.action.onClick?.())}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <r.icon className={cx('h-6 w-6 shrink-0', r.iconClass)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{r.name}</span>
                  <span className="block text-[12px] text-ink-soft">{r.desc}</span>
                </span>
                <span className="text-[12.5px] font-semibold text-accent-700">{r.state === 'connected' ? t('audit.int.state_connected') : r.action.label}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'link' && <LinkBankModal onClose={() => setModal(null)} />}
    </section>
  );
}

function LinkBankModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const link = useLinkBank();
  const [bankCode, setBankCode] = useState(BANKS[0]);
  const [account, setAccount] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await link.mutateAsync({ bankCode, accountNumber: account });
    onClose();
  };
  return (
    <Modal title={t('audit.int.link_title')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-[13px] font-medium text-ink">
          {t('audit.int.link_bank')}
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px]">
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-ink">
          {t('audit.int.link_account')}
          <TextInput inputMode="numeric" autoComplete="off" value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1.5" required />
        </label>
        <p className="rounded-lg bg-accent-50 px-3 py-2 text-[12.5px] leading-relaxed text-accent-700">{t('audit.int.link_hint')}</p>
        {link.error ? <FormAlert error={link.error} /> : null}
        <div className="flex justify-end">
          <Button type="submit" variant="accent" size="sm" disabled={link.isPending || !account.trim()}>{t('audit.int.link_submit')}</Button>
        </div>
      </form>
    </Modal>
  );
}
