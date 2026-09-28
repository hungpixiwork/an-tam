// Chọn mẫu cú sốc (3 thẻ) + "Thiết lập cú sốc kép": rủi ro nghề nghiệp, tác động đến công ty, tác động đến tài sản, khung phân tích.

import { BarChart3, Briefcase, BriefcaseBusiness, Building2, CircleCheck, Info, LineChart, RotateCcw, Wallet, type LucideIcon } from 'lucide-react';
import type { DecisionMode, DecisionShock, DecisionShockParams } from '@shared/types/api/decision';
import type { Sector } from '@shared/types/domain';
import { Button, RangeField, Select, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';

const SECTORS: Sector[] = ['technology', 'finance', 'real_estate', 'manufacturing', 'consumer', 'healthcare', 'education_public', 'other'];
const SHOCKS: { shock: DecisionShock; icon: LucideIcon; tone: string }[] = [
  { shock: 'industry', icon: LineChart, tone: 'bg-[#EDF4FF] text-accent-600' },
  { shock: 'job_loss', icon: BriefcaseBusiness, tone: 'bg-[#EDF4FF] text-accent-600' },
  { shock: 'market', icon: BarChart3, tone: 'bg-rose-50 text-rose-500' },
];
const MODES: DecisionMode[] = ['bull', 'base', 'bear'];

export function ShockPresets({ value, onPick }: { value: DecisionShock; onPick: (s: DecisionShock) => void }) {
  const { t } = useLocale();
  return (
    <div className="grid gap-2.5 md:grid-cols-3" role="radiogroup" aria-label={t('simulation.shock.label')}>
      {SHOCKS.map(({ shock, icon: Icon, tone }) => {
        const active = value === shock;
        return (
          <button
            key={shock}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(shock)}
            className={cx(
              'relative flex min-w-0 items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700',
              active ? 'border-accent-600 ring-1 ring-accent-600' : 'border-line hover:border-accent-200',
            )}
          >
            <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', tone)}><Icon className="h-6 w-6" aria-hidden /></span>
            <span className="min-w-0 pr-5">
              <strong className="block text-[14.5px] text-ink">{t(`simulation.shock.${shock}`)}</strong>
              <small className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{t(`simulation.shock.${shock}_hint`)}</small>
            </span>
            {active && <CircleCheck className="absolute right-3 top-3 h-5 w-5 fill-accent-600 text-white" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

function Group({ icon: Icon, title, children, info }: { icon: LucideIcon; title: string; children: React.ReactNode; info?: string }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-line p-3">
      <legend className="sr-only">{title}</legend>
      <div className="mb-2.5 flex min-h-9 items-center gap-1.5 rounded-lg bg-[#F6F9FC] px-2 py-1.5" aria-hidden>
        <Icon className="h-4 w-4 text-accent-600" />
        <span className="text-[12.5px] font-bold leading-tight text-ink">{title}</span>
        {info && <Info className="ml-auto h-3.5 w-3.5 text-ink-mute" aria-label={info} />}
      </div>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export function ShockSetup({ params, onChange, mode, onMode, onReset }: {
  params: DecisionShockParams; onChange: (p: DecisionShockParams) => void; mode: DecisionMode; onMode: (m: DecisionMode) => void; onReset: () => void;
}) {
  const { t } = useLocale();
  const set = <K extends keyof DecisionShockParams>(k: K) => (v: DecisionShockParams[K]) => onChange({ ...params, [k]: v });
  const pct = (v: number) => `${v}%`;
  const drop = (v: number) => (v ? `-${v}%` : '0%');
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="setup-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="setup-title" className="flex items-center gap-1.5 text-[17px] font-bold text-ink">{t('simulation.setup.title')}<Info className="h-4 w-4 text-ink-mute" aria-hidden /></h2>
          <p className="text-[12.5px] text-ink-soft">{t('simulation.setup.subtitle')}</p>
        </div>
        <Button variant="white" size="sm" icon={RotateCcw} onClick={onReset}>{t('simulation.setup.reset')}</Button>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Group icon={Briefcase} title={t('simulation.setup.career')}>
          <div>
            <p className="mb-1 text-[12.5px] text-ink">{t('simulation.setup.sector')}</p>
            <Select value={params.sector} onChange={(v) => set('sector')(v as Sector)} label={t('simulation.setup.sector')} options={SECTORS.map((s) => ({ value: s, label: t(`simulation.sector.${s}`) }))} className="w-full" />
          </div>
          <RangeField label={t('simulation.setup.prob')} value={params.disruptionProbPct} min={0} max={100} step={5} onChange={set('disruptionProbPct')} format={pct} minLabel={t('simulation.setup.low')} maxLabel={t('simulation.setup.high')} />
          <RangeField label={t('simulation.setup.months')} value={params.monthsNoIncome} min={3} max={24} onChange={set('monthsNoIncome')} format={(v) => t('simulation.months', { n: v })} minLabel={t('simulation.months', { n: 3 })} maxLabel={t('simulation.months', { n: 24 })} />
        </Group>
        <Group icon={Building2} title={t('simulation.setup.company')}>
          <RangeField label={t('simulation.setup.bonus')} value={params.bonusCutPct} min={0} max={100} step={5} onChange={set('bonusCutPct')} format={pct} minLabel="0%" maxLabel="100%" />
          <RangeField label={t('simulation.setup.esop')} value={params.esopCutPct} min={0} max={100} step={5} onChange={set('esopCutPct')} format={pct} minLabel="0%" maxLabel="100%" />
        </Group>
        <Group icon={Wallet} title={t('simulation.setup.assets')}>
          <RangeField label={t('simulation.setup.employer')} value={params.employerStockDropPct} min={0} max={80} step={5} onChange={set('employerStockDropPct')} format={drop} minLabel="0%" maxLabel="-80%" color="#2F7BEA" />
          <RangeField label={t('simulation.setup.sector_drop')} value={params.sectorDropPct} min={0} max={80} step={5} onChange={set('sectorDropPct')} format={drop} minLabel="0%" maxLabel="-80%" />
          <RangeField label={t('simulation.setup.market')} value={params.marketDropPct} min={0} max={60} step={5} onChange={set('marketDropPct')} format={drop} minLabel="0%" maxLabel="-60%" />
        </Group>
        <Group icon={BarChart3} title={t('simulation.setup.frame')} info={t('simulation.setup.frame_info')}>
          <div role="radiogroup" aria-label={t('simulation.setup.frame')} className="space-y-1.5">
            {MODES.map((m) => (
              <label key={m} className={cx('flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2', mode === m ? 'bg-[#EAF7F0]' : 'hover:bg-slate-50')}>
                <input type="radio" name="frame" checked={mode === m} onChange={() => onMode(m)} className="mt-1 accent-[#0B7A55]" />
                <span className="min-w-0">
                  <strong className="text-[13px] text-ink">{t(`simulation.mode.${m}`)}</strong> <span className="text-[12px] text-ink-soft">{t(`simulation.mode.${m}_tag`)}</span>
                  <small className="block text-[11.5px] leading-snug text-ink-soft">{t(`simulation.mode.${m}_hint`)}</small>
                </span>
              </label>
            ))}
          </div>
        </Group>
      </div>
    </section>
  );
}
