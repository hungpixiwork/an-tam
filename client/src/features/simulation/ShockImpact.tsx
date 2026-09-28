// Kết quả mô phỏng cú sốc kép (dùng chung cho trang xem trước và trang kết quả đã lưu):
// 4 ô tác động ước tính, biểu đồ số dư 24 tháng Bull/Base/Bear, tác động đến mục tiêu, tác động đến lựa chọn, gợi ý điều chỉnh.

import type { ReactNode } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDown, ArrowRight, BarChart3, BriefcaseBusiness, CalendarClock, GraduationCap, Hourglass, House, Info, PiggyBank, ShieldCheck, Sparkles, Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { DecisionGoalTile, DecisionMode, DecisionRange, DecisionSimulationResult } from '@shared/types/api/decision';
import { formatVnd } from '@shared/format';
import { cx } from '@/components/ui';
import { useLocale } from '@/app/locale';

const MODE_COLOR: Record<DecisionMode, string> = { bull: '#1FA16B', base: '#2F6FE0', bear: '#F28C28' };
const quarter = (m: string | null) => (m ? `${m.slice(0, 4)} Q${Math.ceil(Number(m.slice(5)) / 3)}` : '—');
const dec = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const range = (r: DecisionRange) => (r.min === r.max ? `${r.min}` : `${r.min} – ${r.max}`);

function Card({ title, subtitle, info, extra, children, className }: { title: string; subtitle?: string; info?: boolean; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-[16.5px] font-bold text-ink">{title}{info && <Info className="h-4 w-4 text-ink-mute" aria-hidden />}</h2>
        {extra}
      </div>
      {subtitle && <p className="text-[12px] text-ink-soft">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DeltaChip({ children, bad = true }: { children: ReactNode; bad?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-bold', bad ? 'bg-[#FDECEC] text-danger-600' : 'bg-[#E3F5EB] text-[#137A4F]')}>
      {bad && <ArrowDown className="h-3 w-3" aria-hidden />}{children}
    </span>
  );
}

function ImpactTile({ icon: Icon, tone, label, value, chip, sub }: { icon: LucideIcon; tone: string; label: string; value: ReactNode; chip?: ReactNode; sub: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line p-3">
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-[12px] text-ink-soft">{label}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[19px] font-extrabold leading-tight text-ink">{value}{chip}</div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

export function EstimatedImpact({ r }: { r: DecisionSimulationResult }) {
  const { t } = useLocale();
  const s = r.selected;
  const i = r.impact;
  const lostMonths = Math.round((i.monthsSafe.before - i.monthsSafe.after) * 10) / 10;
  return (
    <Card title={t('simulation.impact.title')} info extra={<span className="rounded-md bg-[#E3F5EB] px-2 py-0.5 text-[11.5px] font-semibold text-[#137A4F]">{t('simulation.impact.based_on', { mode: t(`simulation.mode.${r.mode}_full`) })}</span>}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <ImpactTile
          icon={Hourglass}
          tone="bg-[#E3F5EB] text-[#1FA16B]"
          label={t('simulation.impact.safe')}
          value={s.lowestBalance < 0 ? t('simulation.impact.short', { amount: formatVnd(-s.lowestBalance) }) : t('simulation.months', { n: dec(i.monthsSafe.after) })}
          chip={lostMonths > 0 ? <DeltaChip>{t('simulation.impact.minus_months', { n: dec(lostMonths) })}</DeltaChip> : undefined}
          sub={s.shortfallMonth ? t('simulation.impact.safe_short', { m: s.shortfallMonth, n: dec(i.monthsSafe.before) }) : t('simulation.impact.safe_sub', { n: dec(i.monthsSafe.before) })}
        />
        <ImpactTile
          icon={PiggyBank}
          tone="bg-[#EDF4FF] text-accent-600"
          label={t('simulation.impact.reserve')}
          value={i.reserve.extraMonths > 0
            ? <span>{t('simulation.impact.reserve_need')} <span className="text-[#F28C28]">{t('simulation.months', { n: i.reserve.extraMonths })}</span></span>
            : t('simulation.impact.reserve_ok')}
          sub={t('simulation.impact.reserve_sub', { n: dec(i.monthsSafe.after), target: i.reserve.targetMonths })}
        />
        <ImpactTile
          icon={House}
          tone="bg-[#F4F0FF] text-violet-600"
          label={i.goalDelay ? t('simulation.impact.goal', { goal: i.goalDelay.goalTitle }) : t('simulation.impact.goal_none')}
          value={i.goalDelay ? <span>{t('simulation.impact.delay')} <span className="text-[#F28C28]">{t('simulation.months', { n: range(i.goalDelay) })}</span></span> : '—'}
          sub={i.goalDelay ? t('simulation.impact.goal_sub', { from: quarter(i.goalDelay.before), to: quarter(i.goalDelay.after) }) : ''}
        />
        <ImpactTile
          icon={ShieldCheck}
          tone="bg-[#E3F5EB] text-[#1FA16B]"
          label={t('simulation.impact.safety')}
          value={<span>{i.safety.after}<span className="text-[13px] font-semibold text-ink-soft">/100</span></span>}
          chip={i.safety.before > i.safety.after ? <DeltaChip>{t('simulation.impact.minus_points', { n: i.safety.before - i.safety.after })}</DeltaChip> : undefined}
          sub={t('simulation.impact.safety_sub', { n: i.safety.before })}
        />
      </div>
    </Card>
  );
}

const X_TICKS = [0, 3, 6, 9, 12, 18, 24];

export function CashflowChart({ r }: { r: DecisionSimulationResult }) {
  const { t } = useLocale();
  const data = r.baseline.path.map((_, m) => ({
    m,
    baseline: Math.round(r.baseline.path[m] / 1e6),
    bull: Math.round(r.scenarios.bull.path[m] / 1e6),
    base: Math.round(r.scenarios.base.path[m] / 1e6),
    bear: Math.round(r.scenarios.bear.path[m] / 1e6),
  }));
  const s = r.scenarios[r.mode];
  const label = (m: number) => (m === 0 ? t('simulation.chart.now') : t('simulation.months', { n: m }));
  return (
    <Card
      title={t('simulation.chart.title')}
      info
      subtitle={t('simulation.chart.subtitle')}
      extra={
        <div className="ml-auto flex flex-wrap gap-3 text-[11.5px] text-ink-soft">
          {(['bull', 'base', 'bear'] as DecisionMode[]).map((m) => (
            <span key={m} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: MODE_COLOR[m] }} />{t(`simulation.mode.${m}_full`)}</span>
          ))}
          <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 bg-slate-400" />{t('simulation.chart.baseline')}</span>
        </div>
      }
    >
      <div className="h-[210px]" role="img" aria-label={t('simulation.chart.aria', { m: s.lowestMonth, n: dec(s.monthsSafe) })}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="#EEF2F6" vertical={false} />
            <XAxis dataKey="m" ticks={X_TICKS} tickFormatter={label} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={44} label={{ value: t('simulation.chart.unit'), angle: -90, position: 'left', offset: 0, fontSize: 10, fill: '#94A3B8', style: { textAnchor: 'middle' } }} />
            <Tooltip
              formatter={(v, k) => [`${Number(v).toLocaleString('vi-VN')} ${t('simulation.chart.million')}`, k === 'baseline' ? t('simulation.chart.baseline') : t(`simulation.mode.${String(k)}_full`)]}
              labelFormatter={(m) => label(Number(m))}
            />
            <Area type="monotone" dataKey="bull" stroke={MODE_COLOR.bull} fill={MODE_COLOR.bull} fillOpacity={0.08} strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="base" stroke={MODE_COLOR.base} fill={MODE_COLOR.base} fillOpacity={0.1} strokeWidth={2.2} dot={false} />
            <Area type="monotone" dataKey="bear" stroke={MODE_COLOR.bear} fill={MODE_COLOR.bear} fillOpacity={0.08} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="baseline" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            <ReferenceDot x={s.lowestMonth} y={Math.round(s.lowestBalance / 1e6)} r={5} fill={MODE_COLOR[r.mode]} stroke="#fff" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[12px] text-ink-soft">
        <span className="rounded-md px-1.5 py-0.5 font-semibold text-white" style={{ background: MODE_COLOR[r.mode] }}>
          {t('simulation.chart.callout', { mode: t(`simulation.mode.${r.mode}_full`), m: s.lowestMonth, amount: formatVnd(s.lowestBalance) })}
        </span>
      </p>
    </Card>
  );
}

const GOAL_ICON: Record<DecisionGoalTile['key'], LucideIcon> = { goal: House, reserve: ShieldCheck, choice: GraduationCap, cashflow: BarChart3 };

export function GoalImpact({ r }: { r: DecisionSimulationResult }) {
  const { t } = useLocale();
  const show = (g: DecisionGoalTile, v: string | number | null) =>
    v === null ? '—' : g.key === 'cashflow' ? formatVnd(Number(v)) : g.key === 'reserve' ? t('simulation.months', { n: dec(Number(v)) }) : quarter(String(v));
  const delta = (g: DecisionGoalTile) => {
    if (g.delta === null) return null;
    if (typeof g.delta === 'number') return g.key === 'cashflow' ? `${g.delta}%` : t('simulation.goal.months_delta', { n: dec(g.delta) });
    return g.delta.max ? t('simulation.goal.range_delta', { r: range(g.delta) }) : null;
  };
  return (
    <Card title={t('simulation.goal.title')} info extra={<span className="text-[12px] text-ink-soft">{t('simulation.goal.subtitle')}</span>}>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {r.goals.map((g) => {
          const Icon = GOAL_ICON[g.key];
          const d = delta(g);
          return (
            <div key={g.key} className="min-w-0 rounded-xl border border-line p-2.5">
              <div className="flex items-start gap-2">
                <Icon className="h-5 w-5 shrink-0 text-accent-600" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-ink">{g.key === 'goal' || g.key === 'choice' ? g.title : t(`simulation.goal.${g.key}`)}</p>
                  <p className="flex flex-wrap items-center gap-1 text-[13px] font-bold text-ink">{show(g, g.before)}<ArrowRight className="h-3.5 w-3.5 text-ink-mute" aria-hidden />{show(g, g.after)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10.5px] text-ink-mute"><span>{t('simulation.goal.before')}</span><span>{t('simulation.goal.after')}</span></div>
                  {d && <span className="mt-1 inline-flex rounded-md bg-[#FFF3DC] px-1.5 py-0.5 text-[11px] font-bold text-[#B86E00]">{d}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const NOTE_STYLE: Record<string, { icon: LucideIcon; box: string; head: string }> = {
  delay_start: { icon: CalendarClock, box: 'bg-[#FFF6EA]', head: 'text-[#C2410C]' },
  raise_reserve: { icon: Wallet, box: 'bg-[#EAF7F0]', head: 'text-[#137A4F]' },
  side_income: { icon: BriefcaseBusiness, box: 'bg-[#EDF4FF]', head: 'text-accent-700' },
};

export function ChoiceImpact({ r }: { r: DecisionSimulationResult }) {
  const { t } = useLocale();
  const c = r.choiceImpact;
  const fmt = (p?: Record<string, number | string>) => {
    if (!p) return {};
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(p)) out[k] = k === 'amount' ? formatVnd(Number(v)) : v;
    return out;
  };
  return (
    <Card title={t('simulation.choice.title')} info subtitle={t('simulation.choice.subtitle', { title: r.choiceTitle })}>
      <div className="space-y-2">
        {c.notes.map((n) => {
          const st = NOTE_STYLE[n.key] ?? NOTE_STYLE.raise_reserve;
          const Icon = st.icon;
          return (
            <div key={n.key} className={cx('flex items-start gap-3 rounded-xl p-3', st.box)}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70"><Icon className={cx('h-5 w-5', st.head)} aria-hidden /></span>
              <div className="min-w-0">
                <p className={cx('text-[13px] font-bold', st.head)}>{t(`simulation.choice.${n.key}`)}</p>
                <p className="text-[12px] leading-snug text-ink-soft">{t(`simulation.choice.${n.key}_body`, fmt(n.params))}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-soft">
        {t('simulation.choice.feasibility', { before: c.feasibilityBefore, after: c.feasibilityAfter, verdict: t(`simulation.choice.verdict_${c.verdictAfter}`) })}
      </p>
    </Card>
  );
}

export function StepsList({ r, children }: { r: DecisionSimulationResult; children?: ReactNode }) {
  const { t } = useLocale();
  const fmt = (p: Record<string, number>) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(p)) out[k] = k === 'amount' ? formatVnd(v) : v;
    return out;
  };
  return (
    <Card title={t('simulation.steps.title')} extra={<Sparkles className="h-4 w-4 text-violet-500" aria-hidden />} subtitle={t('simulation.steps.subtitle')}>
      <ol className="space-y-2.5">
        {r.steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EDF4FF] text-[13px] font-bold text-accent-700">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">{t(`simulation.steps.${s.key}`)}</p>
              <p className="text-[12px] leading-snug text-ink-soft">{t(`simulation.steps.${s.key}_body`, fmt(s.params))}</p>
            </div>
          </li>
        ))}
      </ol>
      {children}
    </Card>
  );
}
