import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, BriefcaseBusiness, ChartNoAxesCombined, CircleCheck, RotateCcw, Wallet } from 'lucide-react';
import type { DecisionMode, DecisionShock, DecisionSimulationInput } from '@shared/types/api/decision';
import type { DecisionSimulationAnalysis } from '@shared/engine/decisionSimulation';
import { DEFAULT_PARAMS } from '@shared/engine/simulate';
import { formatVnd } from '@shared/format';
import { useLocale } from '@/app/locale';
import { Button, ButtonLink, ErrorState, PageSkeleton } from '@/components/ui';
import { useLifeChoice, useRunSimulation, useSimulationPreview } from '@/lib/queries';

const COPY = {
  vi: {
    title: 'Mô phỏng cú sốc kép', subtitle: 'Xem nghề nghiệp và tài sản biến động cùng lúc sẽ ảnh hưởng đến kế hoạch của bạn ra sao.', back: 'Quay lại Lựa chọn cuộc đời',
    choice: 'Đang mô phỏng cho lựa chọn', option: 'Phương án', change: 'Thay đổi lựa chọn', setup: 'Thiết lập cú sốc kép', setupHint: 'Điều chỉnh tham số để xem tác động đến tài chính và kế hoạch.', reset: 'Đặt lại mặc định',
    industry: 'Ngành công nghệ suy giảm', industryHint: 'Thu nhập gián đoạn và tài sản đầu tư giảm cùng lúc.', job_loss: 'Mất việc tạm thời', job_lossHint: 'Thu nhập gián đoạn rồi có thể quay lại.', market: 'Thị trường giảm sâu', marketHint: 'Giá trị tài sản đầu tư giảm.',
    career: 'Rủi ro nghề nghiệp', assets: 'Tác động đến tài sản', analysis: 'Khung phân tích', pause: 'Số tháng mất thu nhập', drop: 'Tài sản đầu tư giảm', inflation: 'Lạm phát', cost: 'Chi phí bất ngờ',
    bull: 'Bull (Lạc quan)', base: 'Base (Cơ sở)', bear: 'Bear (Tiêu cực)', bullHint: 'Tác động nhẹ hơn', baseHint: 'Theo tham số đã chọn', bearHint: 'Tác động mạnh hơn',
    impact: 'Tác động ước tính', months: 'Số tháng an toàn', reserve: 'Quỹ dự phòng', need: 'Cần thêm', safety: 'Mức độ an toàn', month24: 'Tiền có thể dùng sau 24 tháng', chart: 'Dòng tiền và số tháng an toàn', chartHint: 'Ước tính số tiền có thể dùng trong 24 tháng tới.',
    baseline: 'Không có cú sốc', choiceImpact: 'Tác động đến mục tiêu', noGoals: 'Chưa có mục tiêu để đánh giá.', unknown: 'Chưa ước tính được trong 24 tháng', delay: 'Có thể chậm', monthUnit: 'tháng', suggestions: 'Gợi ý điều chỉnh', run: 'Lưu kết quả mô phỏng', saving: 'Đang lưu…', report: 'Xem kết quả đã lưu', basis: 'Căn cứ tính toán', basisText: 'Ước tính từ dữ liệu và phương án hiện có. Giá trị tài sản và thu nhập tương lai có thể khác.', notEnough: 'Chưa có chi tiêu tháng để tính mô phỏng.',
  },
  en: {
    title: 'Double shock simulation', subtitle: 'See how career and asset changes together may affect your plan.', back: 'Back to life choices', choice: 'Simulating choice', option: 'Option', change: 'Change choice', setup: 'Set up the shocks', setupHint: 'Adjust the inputs to see the impact on finances and goals.', reset: 'Reset defaults',
    industry: 'Industry downturn', industryHint: 'Income interruption and investment loss together.', job_loss: 'Temporary job loss', job_lossHint: 'Income stops temporarily and may recover.', market: 'Market decline', marketHint: 'Investments lose value.', career: 'Career risk', assets: 'Asset impact', analysis: 'Analysis case', pause: 'Months without income', drop: 'Investment decline', inflation: 'Inflation', cost: 'Unexpected cost',
    bull: 'Bull (optimistic)', base: 'Base', bear: 'Bear (pessimistic)', bullHint: 'Milder impact', baseHint: 'Selected inputs', bearHint: 'Stronger impact', impact: 'Estimated impact', months: 'Safe months', reserve: 'Reserve gap', need: 'Need', safety: 'Safety level', month24: 'Available cash after 24 months', chart: 'Cash projection and safe months', chartHint: 'Estimated available cash over 24 months.', baseline: 'No shock', choiceImpact: 'Goal impact', noGoals: 'No goals to evaluate.', unknown: 'Cannot estimate within 24 months', delay: 'May be delayed', monthUnit: 'months', suggestions: 'Suggested changes', run: 'Save simulation', saving: 'Saving…', report: 'View saved result', basis: 'Calculation basis', basisText: 'Estimate from current data and option. Future asset values and income may differ.', notEnough: 'Monthly expenses are needed for this simulation.',
  },
  zh: {
    title: '双重冲击模拟', subtitle: '查看职业和资产同时变化对计划的影响。', back: '返回人生选择', choice: '正在模拟选择', option: '方案', change: '更换选择', setup: '设置双重冲击', setupHint: '调整参数，查看对财务和目标的影响。', reset: '恢复默认',
    industry: '行业下行', industryHint: '收入中断且投资资产下跌。', job_loss: '暂时失业', job_lossHint: '收入中断后可能恢复。', market: '市场大幅下跌', marketHint: '投资资产价值下降。', career: '职业风险', assets: '资产影响', analysis: '分析情景', pause: '收入中断月数', drop: '投资资产跌幅', inflation: '通胀', cost: '意外支出',
    bull: '乐观', base: '基准', bear: '悲观', bullHint: '影响较轻', baseHint: '按所选参数', bearHint: '影响较重', impact: '预计影响', months: '安全月数', reserve: '储备缺口', need: '仍需', safety: '安全程度', month24: '24个月后可用资金', chart: '现金与安全月数预测', chartHint: '未来24个月可用资金估计。', baseline: '无冲击', choiceImpact: '目标影响', noGoals: '暂无可评估的目标。', unknown: '24个月内无法估算', delay: '可能延迟', monthUnit: '个月', suggestions: '调整建议', run: '保存模拟结果', saving: '保存中…', report: '查看已保存结果', basis: '计算依据', basisText: '根据当前数据和方案估算，未来资产价值和收入可能不同。', notEnough: '需要月支出数据才能模拟。',
  },
} as const;

const SHOCKS: { id: DecisionShock; icon: typeof BriefcaseBusiness }[] = [
  { id: 'industry', icon: ChartNoAxesCombined }, { id: 'job_loss', icon: BriefcaseBusiness }, { id: 'market', icon: Wallet },
];
const MODES: DecisionMode[] = ['bull', 'base', 'bear'];
const INITIAL_PARAMS = { ...DEFAULT_PARAMS, incomePauseMonths: 6, marketDropPct: -35 };

function localizedSuggestion(locale: keyof typeof COPY, analysis: DecisionSimulationAnalysis, tip: DecisionSimulationAnalysis['suggestions'][number]) {
  if (locale === 'vi') return tip;
  if (locale === 'en') {
    if (tip.key === 'reserve') return { title: 'Build your reserve', body: `Add about ${analysis.selected.extraReserveMonths} months of expenses to reach your target.` };
    if (tip.key === 'portfolio') return { title: 'Reduce concentration', body: 'Review volatile holdings before starting this choice.' };
    if (tip.key === 'timing') return { title: 'Delay the start date', body: `Available cash may turn negative in month ${analysis.selected.cashShortfallMonth}. Save more or lower costs first.` };
    return { title: 'Keep monitoring', body: 'Current assumptions preserve the reserve within this 24 month simulation.' };
  }
  if (tip.key === 'reserve') return { title: '增加应急储备', body: `还需约 ${analysis.selected.extraReserveMonths} 个月的生活费才能达到目标。` };
  if (tip.key === 'portfolio') return { title: '降低集中风险', body: '开始此选择前，请检查波动较大的资产。' };
  if (tip.key === 'timing') return { title: '推迟开始时间', body: `可用资金可能从第 ${analysis.selected.cashShortfallMonth} 个月变为负数，请先增加储蓄或降低成本。` };
  return { title: '继续跟踪计划', body: '按当前假设，24 个月内储备仍可维持。' };
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export default function DecisionSimulationPage({ choiceId, initialMode }: { choiceId: string; initialMode: DecisionMode }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const detail = useLifeChoice(choiceId);
  const navigate = useNavigate();
  const run = useRunSimulation();
  const [mode, setMode] = useState<DecisionMode>(initialMode);
  const [shock, setShock] = useState<DecisionShock>('industry');
  const [params, setParams] = useState(INITIAL_PARAMS);
  const option = detail.data?.options.find((candidate) => candidate.selected) ?? detail.data?.options[0];
  const input: DecisionSimulationInput = { choiceId, optionId: option?.id, mode, shock, params };
  const preview = useSimulationPreview(useDebounced(input));

  if (detail.isPending) return <PageSkeleton />;
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (!detail.data || !option) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5">{copy.notEnough}</div>;

  const changeShock = (next: DecisionShock) => {
    setShock(next);
    setParams((old) => ({ ...old, incomePauseMonths: next === 'market' ? 0 : old.incomePauseMonths || 6, marketDropPct: next === 'job_loss' ? 0 : old.marketDropPct || -35 }));
  };
  const save = async () => {
    const result = await run.mutateAsync(input);
    navigate(`/mo-phong/ket-qua/${result.runId}`);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[25px] font-bold text-ink md:text-[28px]">{copy.title}</h1><p className="mt-1 text-sm text-ink-soft">{copy.subtitle}</p></div>
        <ButtonLink to="/lua-chon" variant="outline"><ArrowLeft className="h-4 w-4" /> {copy.back}</ButtonLink>
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#DAE7F8] bg-[#F4F9FF] p-3 md:p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-accent-600"><BriefcaseBusiness className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink-soft">{copy.choice}</p><p className="font-bold text-[#12366A]">{detail.data.title}</p><p className="text-xs text-ink-soft">{copy.option}: {option.title}</p></div>
        <ButtonLink to="/lua-chon" variant="outline" className="w-full justify-center sm:w-auto">{copy.change}</ButtonLink>
      </section>

      <div className="grid gap-2.5 md:grid-cols-3">
        {SHOCKS.map(({ id, icon: Icon }) => (
          <button type="button" key={id} onClick={() => changeShock(id)} aria-pressed={shock === id}
            className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors md:min-h-[84px] ${shock === id ? 'border-accent-600 bg-[#F2F7FF] ring-1 ring-accent-600' : 'border-line bg-white hover:border-accent-300'}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EEF5FF] text-accent-600"><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink">{copy[id]}</span><span className="mt-1 block text-xs leading-snug text-ink-soft">{copy[`${id}Hint`]}</span></span>
            {shock === id && <CircleCheck className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[2fr_1.1fr]">
        <section className="min-w-0 rounded-xl border border-line bg-white p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-ink">{copy.setup}</h2><p className="text-xs text-ink-soft">{copy.setupHint}</p></div><button type="button" onClick={() => { setParams(INITIAL_PARAMS); setMode('base'); setShock('industry'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-accent-600"><RotateCcw className="h-3.5 w-3.5" />{copy.reset}</button></div>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-lg border border-line bg-[#FBFDFF] p-3"><h3 className="mb-2 text-xs font-bold text-ink">{copy.career}</h3><Range label={copy.pause} value={params.incomePauseMonths} min={0} max={12} unit={locale === 'vi' ? ' tháng' : locale === 'en' ? ' mo' : '个月'} onChange={(value) => setParams({ ...params, incomePauseMonths: value })} disabled={shock === 'market'} /></div>
            <div className="rounded-lg border border-line bg-[#FBFDFF] p-3"><h3 className="mb-2 text-xs font-bold text-ink">{copy.assets}</h3><Range label={copy.drop} value={Math.abs(params.marketDropPct)} min={0} max={50} unit="%" onChange={(value) => setParams({ ...params, marketDropPct: -value })} disabled={shock === 'job_loss'} /></div>
            <div className="rounded-lg border border-line bg-[#FBFDFF] p-3"><h3 className="mb-2 text-xs font-bold text-ink">{copy.inflation}</h3><Range label={copy.inflation} value={params.inflationPct} min={0} max={10} unit="%" onChange={(value) => setParams({ ...params, inflationPct: value })} /></div>
            <div className="rounded-lg border border-line bg-[#FBFDFF] p-3"><h3 className="mb-2 text-xs font-bold text-ink">{copy.cost}</h3><Range label={copy.cost} value={params.surpriseCost / 1_000_000} min={0} max={200} unit=" tr" onChange={(value) => setParams({ ...params, surpriseCost: value * 1_000_000 })} /></div>
          </div>
          <fieldset className="mt-3 grid gap-2 rounded-lg border border-line p-3 md:grid-cols-3"><legend className="px-1 text-xs font-bold text-ink">{copy.analysis}</legend>{MODES.map((id) => <label key={id} className={`flex cursor-pointer gap-2 rounded-lg p-2 text-xs ${mode === id ? 'bg-[#E7F7F0] text-[#087E55]' : 'text-ink-soft'}`}><input type="radio" name="decision-mode" checked={mode === id} onChange={() => setMode(id)} /><span><strong className="block text-ink">{copy[id]}</strong>{copy[`${id}Hint`]}</span></label>)}</fieldset>
        </section>
        <section className="min-w-0 rounded-xl border border-line bg-white p-3 md:p-4"><h2 className="mb-3 font-bold text-ink">{copy.impact} <span className="ml-1 rounded-full bg-[#E7F7F0] px-2 py-1 text-[11px] font-medium text-[#087E55]">{copy[mode]}</span></h2>
          {preview.error && !preview.data?.decision ? <ErrorState error={preview.error} onRetry={() => preview.refetch()} /> : preview.data?.decision ? <ImpactCards analysis={preview.data.decision} copy={copy} /> : <div className="h-48 animate-pulse rounded-lg bg-slate-100" />}
        </section>
      </div>

      {preview.data?.decision && <DecisionReportContent analysis={preview.data.decision} />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E4DEFF] bg-[#F7F5FF] p-3 text-xs text-[#6750B5]"><p>{copy.basisText}</p><Button onClick={save} disabled={run.isPending || !preview.data?.decision} arrow>{run.isPending ? copy.saving : copy.run}</Button>{run.error && <p role="alert" className="w-full text-danger-600">{run.error.message}</p>}</div>
    </div>
  );
}

function Range({ label, value, min, max, unit, onChange, disabled }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void; disabled?: boolean }) {
  return <label className={`block ${disabled ? 'opacity-45' : ''}`}><span className="flex justify-between gap-2 text-xs text-ink-soft"><span>{label}</span><strong className="whitespace-nowrap text-ink">{value}{unit}</strong></span><input aria-label={label} type="range" min={min} max={max} step="1" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-accent-600" /></label>;
}

function ImpactCards({ analysis, copy }: { analysis: DecisionSimulationAnalysis; copy: typeof COPY[keyof typeof COPY] }) {
  const { selected } = analysis;
  return <div className="grid gap-2 sm:grid-cols-2">
    <Metric title={copy.months} value={`${selected.runwayAfter}`} note={`${selected.runwayBefore} → ${selected.runwayAfter}`} unit={copy.monthUnit} />
    <Metric title={copy.reserve} value={`${selected.extraReserveMonths}`} note={copy.need} unit={copy.monthUnit} />
    <Metric title={copy.safety} value={`${selected.safetyAfter}/100`} note={`${selected.safetyBefore}/100 → ${selected.safetyAfter}/100`} />
    <Metric title={copy.month24} value={formatVnd(selected.month24Cash)} note={selected.cashShortfallMonth === null ? '' : `${copy.monthUnit} ${selected.cashShortfallMonth}`} />
  </div>;
}

function Metric({ title, value, note, unit }: { title: string; value: string; note: string; unit?: string }) {
  return <div className="min-w-0 rounded-lg border border-line bg-[#FBFDFF] p-3"><p className="text-xs font-semibold text-ink-soft">{title}</p><p className="mt-2 break-words text-lg font-bold text-ink">{value}{unit && <span className="ml-1 text-xs font-medium text-ink-soft">{unit}</span>}</p><p className="mt-1 text-xs text-ink-soft">{note}</p></div>;
}

export function DecisionReportContent({ analysis }: { analysis: DecisionSimulationAnalysis }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const chart = analysis.projection.filter((point) => point.month === 0 || point.month % 3 === 0);
  return <div className="grid gap-2.5 xl:grid-cols-[1.65fr_0.9fr_0.85fr]">
    <section className="min-w-0 rounded-xl border border-line bg-white p-3 md:p-4"><h2 className="font-bold text-ink">{copy.chart}</h2><p className="text-xs text-ink-soft">{copy.chartHint}</p><div className="mt-3 h-[220px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ left: 0, right: 6, top: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#ECF0F5" /><XAxis dataKey="month" tickFormatter={(v: number) => `${v}`} tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}tr`} tick={{ fontSize: 10 }} width={42} /><Tooltip formatter={(value, name) => [formatVnd(Number(value)), name === 'baseline' ? copy.baseline : copy[name as DecisionMode]]} labelFormatter={(label) => `${label} ${copy.monthUnit}`} /><Area dataKey="bear" stroke="none" fill="#FDE9DA" fillOpacity={0.45} isAnimationActive={false} /><Line dataKey="baseline" stroke="#9AAABD" dot={false} strokeWidth={1.5} isAnimationActive={false} /><Line dataKey="bull" stroke="#10A672" dot={false} strokeWidth={2} isAnimationActive={false} /><Line dataKey="base" stroke="#2F6FED" dot={false} strokeWidth={2} isAnimationActive={false} /><Line dataKey="bear" stroke="#F59E0B" dot={false} strokeWidth={2} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft"><span>● {copy.baseline}</span><span className="text-[#10A672]">● {copy.bull}</span><span className="text-[#2F6FED]">● {copy.base}</span><span className="text-[#F59E0B]">● {copy.bear}</span></div></section>
    <section className="min-w-0 rounded-xl border border-line bg-white p-3 md:p-4"><h2 className="font-bold text-ink">{copy.choiceImpact}</h2><p className="mt-1 text-xs text-ink-soft">{analysis.choiceTitle}</p><div className="mt-3 space-y-2">{analysis.goals.length ? analysis.goals.map((goal) => <div key={goal.id} className="rounded-lg border border-line bg-[#FBFDFF] p-3"><p className="text-xs font-semibold text-ink">{goal.title}</p><p className="mt-1 text-sm font-bold text-[#D97706]">{goal.delayMonths === null ? copy.unknown : `${copy.delay} ${goal.delayMonths} ${copy.monthUnit}`}</p><p className="text-[11px] text-ink-soft">{goal.targetMonth}</p></div>) : <p className="text-sm text-ink-soft">{copy.noGoals}</p>}</div></section>
    <section className="min-w-0 rounded-xl border border-line bg-white p-3 md:p-4"><h2 className="font-bold text-ink">{copy.suggestions}</h2><ol className="mt-3 space-y-3">{analysis.suggestions.map((tip, index) => { const wording = localizedSuggestion(locale, analysis, tip); return <li key={tip.key} className="flex gap-2.5 text-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E7F0FF] font-bold text-accent-600">{index + 1}</span><span><strong className="block text-ink">{wording.title}</strong><span className="text-ink-soft">{wording.body}</span></span></li>; })}</ol><ButtonLink to="/lua-chon" className="mt-4 w-full" arrow>{copy.change}</ButtonLink></section>
  </div>;
}

export function SavedDecisionResult({ analysis }: { analysis: DecisionSimulationAnalysis }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  return <div className="space-y-3.5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-[25px] font-bold text-ink">{copy.report}</h1><p className="text-sm text-ink-soft">{analysis.choiceTitle} · {analysis.optionTitle}</p></div><ButtonLink to={`/mo-phong?choiceId=${analysis.choiceId}&mode=${analysis.mode}`} variant="outline"><ArrowLeft className="h-4 w-4" /> {copy.title}</ButtonLink></div><div className="rounded-xl border border-line bg-white p-4"><h2 className="mb-3 font-bold text-ink">{copy.impact}</h2><ImpactCards analysis={analysis} copy={copy} /></div><DecisionReportContent analysis={analysis} /><p className="rounded-lg bg-[#F7F5FF] p-3 text-xs text-ink-soft">{copy.basis}: {copy.basisText}</p></div>;
}
