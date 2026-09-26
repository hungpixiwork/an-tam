import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity, ArrowRight, BadgePercent, Briefcase, ChartLine, CircleGauge, CirclePlus, ClipboardCheck, CloudRain, Coins, FileText, House,
  Info, Lightbulb, PieChart, ShieldPlus, TrendingDown, Wallet, type LucideIcon,
} from 'lucide-react';
import type { SimulationReport } from '@shared/engine/analysis';
import { DEFAULT_PARAMS } from '@shared/engine/simulate';
import { formatPct, formatVnd } from '@shared/format';
import type { SimulationParams } from '@shared/types/domain';
import { HeroLakeCity } from '@/components/pixel';
import { Bot, Target } from 'lucide-react';
import { Button, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Select, cx, type Tone } from '@/components/ui';
import { NeedData } from '@/components/NeedData';
import { usePresets, useRunSimulation, useSimulationPreview, type Preset } from '@/lib/queries';

/* ───────── Cấu hình slider ───────── */

interface SliderDef {
  key: keyof Omit<SimulationParams, 'goalShiftMonths'>;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  min: number;
  max: number;
  step: number;
  ticks: string[];
  format: (v: number) => string;
}

const comma = (v: number) => String(v).replace('.', ',');

const SLIDERS: SliderDef[] = [
  { key: 'marketDropPct', label: 'Thị trường giảm', hint: 'Mức thay đổi giá trị cổ phiếu và quỹ', icon: TrendingDown, tone: 'red', min: -50, max: 50, step: 5, ticks: ['-50%', '0%', '+50%'], format: (v) => `${v > 0 ? '+' : ''}${v}%` },
  { key: 'inflationPct', label: 'Lạm phát tăng', hint: 'Lạm phát trên 4% làm chi tiêu tăng', icon: Coins, tone: 'orange', min: 0, max: 10, step: 0.5, ticks: ['0%', '5%', '10%'], format: (v) => `${comma(v)}%` },
  { key: 'incomePauseMonths', label: 'Thu nhập bị gián đoạn', hint: 'Số tháng mất nguồn thu nhập chính', icon: Briefcase, tone: 'green', min: 0, max: 12, step: 1, ticks: ['0 tháng', '6 tháng', '12 tháng'], format: (v) => `${v} tháng` },
  { key: 'interestRateDeltaPct', label: 'Ngân hàng thay đổi lãi suất', hint: 'Lãi suất tăng làm trái phiếu giảm giá', icon: BadgePercent, tone: 'violet', min: -3, max: 3, step: 0.5, ticks: ['-3%', '0%', '+3%'], format: (v) => `${v > 0 ? '+' : ''}${comma(v)}%` },
  { key: 'surpriseCost', label: 'Chi phí bất ngờ', hint: 'Khoản chi lớn ngoài kế hoạch', icon: Wallet, tone: 'blue', min: 0, max: 500_000_000, step: 10_000_000, ticks: ['0', '100 triệu', '500 triệu'], format: (v) => (v === 0 ? '0' : formatVnd(v)) },
];

const PRESET_ICON: Record<string, LucideIcon> = { 'trending-down': ChartLine, 'cloud-rain': CloudRain, home: House, activity: Activity };
const PRESET_COLOR: Record<string, string> = { 'trending-down': 'text-accent-600', 'cloud-rain': 'text-accent-500', home: 'text-violet-600', activity: 'text-danger-500' };

const sameParams = (a: SimulationParams, b: SimulationParams) =>
  SLIDERS.every((s) => a[s.key] === b[s.key]) && (a.goalShiftMonths ?? 0) === (b.goalShiftMonths ?? 0);

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SimulationPage() {
  const [search] = useSearchParams();
  const presets = usePresets();
  if (presets.isPending) return <PageSkeleton />;
  if (presets.error) return <ErrorState error={presets.error} onRetry={() => presets.refetch()} />;
  // Khởi tạo từ ?preset= (mặc định "Năm khó khăn")
  const slug = search.get('preset') ?? 'nam-kho-khan';
  const initial = presets.data.find((p) => p.slug === slug)?.params ?? DEFAULT_PARAMS;
  return (
    <NeedData
      anyOf={['holdings', 'goals']}
      icon={Target}
      title="Bạn sẽ làm gì nếu...?"
      body="Thị trường giảm, lạm phát tăng hay mất thu nhập? Thêm tài sản hoặc mục tiêu trước để chạy mô phỏng và xem tác động."
    >
      <Simulator key={slug} presets={presets.data} initial={initial} />
    </NeedData>
  );
}

function Simulator({ presets, initial }: { presets: Preset[]; initial: SimulationParams }) {
  const [params, onChange] = useState<SimulationParams>(initial);
  const navigate = useNavigate();
  const debounced = useDebounced(params, 300);
  const preview = useSimulationPreview(debounced);
  const run = useRunSimulation();

  const start = async () => {
    const { runId } = await run.mutateAsync(params);
    navigate(`/mo-phong/ket-qua/${runId}`);
  };

  return (
    <div className="space-y-4">
      <PageHero
        title="Nếu tương lai thay đổi,"
        highlight={<>kế hoạch của bạn có còn <span className="text-primary-700">ổn không?</span></>}
        subtitle="Hãy thử trước trên mô hình để tiền thật của bạn bớt gặp rủi ro."
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.5fr]">
        <ScenarioCard presets={presets} params={params} onChange={onChange} />
        <div className="space-y-4">
          <Card className={cx('transition-opacity', preview.isFetching && 'opacity-70')}>
            <CardTitle
              icon={CircleGauge}
              title="Xem trước tác động"
              action={<Select label="Loại biểu đồ" value="assets" onChange={() => undefined} options={[{ value: 'assets', label: 'Biểu đồ tổng tài sản' }]} />}
            />
            {preview.error && !preview.data ? (
              <ErrorState error={preview.error} onRetry={() => preview.refetch()} />
            ) : preview.data ? (
              <ImpactPreview report={preview.data} />
            ) : (
              <div className="h-[330px] animate-pulse rounded-xl bg-[#EEF3F8]" />
            )}
          </Card>
          <AiStepsCard />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[#D7EFE2] bg-gradient-to-r from-[#EAF7F0] via-[#F1FAF5] to-[#E6F4EF] p-5 md:px-8">
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-card md:flex">
            <ClipboardCheck className="h-9 w-9 text-primary-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-ink">Bạn không cần đoán tương lai.</p>
            <p className="text-xl font-bold text-primary-600">Hãy thử trước để chuẩn bị tốt hơn.</p>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-ink-soft">
            Chỉ mất vài phút để xem những thay đổi có thể ảnh hưởng đến kế hoạch của bạn như thế nào.
          </p>
          <div className="flex flex-col items-end gap-1">
            <Button size="lg" arrow onClick={start} disabled={run.isPending} className="min-w-[210px]">
              {run.isPending ? 'Đang chạy…' : 'Chạy mô phỏng'}
            </Button>
            {run.error && <p role="alert" className="text-xs text-danger-600">{run.error.message}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────── Cột trái: slider + preset ───────── */

function ScenarioCard({ presets, params, onChange }: { presets: Preset[]; params: SimulationParams; onChange: (p: SimulationParams) => void }) {
  const active = presets.find((p) => sameParams(p.params, params));
  return (
    <Card>
      <CardTitle icon={PieChart} title={<span className="flex items-center gap-1.5">Chọn tình huống muốn thử <Info className="h-4 w-4 text-ink-mute" aria-hidden /></span>} subtitle="Điều chỉnh các yếu tố bên dưới để tạo kịch bản của riêng bạn." />
      <div className="space-y-4">
        {SLIDERS.map((s) => (
          <SliderRow key={s.key} def={s} value={params[s.key]} onChange={(v) => onChange({ ...params, [s.key]: v })} />
        ))}
      </div>

      <p className="mb-3 mt-8 flex items-center gap-1.5 text-[15px] font-bold text-ink">
        Chọn nhanh kịch bản phổ biến <Info className="h-4 w-4 text-ink-mute" aria-hidden />
      </p>
      <div className="flex flex-wrap gap-2.5">
        {presets.map((p) => {
          const Icon = PRESET_ICON[p.icon] ?? ChartLine;
          const on = active?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.params)}
              aria-pressed={on}
              className={cx('inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors', on ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-[#F6F9FC] text-ink hover:bg-white')}
            >
              <Icon className={cx('h-[18px] w-[18px]', PRESET_COLOR[p.icon])} aria-hidden />
              {p.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PARAMS)}
          aria-pressed={!active && sameParams(params, DEFAULT_PARAMS)}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-[#F6F9FC] px-3.5 text-[13px] font-medium text-ink hover:bg-white"
        >
          <CirclePlus className="h-[18px] w-[18px] text-accent-600" aria-hidden />
          Tự tạo
        </button>
      </div>
    </Card>
  );
}

function SliderRow({ def, value, onChange }: { def: SliderDef; value: number; onChange: (v: number) => void }) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  return (
    <div className="grid grid-cols-[44px_1fr_92px] items-center gap-x-3 gap-y-1">
      <IconTile icon={def.icon} tone={def.tone} />
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink" title={def.hint}>
        {def.label}
        <Info className="h-3.5 w-3.5 shrink-0 text-ink-mute" aria-hidden />
      </span>
      <output className="flex h-10 items-center justify-center rounded-xl border border-line bg-white px-2 text-[15px] font-semibold text-ink">
        {def.format(value)}
      </output>
      <div className="col-span-2 col-start-2">
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={def.label}
          aria-valuetext={def.format(value)}
          className="range-slider w-full"
          style={{ background: `linear-gradient(to right, #2F7BEA ${pct}%, #E3E9F0 ${pct}%)` }}
        />
        <div className="mt-1 flex justify-between text-[11px] text-ink-mute">
          {def.ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Cột phải: tác động ───────── */

function Metric({ icon, tone, label, before, after, diff }: { icon: LucideIcon; tone: Tone; label: string; before: string; after: string; diff: string | null }) {
  return (
    <div className="rounded-xl border border-line p-3.5">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 text-[13px] text-ink">{label}</p>
      <p className="mt-1 whitespace-nowrap text-[19px] font-bold text-ink">
        {before} <span className="font-medium text-ink-soft">→</span> <span className={diff ? 'text-danger-600' : ''}>{after}</span>
      </p>
      {diff ? (
        <span className="mt-2 inline-flex h-6 items-center rounded-full bg-danger-50 px-2.5 text-xs font-semibold text-danger-600">▼ {diff}</span>
      ) : (
        <span className="mt-2 inline-flex h-6 items-center rounded-full bg-success-50 px-2.5 text-xs font-semibold text-success-600">Không đổi</span>
      )}
    </div>
  );
}

function ImpactPreview({ report }: { report: SimulationReport }) {
  const home = report.goals.find((g) => g.kind === 'home') ?? report.goals[0];
  const { before, after } = report;
  const nwDrop = before.netWorth > 0 ? (before.netWorth - after.netWorth) / before.netWorth : 0;
  const probDrop = home ? home.probabilityBefore - home.probabilityAfter : 0;
  const monthDrop = Math.round(before.emergencyMonths) - Math.round(after.emergencyMonths);
  const scoreDrop = before.peaceScore - after.peaceScore;
  const data = useMemo(() => report.projection.map((p) => ({ ...p })), [report.projection]);
  const last = data.at(-1);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
        <Metric icon={Coins} tone="violet" label="Tổng tài sản dự kiến" before={formatVnd(before.netWorth)} after={formatVnd(after.netWorth)} diff={nwDrop > 0.005 ? formatPct(nwDrop) : null} />
        {home && (
          <Metric icon={House} tone="orange" label={`Mục tiêu ${home.title.toLowerCase()}`} before={formatPct(home.probabilityBefore)} after={formatPct(home.probabilityAfter)} diff={probDrop > 0.005 ? `${Math.round(probDrop * 100)} điểm %` : null} />
        )}
        <Metric icon={ShieldPlus} tone="green" label="Quỹ dự phòng" before={`${Math.round(before.emergencyMonths)} tháng`} after={`${Math.round(after.emergencyMonths)} tháng`} diff={monthDrop > 0 ? `${monthDrop} tháng` : null} />
        <Metric icon={CircleGauge} tone="teal" label="Mức an tâm tài chính" before={String(before.peaceScore)} after={String(after.peaceScore)} diff={scoreDrop > 0 ? `${scoreDrop} điểm` : null} />
      </div>

      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-ink">Dự phóng tổng tài sản theo thời gian</p>
          <div className="flex gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-500" />Kế hoạch hiện tại</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger-500" />Kịch bản bạn chọn</span>
          </div>
        </div>
        <div className="relative h-[170px]">
          {last && (
            <div className="absolute right-0 top-0 z-10 flex flex-col items-end gap-1 text-xs font-semibold text-white">
              <span className="rounded-md bg-accent-600 px-2 py-0.5">{formatVnd(last.baseline)}</span>
              <span className="rounded-md bg-danger-500 px-2 py-0.5">{formatVnd(last.scenario)}</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 70, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sim-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EEF2F6" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} interval={0} />
              <YAxis tickFormatter={(v: number) => (v === 0 ? '0' : formatVnd(v, { axis: true }))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} width={64} />
              <Tooltip formatter={(v, name) => [formatVnd(Number(v)), name === 'baseline' ? 'Kế hoạch hiện tại' : 'Kịch bản bạn chọn']} />
              <Area dataKey="scenario" type="monotone" stroke="none" fill="url(#sim-area)" isAnimationActive={false} />
              <Line dataKey="baseline" type="monotone" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
              <Line dataKey="scenario" type="monotone" stroke="#EF4444" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

const AI_STEPS = [
  { icon: FileText, tone: 'blue', title: 'Đọc tình huống bạn chọn', body: 'AI hiểu các thay đổi bạn vừa thiết lập.' },
  { icon: PieChart, tone: 'green', title: 'Kiểm tra tiền, mục tiêu và danh mục hiện tại', body: 'Đối chiếu với dữ liệu của bạn để đánh giá tác động.' },
  { icon: ChartLine, tone: 'violet', title: 'Chạy nhiều kịch bản để xem điều gì có thể xảy ra', body: 'Mô phỏng dựa trên các khoảng biến động thực tế.' },
  { icon: Lightbulb, tone: 'orange', title: 'Tóm tắt rủi ro và gợi ý cách ứng phó', body: 'Đưa ra khuyến nghị đơn giản, dễ hiểu và phù hợp với bạn.' },
] as const;

const STEP_BADGE: Record<Tone, string> = { blue: 'bg-accent-600', green: 'bg-success-500', violet: 'bg-violet-500', orange: 'bg-warning-500', red: 'bg-danger-500', teal: 'bg-primary-700', gray: 'bg-slate-400' };

function AiStepsCard() {
  return (
    <Card>
      <CardTitle icon={Bot} title="AI đang làm gì?" />
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {AI_STEPS.map((s, i) => (
          <li key={s.title} className="relative flex flex-col items-center rounded-xl border border-line px-3 pb-4 pt-6 text-center">
            <span className={cx('absolute -top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white', STEP_BADGE[s.tone])}>{i + 1}</span>
            <IconTile icon={s.icon} tone={s.tone} />
            <p className="mt-3 text-[13.5px] font-semibold leading-snug text-ink">{s.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{s.body}</p>
            {i < AI_STEPS.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-ink-mute xl:block" aria-hidden />}
          </li>
        ))}
      </ol>
    </Card>
  );
}
