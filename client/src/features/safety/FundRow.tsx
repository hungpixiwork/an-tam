// Hàng 2 — Quỹ an toàn + mục tiêu đề xuất (6/12 tháng) · Nếu mất việc hôm nay.

import type { ReactNode } from 'react';
import { ArrowRight, CircleCheck, Frown, Info, ShieldCheck, Smile } from 'lucide-react';
import type { SafetyData, SafetyPlan, SafetyStatus } from '@shared/types/api';
import { formatVndFull } from '@shared/format';
import { Button, ButtonLink, FormAlert, IconTile, ScoreRing, Stepper, TONE_HEX, cx, type ExtTone } from '@/components/ui';
import { useApplySafetyTarget } from '@/lib/queries';
import { useLocale } from '@/app/locale';

export const decimal = (v: number, locale: string) => (locale === 'vi' ? String(v).replace('.', ',') : String(v));

function InfoTip({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} role="img" className="inline-flex shrink-0 text-ink-mute">
      <Info className="h-4 w-4" aria-hidden />
    </span>
  );
}

function Row({ dot, label, value }: { dot: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />
      <span className="min-w-0 flex-1 text-[13px] text-ink">{label}</span>
      <span className="shrink-0 text-[16px] font-extrabold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function FundSummary({ data }: { data: SafetyData }) {
  const { t, locale } = useLocale();
  const { fund } = data;
  const months = decimal(fund.months, locale);
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start gap-3">
        <IconTile icon={ShieldCheck} tone="green" size="sm" />
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-1.5 text-[17px] font-bold leading-snug text-ink">
            {t('safety.fund.title')} <span className="font-semibold">{t('safety.fund.title_sub')}</span>
            <InfoTip text={t('safety.fund.info')} />
          </h2>
          <p className="mt-0.5 text-[12.5px] sm:text-[13px] text-ink-soft leading-relaxed">{t('safety.fund.desc')}</p>
        </div>
      </div>
      {!data.ready ? (
        <p className="mt-6 text-[14px] text-ink-soft">
          {t('safety.fund.empty')}{' '}
          <ButtonLink to="/cai-dat#tai-chinh" variant="ghost" size="sm" arrow>
            {t('safety.fund.empty_cta')}
          </ButtonLink>
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <ScoreRing score={Math.min(fund.months, 6)} max={6} size={124} stroke={15} color={TONE_HEX.green} label={`${t('safety.fund.ring_label')}: ${months}`}>
            <span className="text-[32px] font-extrabold leading-none text-ink">{months}</span>
            <span className="mt-1 text-[15px] text-ink">{t('safety.months')}</span>
          </ScoreRing>
          <div className="w-full min-w-0 flex-1 space-y-3.5">
            <Row dot={TONE_HEX.green} label={t('safety.fund.have')} value={formatVndFull(fund.amount)} />
            <Row dot="#F2745F" label={t('safety.fund.need')} value={formatVndFull(fund.gap6)} />
            <p className="flex items-start gap-2.5 rounded-xl bg-[#EEF8F2] px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden />
              {t(fund.gap6 > 0 ? 'safety.fund.note' : 'safety.fund.note_ok', { months })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, primary }: { plan: SafetyPlan; primary: boolean }) {
  const { t } = useLocale();
  const apply = useApplySafetyTarget();
  const tone: ExtTone = primary ? 'blue' : 'green';
  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-white p-3 shadow-card">
      <div className="flex items-start gap-2.5">
        <IconTile icon={ShieldCheck} tone={tone} size="sm" />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-ink">{t('safety.plans.reach', { n: plan.months })}</p>
          <p className="whitespace-nowrap text-[12px] text-ink-soft">{plan.gap > 0 ? t('safety.plans.need', { amount: formatVndFull(plan.gap) }) : t('safety.plans.done')}</p>
        </div>
      </div>
      {plan.gap > 0 && (
        <p className={cx('mt-3 whitespace-pre-line rounded-lg px-3 py-2 text-[12px] font-medium leading-relaxed', primary ? 'bg-[#EAF2FE] text-accent-700' : 'bg-[#EAF7EF] text-success-700')}>
          {t('safety.plans.save', { amount: formatVndFull(plan.monthly), n: plan.duration })}
        </p>
      )}
      <div className="mt-auto pt-3">
        {plan.active ? (
          <span className="inline-flex h-9 items-center gap-1.5 text-[13px] font-semibold text-success-700">
            <CircleCheck className="h-4 w-4" aria-hidden />
            {t('safety.plans.active')}
          </span>
        ) : (
          <Button
            size="sm"
            variant={primary ? 'accent' : 'white'}
            className={primary ? undefined : 'border-success-600/40 text-success-700 hover:bg-success-50'}
            disabled={apply.isPending}
            onClick={() => apply.mutate({ months: plan.months })}
            arrow
          >
            {apply.isPending ? t('safety.plans.busy') : t('safety.plans.cta')}
          </Button>
        )}
        <FormAlert error={apply.error} />
      </div>
    </div>
  );
}

function PlansPanel({ data, onAdjust }: { data: SafetyData; onAdjust: () => void }) {
  const { t } = useLocale();
  return (
    <div className="min-w-0 rounded-2xl bg-[#F3F7FD] p-3 lg:w-[432px] lg:shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-[14.5px] font-bold text-ink">{t('safety.plans.title')}</h3>
        <button type="button" onClick={onAdjust} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-600 hover:text-accent-700">
          {t('safety.plans.adjust')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.plans.map((p, i) => (
          <PlanCard key={p.months} plan={p} primary={i === 0} />
        ))}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<SafetyStatus, { tone: ExtTone; box: string; text: string }> = {
  danger: { tone: 'red', box: 'bg-[#FDECEC]', text: 'text-danger-600' },
  unsafe: { tone: 'red', box: 'bg-[#FDEEEE]', text: 'text-danger-600' },
  safe: { tone: 'green', box: 'bg-[#EAF7EF]', text: 'text-success-700' },
  very_safe: { tone: 'green', box: 'bg-[#EAF7EF]', text: 'text-success-700' },
};

function JobLossCard({ data }: { data: SafetyData }) {
  const { t, locale } = useLocale();
  const { jobLoss } = data;
  const st = STATUS_TONE[jobLoss.status];
  const Face = jobLoss.status === 'danger' || jobLoss.status === 'unsafe' ? Frown : Smile;
  const reached = (m: number) => jobLoss.months >= m;
  return (
    <section aria-labelledby="jobloss-h" className="min-w-0 rounded-2xl border border-[#F6E1E1] bg-gradient-to-b from-[#FFF8F8] to-white p-5 shadow-card">
      <h2 id="jobloss-h" className="flex items-center gap-1.5 text-[17px] font-bold text-ink">
        {t('safety.jobloss.title')}
        <InfoTip text={t('safety.jobloss.info')} />
      </h2>
      {!data.ready ? (
        <p className="mt-3 text-[13px] text-ink-soft">{t('safety.fund.empty')}</p>
      ) : (
      <>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">{t('safety.jobloss.sub', { amount: formatVndFull(data.essentialMonthly) })}</p>
      <div className={cx('mt-4 flex items-center gap-4 rounded-xl px-4 py-4', st.box)}>
        <span className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70', st.text)}>
          <Face className="h-8 w-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={cx('text-[16px] font-bold', st.text)}>{t(`safety.jobloss.status.${jobLoss.status}`)}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">
            {t('safety.jobloss.body', { months: decimal(jobLoss.months, locale) })}
            <br />
            {t(`safety.jobloss.hint.${jobLoss.status}`)}
          </p>
        </div>
      </div>
      <Stepper
        className="mt-5"
        tone={st.tone}
        currentTone={st.tone}
        ariaLabel={t('safety.jobloss.title')}
        steps={jobLoss.steps.map((s) => ({
          label: t(`safety.jobloss.step.${s.key}`),
          sub: t('safety.months_n', { n: decimal(s.months, locale) }),
          state: s.key === 'current' ? 'current' : reached(s.months) ? 'done' : 'todo',
        }))}
      />
      </>
      )}
    </section>
  );
}

export function FundRow({ data, onAdjust }: { data: SafetyData; onAdjust: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[965fr_428fr]">
      <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-card lg:flex-row">
        <FundSummary data={data} />
        {data.ready && <PlansPanel data={data} onAdjust={onAdjust} />}
      </section>
      <JobLossCard data={data} />
    </div>
  );
}
