import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, BarChart3, CalendarDays, CircleCheck, FlaskConical, Sparkles, Target, Layers, type LucideIcon } from 'lucide-react';
import type { WhatIfPresetKey, WhatIfResult } from '@shared/types/api';
import { formatVnd, formatVndFull } from '@shared/format';
import { Button, FormAlert, MoneyInput, Select, cx } from '@/components/ui';
import { useLocale } from '@/app/locale';
import { useWhatIf, type WhatIfRequest } from '@/lib/queries';

const PRESETS: WhatIfPresetKey[] = ['global_etf', 'vn_etf', 'tech_stock', 'bond', 'gold', 'real_estate'];
const SOURCES = [
  { value: 'investable_cash', label: 'Tiền mặt khả dụng' },
  { value: 'sell_holding', label: 'Bán bớt cổ phiếu công ty' },
  { value: 'emergency_reserve', label: 'Trích từ quỹ dự phòng' },
] as const;

const YEARS = [1, 3, 5, 10];
const DEFAULT: WhatIfRequest = {
  preset: 'global_etf',
  amount: 50_000_000,
  holdingMonths: 60,
  sourceOfFunds: 'investable_cash',
};

const decimal = (v: number, locale: string) => (locale === 'vi' ? String(v).replace('.', ',') : String(v));

function ResultTile({
  icon: Icon,
  label,
  from,
  to,
  unit,
  note,
  good,
}: {
  icon: LucideIcon;
  label: string;
  from: ReactNode;
  to: ReactNode;
  unit?: string;
  note: string;
  good: boolean | null;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-line bg-white p-2.5">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Icon className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
        <span className="leading-tight">{label}</span>
      </p>
      <p className="mt-1.5 whitespace-nowrap text-[17px] font-bold text-ink tabular-nums">
        {from} <span className="text-success-600">→</span> {to}
        {unit && <span className="ml-1 text-[12px] font-semibold">{unit}</span>}
      </p>
      <span
        className={cx(
          'mt-2 inline-flex w-fit max-w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
          good === null ? 'bg-slate-100 text-ink-soft' : good ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-600',
        )}
      >
        <CircleCheck className="h-3 w-3 shrink-0" aria-hidden />
        <span className="leading-tight">{note}</span>
      </span>
    </div>
  );
}

function Results({ r }: { r: WhatIfResult }) {
  const { t, locale } = useLocale();
  const dC = r.deltas.concentration;
  const dR = r.deltas.runwayMonths;
  const gB = r.before.goalProbability;
  const gA = r.after.goalProbability;
  const dG = r.deltas.goalProbability;
  const cOB = r.before.careerOverlap;
  const cOA = r.after.careerOverlap;
  const dCO = r.deltas.careerOverlap;

  const note = (d: number, fmt: (n: number) => string) =>
    d === 0 ? t('portfolio.whatif.same') : t(d < 0 ? 'portfolio.whatif.down' : 'portfolio.whatif.up', { n: fmt(Math.abs(d)) });

  return (
    <div className="space-y-2.5">
      {r.status === 'insufficient_funds' && r.shortfall && r.shortfall > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-[12.5px] text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" aria-hidden />
          <div>
            <p className="font-bold">Nguồn vốn không đủ</p>
            <p className="mt-0.5 leading-snug">
              Bạn đang cần thêm {formatVndFull(r.shortfall)} để thực hiện phân bổ này từ nguồn đã chọn.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <ResultTile
          icon={BarChart3}
          label={t('portfolio.whatif.concentration')}
          from={r.before.concentration}
          to={r.after.concentration}
          note={note(dC, String)}
          good={dC === 0 ? null : dC < 0}
        />
        <ResultTile
          icon={CalendarDays}
          label={t('portfolio.whatif.runway')}
          from={decimal(r.before.runwayMonths, locale)}
          to={decimal(r.after.runwayMonths, locale)}
          unit={t('portfolio.whatif.months')}
          note={note(dR, (n) => `${decimal(n, locale)} ${t('portfolio.whatif.months')}`)}
          good={dR === 0 ? null : dR > 0}
        />
        <ResultTile
          icon={Target}
          label={t('portfolio.whatif.goal')}
          from={gB === null ? '—' : `${Math.round(gB * 100)}%`}
          to={gA === null ? '—' : `${Math.round(gA * 100)}%`}
          note={dG !== null && dG > 0.005 ? t('portfolio.whatif.goal_up') : t('portfolio.whatif.same')}
          good={dG !== null && dG > 0.005 ? true : null}
        />
      </div>

      {typeof cOB === 'number' && typeof cOA === 'number' && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-slate-50/80 px-3.5 py-2.5 text-[12.5px]">
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <Layers className="h-4 w-4 text-violet-600" aria-hidden />
            Trùng lặp kỹ năng & danh mục:
          </span>
          <span className="font-bold text-ink tabular-nums">
            {(cOB * 100).toFixed(1)}% <span className="text-success-600">→</span> {(cOA * 100).toFixed(1)}%
            {typeof dCO === 'number' && dCO !== 0 && (
              <span className={cx('ml-2 text-[11.5px] font-semibold', dCO < 0 ? 'text-success-700' : 'text-danger-600')}>
                ({dCO < 0 ? 'Giảm' : 'Tăng'} {Math.abs(dCO * 100).toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** H5 — "Thử trước khi đầu tư": form → POST /api/portfolio/what-if → trước/sau + gợi ý AI. */
export function WhatIfCard() {
  const { t } = useLocale();
  const [draft, setDraft] = useState<WhatIfRequest>(DEFAULT);
  const [submitted, setSubmitted] = useState<WhatIfRequest>(DEFAULT);
  const [simple, setSimple] = useState(false);
  const q = useWhatIf(submitted);
  const r = q.data;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSimple(false);
    setSubmitted({ ...draft });
  }

  const years = submitted.holdingMonths / 12;
  return (
    <section className="grid grid-cols-1 gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card xl:grid-cols-[minmax(0,1fr)_420px_270px]" aria-labelledby="whatif-title">
      <form onSubmit={onSubmit} className="min-w-0">
        <div className="flex gap-3.5 rounded-xl bg-sky-50/70 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-600">
            <FlaskConical className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="whatif-title" className="text-[17px] font-bold text-ink">{t('portfolio.whatif.title')}</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{t('portfolio.whatif.subtitle')}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-2.5">
          <label className="block min-w-0">
            <span className="mb-1.5 block whitespace-nowrap text-[12.5px] text-ink-soft">{t('portfolio.whatif.asset')}</span>
            <Select
              label={t('portfolio.whatif.asset')}
              value={draft.preset}
              onChange={(preset) => setDraft({ ...draft, preset })}
              options={PRESETS.map((p) => ({ value: p, label: t(`portfolio.whatif.preset.${p}`) }))}
              className="h-11 w-full"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block whitespace-nowrap text-[12.5px] text-ink-soft">Nguồn vốn</span>
            <Select
              label="Nguồn vốn"
              value={draft.sourceOfFunds || 'investable_cash'}
              onChange={(s) => setDraft({ ...draft, sourceOfFunds: s as any })}
              options={SOURCES.map((s) => ({ value: s.value, label: s.label }))}
              className="h-11 w-full"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block whitespace-nowrap text-[12.5px] text-ink-soft">{t('portfolio.whatif.amount')}</span>
            <MoneyInput value={draft.amount} onChange={(amount) => setDraft({ ...draft, amount })} showHint={false} label={t('portfolio.whatif.amount')} />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block whitespace-nowrap text-[12.5px] text-ink-soft">{t('portfolio.whatif.hold')}</span>
            <Select
              label={t('portfolio.whatif.hold')}
              value={draft.holdingMonths / 12}
              onChange={(y) => setDraft({ ...draft, holdingMonths: y * 12 })}
              options={YEARS.map((y) => ({ value: y, label: t('portfolio.whatif.years', { n: y }) }))}
              className="h-11 w-full"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="submit" className="h-10 whitespace-nowrap px-4" disabled={draft.amount <= 0 || q.isFetching}>
            {t('portfolio.whatif.submit')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <FormAlert error={q.error} />
      </form>

      <div className="min-w-0" aria-live="polite">
        <p className="mb-2.5 text-[14px] font-bold text-ink">{t('portfolio.whatif.result')}</p>
        {r ? <Results r={r} /> : <div className="h-[118px] animate-pulse rounded-xl bg-slate-100" />}
      </div>

      <div className="flex min-w-0 flex-col rounded-xl bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
          {t('portfolio.ai.title')}
        </p>
        <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-ink-soft">
          {r ? (simple ? r.explain.join(' ') + ' ' + t('portfolio.ai.projected', { years, expected: formatVnd(r.projected.expected), worst: formatVnd(r.projected.worstCase) }) : r.advice) : '…'}
        </p>
        <button
          type="button"
          onClick={() => setSimple((s) => !s)}
          disabled={!r}
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-amber-500 disabled:opacity-60"
        >
          {t('portfolio.ai.cta')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
