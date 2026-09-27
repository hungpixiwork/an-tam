import { BookOpen, ChevronRight, CircleCheck, CircleDollarSign, Clock3, GraduationCap, Info, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OverviewData, PinnedLifeChoice } from '@shared/types/api';
import type { ResourceRings } from '@shared/engine/resources';
import { formatVndFull } from '@shared/format';
import { ButtonLink, DeltaBadge, EmptyState, IconTile, ProgressRing, SectionCard, StackedBar, Stepper, cx, type ExtTone } from '@/components/ui';
import { useAuth } from '@/app/auth';
import { useLocale } from '@/app/locale';

/* ───────── Tài sản hiện tại ───────── */

const NW_COLORS = { cash: '#22B07D', invested: '#2F6FED', other: '#F5B82E', debt: '#9B6CF0' } as const;

export function NetWorthCard({ nw }: { nw: OverviewData['netWorthBreakdown'] }) {
  const { t } = useLocale();
  const empty = nw.cash + nw.invested + nw.other + nw.debt === 0;
  return (
    <SectionCard title={t('overview.nw.title')} action={{ label: t('overview.nw.detail'), to: '/danh-muc', variant: 'pill' }}>
      {empty ? (
        <EmptyState
          compact
          icon={Wallet}
          title={t('overview.nw.empty_title')}
          body={t('overview.nw.empty_body')}
          action={
            <ButtonLink to="/danh-muc" variant="soft" size="sm" icon={Plus}>
              {t('overview.nw.add')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <p className="-mt-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
            {t('overview.nw.net')}
            <span title={t('overview.nw.net_info')} role="img" aria-label={t('overview.nw.net_info')} className="inline-flex text-ink-mute">
              <Info className="h-3.5 w-3.5" aria-hidden />
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cx('text-[28px] font-extrabold leading-tight tracking-tight tabular-nums', nw.net < 0 ? 'text-danger-600' : 'text-ink')}>{formatVndFull(nw.net)}</p>
            {nw.deltaPct !== null && (
              <>
                <DeltaBadge value={nw.deltaPct} className="h-6 text-xs" />
                <span className="text-[12.5px] text-ink-soft">{t('overview.nw.compare', { n: nw.compareMonths })}</span>
              </>
            )}
          </div>
          <StackedBar
            className="mt-4"
            height={14}
            ariaLabel={t('overview.nw.title')}
            formatValue={formatVndFull}
            legendClassName="!grid-cols-2 min-[1600px]:!grid-cols-4"
            segments={[
              { key: 'cash', label: t('overview.nw.cash'), value: nw.cash, color: NW_COLORS.cash },
              { key: 'invested', label: t('overview.nw.invested'), value: nw.invested, color: NW_COLORS.invested },
              { key: 'other', label: t('overview.nw.other'), value: nw.other, color: NW_COLORS.other },
              { key: 'debt', label: t('overview.nw.debt'), value: nw.debt, color: NW_COLORS.debt },
            ]}
          />
        </>
      )}
    </SectionCard>
  );
}

/* ───────── Phân bổ nguồn lực cuộc sống ───────── */

const RINGS = [
  { key: 'finance', icon: CircleDollarSign, tone: 'green', lowTone: 'amber' },
  { key: 'time', icon: Clock3, tone: 'blue', lowTone: 'rose' },
  { key: 'skill', icon: BookOpen, tone: 'orange', lowTone: 'amber' },
] as const satisfies readonly { key: keyof ResourceRings; icon: unknown; tone: ExtTone; lowTone: ExtTone }[];

/** Mốc "đang đi đúng hướng" của cả 3 vòng. */
const ON_TRACK = 70;

export function ResourcesCard({ rings }: { rings: ResourceRings }) {
  const { t } = useLocale();
  return (
    <SectionCard title={t('overview.res.title')}>
      <ul className="grid grid-cols-3 gap-2 pt-1">
        {RINGS.map((r) => {
          const v = rings[r.key];
          const label = t(`overview.res.${r.key}`);
          return (
            <li key={r.key} className="min-w-0">
              {v === null ? (
                <ProgressRing value={0} tone="gray" icon={r.icon} label={label} valueLabel="—" status={{ label: t('overview.res.no_data'), tone: 'gray' }} size={100} />
              ) : (
                <ProgressRing
                  value={v}
                  tone={r.tone}
                  icon={r.icon}
                  label={label}
                  size={100}
                  status={v >= ON_TRACK ? { label: t('overview.res.on_track'), tone: 'green' } : { label: t(`overview.res.${r.key}_low`), tone: r.lowTone }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/* ───────── Lựa chọn cuộc đời ───────── */

export function LifeChoiceCard({ choice, className }: { choice: PinnedLifeChoice | null; className?: string }) {
  const { t, locale } = useLocale();
  const { me } = useAuth();
  const s = me?.salutation ?? 'bạn';
  if (!choice) {
    return (
      <SectionCard title={t('overview.lc.title')} action={{ label: t('overview.lc.view_all'), to: '/lua-chon' }} className={className}>
        <EmptyState
          compact
          icon={GraduationCap}
          tone="violet"
          title={t('overview.lc.empty_title')}
          body={t('overview.lc.empty_body')}
          action={
            <ButtonLink to="/lua-chon" variant="soft" size="sm" icon={Plus}>
              {t('overview.lc.empty_cta')}
            </ButtonLink>
          }
        />
      </SectionCard>
    );
  }
  const r = choice.readiness;
  const months = String(r.reserveMonths);
  const box =
    r.ready
      ? { tone: 'bg-success-50 border-success-100', icon: CircleCheck, iconCls: 'text-success-600', title: t('overview.lc.ready'), body: t('overview.lc.ready_body', { months, s }) }
      : r.monthsNeeded === null
        ? { tone: 'bg-amber-50 border-amber-100', icon: Clock3, iconCls: 'text-amber-500', title: t('overview.lc.unknown'), body: t('overview.lc.unknown_body', { s }) }
        : {
            tone: 'bg-amber-50 border-amber-100',
            icon: Clock3,
            iconCls: 'text-amber-500',
            title: t('overview.lc.need', { n: r.monthsNeeded }),
            body: t('overview.lc.need_body', { s, amount: formatVndFull(r.requiredReserve), months }),
          };
  const BoxIcon = box.icon;
  return (
    <SectionCard title={t('overview.lc.title')} action={{ label: t('overview.lc.view_all'), to: '/lua-chon' }} className={className}>
      <div className="-mt-1 flex items-start gap-3">
        <IconTile icon={GraduationCap} tone="violet" size="md" />
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-snug text-ink">{choice.title}</p>
          {choice.description && <p className="mt-0.5 text-[12px] text-ink-soft">{choice.description}</p>}
        </div>
      </div>
      {choice.steps.length > 0 && (
        <Stepper
          className="mt-3"
          ariaLabel={t('overview.lc.steps')}
          steps={choice.steps.map((label, i) => ({ label, state: i < choice.currentStep ? 'done' : 'todo' }))}
        />
      )}
      <Link to="/quy-an-toan" className={cx('mt-3 flex items-center gap-2.5 rounded-xl border p-3 hover:brightness-[0.98]', box.tone)} lang={locale}>
        <BoxIcon className={cx('h-5 w-5 shrink-0 self-start', box.iconCls)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-ink">{box.title}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{box.body}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
      </Link>
    </SectionCard>
  );
}
