import { useState } from 'react';
import { CalendarDays, CalendarX2, CircleAlert, Link2, RefreshCw } from 'lucide-react';
import type { CalendarSyncInfo } from '@shared/types/api';
import { Badge, Button, IconTile, MenuButton, Modal, cx } from '@/components/ui';
import { connectGoogleUrl, useDisconnectGoogle, useSyncCalendar } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { relativeTime } from './util';

/** Đồng bộ Google Calendar: đã kết nối (đồng bộ ngay) · chưa kết nối (Kết nối) · máy chủ chưa cấu hình (hướng dẫn). */
export function GoogleSyncCard({ sync, week, flash }: { sync: CalendarSyncInfo; week: string; flash: 'connected' | 'error' | null }) {
  const { t, locale } = useLocale();
  const doSync = useSyncCalendar();
  const disconnect = useDisconnectGoogle();
  const [guide, setGuide] = useState(false);
  const connected = sync.configured && sync.status === 'connected';
  const badge = !sync.configured
    ? <Badge tone="gray" size="sm">{t('calendar.sync.not_configured')}</Badge>
    : sync.status === 'connected'
      ? <Badge tone="green" size="sm" icon={RefreshCw}>{t('calendar.sync.connected')}</Badge>
      : sync.status === 'error'
        ? <Badge tone="red" size="sm">{t('calendar.sync.error')}</Badge>
        : <Badge tone="gray" size="sm">{t('calendar.sync.disconnected')}</Badge>;

  const go = () => window.location.assign(connectGoogleUrl('/lich-ai'));

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="gsync-title">
      <div className="mb-3 flex items-center gap-2.5">
        <IconTile icon={CalendarDays} tone="blue" size="sm" />
        <h2 id="gsync-title" className="min-w-0 flex-1 text-[16px] font-bold text-ink">{t('calendar.sync.title')}</h2>
        {badge}
        {connected && <MenuButton label={t('calendar.sync.more')} items={[{ label: t('calendar.sync.disconnect'), onSelect: () => disconnect.mutate(), disabled: disconnect.isPending }]} />}
      </div>

      {flash && (
        <p role="status" className={cx('mb-3 rounded-lg px-3 py-2 text-[12.5px] font-medium', flash === 'connected' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
          {t(flash === 'connected' ? 'calendar.sync.flash_connected' : 'calendar.sync.flash_error')}
        </p>
      )}

      {connected ? (
        <div className="flex items-center gap-3 rounded-xl px-1">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success-50 text-success-600">
            <RefreshCw className={cx('h-6 w-6', doSync.isPending && 'animate-spin')} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">{t('calendar.sync.ok')}</p>
            <p className="text-[12.5px] text-ink-soft">{sync.lastSyncedAt ? t('calendar.sync.last', { time: relativeTime(sync.lastSyncedAt, locale) }) : t('calendar.sync.never')}</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => doSync.mutate(week)} disabled={doSync.isPending}>
            {t('calendar.sync.now')}
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ) : sync.configured ? (
        <div className="flex items-center gap-3 px-1">
          <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-full', sync.status === 'error' ? 'bg-danger-50 text-danger-600' : 'bg-accent-50 text-accent-600')}>
            {sync.status === 'error' ? <CircleAlert className="h-6 w-6" aria-hidden /> : <Link2 className="h-6 w-6" aria-hidden />}
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-soft">{sync.status === 'error' && sync.lastError ? sync.lastError : t('calendar.sync.connect_hint')}</p>
          <Button variant="soft" size="sm" onClick={go}>{t(sync.status === 'error' ? 'calendar.sync.reconnect' : 'calendar.sync.connect')}</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setGuide(true)} className="flex w-full items-center gap-3 rounded-xl px-1 text-left">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-100 text-ink-soft">
            <CalendarX2 className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-accent-700 underline-offset-2 hover:underline">{t('calendar.sync.setup_title')}</span>
            <span className="block text-[12.5px] text-ink-soft">{t('calendar.sync.setup_hint')}</span>
          </span>
        </button>
      )}

      {doSync.error && <p role="alert" className="mt-2 text-[12.5px] text-danger-600">{doSync.error.message}</p>}
      {doSync.data && <p role="status" className="mt-2 text-[12.5px] text-success-600">{t('calendar.sync.result', { pulled: doSync.data.pulled, pushed: doSync.data.pushed })}</p>}

      {guide && (
        <Modal title={t('calendar.sync.guide_title')} onClose={() => setGuide(false)}>
          <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-ink">
            <li>{t('calendar.sync.guide_1')}</li>
            <li className="break-all">{t('calendar.sync.guide_2', { url: `${window.location.origin}/api/integrations/google/callback` })}</li>
            <li>{t('calendar.sync.guide_3')}</li>
            <li>{t('calendar.sync.guide_4')}</li>
          </ol>
        </Modal>
      )}
    </section>
  );
}
