import type { ReactNode } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, Bell, CircleCheck, Coins, FileText, Flag, House, Lightbulb, RefreshCw, Scale, ShieldCheck, SlidersHorizontal, SquareCheck, type LucideIcon } from 'lucide-react';
import type { PlanMetrics, PlanProposal } from '@shared/engine/plan';
import { formatPct } from '@shared/format';
import { HeroLakeCity } from '@/components/pixel';
import { Badge, Button, ButtonLink, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Select, cx, type Tone } from '@/components/ui';
import { NeedData } from '@/components/NeedData';
import { useApplyPlan, usePlans, useToggleTask, type PlansData, type PlanTask } from '@/lib/queries';

export default function SafetyPlanPage() {
  const { data, error, refetch, isPending } = usePlans();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  const { proposal, applied } = data;

  return (
    <NeedData
      anyOf={['profile', 'holdings']}
      icon={ShieldCheck}
      title="AI cần biết thêm để lập kế hoạch"
      body="Kế hoạch an toàn dựa trên chi tiêu hằng tháng, quỹ dự phòng và danh mục của bạn. Nhập thu chi hoặc tài sản để AI đề xuất 3 bước phù hợp."
    >
    <div className="space-y-4">
      <PageHero
        title="Không cần lợi nhuận cao nhất."
        highlight="Điều quan trọng là kế hoạch của bạn {em:bền hơn}."
        subtitle="Một kế hoạch đơn giản, phù hợp với bạn, sẽ giúp bạn đi xa hơn\nvà vững vàng hơn trên hành trình tài chính."
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.75fr_1fr]">
        <ComparisonCard proposal={proposal} />
        <StepsCard steps={proposal.steps} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <AiSupportCard />
        <ChartCard proposal={proposal} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <TasksCard proposal={proposal} applied={applied} />
        <ApplyCard applied={applied} />
      </div>
    </div>
    </NeedData>
  );
}

/* ───────── So sánh ───────── */

const VOLATILITY_TONE: Record<PlanMetrics['volatility'], Tone> = { Cao: 'red', 'Vừa phải': 'orange', Thấp: 'green' };
const months = (v: number) => `${String(Math.round(v)).replace('.', ',')} tháng`;

function PlanColumn({ title, badge, metrics, goalTitle, proposed }: { title: string; badge: string; metrics: PlanMetrics; goalTitle: string; proposed?: boolean }) {
  const rows: { icon: LucideIcon; label: string; value: ReactNode }[] = [
    { icon: House, label: `Khả năng đạt mục tiêu ${goalTitle}`, value: formatPct(metrics.goalProbability) },
    { icon: ShieldCheck, label: 'Mức an tâm', value: metrics.peaceScore },
    { icon: Coins, label: 'Tiền dự phòng', value: months(metrics.emergencyMonths) },
    { icon: Activity, label: 'Biến động', value: <Badge tone={VOLATILITY_TONE[metrics.volatility]}>{metrics.volatility}</Badge> },
  ];
  return (
    <div className={cx('rounded-xl border p-4', proposed ? 'border-[#CDEBDC] bg-[#F1FAF5]' : 'border-line bg-[#F8FAFC]')}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[16px] font-bold text-ink">{title}</p>
        <span className={cx('rounded-full px-3 py-1 text-xs font-semibold', proposed ? 'bg-primary-600 text-white' : 'bg-slate-200 text-ink-soft')}>{badge}</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 py-3">
            <r.icon className={cx('h-5 w-5 shrink-0', proposed ? 'text-primary-600' : 'text-ink-soft')} aria-hidden />
            <span className="flex-1 text-[13px] text-ink">{r.label}</span>
            <span className={cx('text-[22px] font-bold', proposed ? 'text-primary-700' : 'text-ink')}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonCard({ proposal }: { proposal: PlanProposal }) {
  const goal = proposal.goalTitle?.toLowerCase() ?? 'chính';
  return (
    <Card>
      <CardTitle icon={Scale} title="Kế hoạch hiện tại và kế hoạch đề xuất" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PlanColumn title="Kế hoạch hiện tại" badge="Hiện tại" metrics={proposal.current} goalTitle={goal} />
        <PlanColumn title="Kế hoạch đề xuất" badge="Được AI đề xuất" metrics={proposal.proposed} goalTitle={goal} proposed />
      </div>
    </Card>
  );
}

const STEP_TONE = ['bg-accent-50 text-accent-600', 'bg-violet-50 text-violet-600', 'bg-success-50 text-success-600'];

function StepsCard({ steps }: { steps: PlanProposal['steps'] }) {
  return (
    <Card>
      <CardTitle icon={Lightbulb} tone="orange" title={`${steps.length} bước AI đề xuất`} />
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-center gap-4">
            <span className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold', STEP_TONE[i % STEP_TONE.length])}>{i + 1}</span>
            <div>
              <p className="text-[15px] font-bold text-accent-600">Bước {i + 1}</p>
              <p className="text-[15px] text-ink">
                {step.title} <span className="text-ink-soft">{step.detail}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const AI_SUPPORT = [
  { icon: BarChart3, tone: 'blue', text: 'Theo dõi xem bạn có đang đi đúng kế hoạch không' },
  { icon: Bell, tone: 'blue', text: 'Nhắc cân bằng lại khi danh mục lệch quá xa' },
  { icon: RefreshCw, tone: 'green', text: 'Ưu tiên dùng dòng tiền mới để điều chỉnh, hạn chế mua bán không cần thiết' },
  { icon: FileText, tone: 'violet', text: 'Giải thích vì sao nên thay đổi' },
] as const;

function AiSupportCard() {
  return (
    <Card>
      <CardTitle icon={BarChart3} title="Cách AI hỗ trợ thực tế" />
      <ul className="space-y-4">
        {AI_SUPPORT.map((item) => (
          <li key={item.text} className="flex items-center gap-4">
            <IconTile icon={item.icon} tone={item.tone} />
            <p className="text-[15px] text-ink">{item.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ChartCard({ proposal }: { proposal: PlanProposal }) {
  const last = proposal.chart.at(-1);
  return (
    <Card>
      <CardTitle
        icon={BarChart3}
        title="Nếu làm theo kế hoạch này"
        action={<Select label="Khoảng thời gian" value={12} onChange={() => undefined} options={[{ value: 12, label: '12 tháng' }]} />}
      />
      <div className="mb-2 flex gap-5 text-[13px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-300" />Kế hoạch hiện tại</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary-600" />Kế hoạch đề xuất</span>
      </div>
      <div className="relative h-[220px]">
        {last && (
          <div className="absolute right-0 top-0 z-10 flex flex-col items-end gap-1 text-xs font-semibold text-white">
            <span className="rounded-md bg-primary-600 px-2 py-0.5">{formatPct(last.proposed)}</span>
            <span className="rounded-md bg-slate-400 px-2 py-0.5">{formatPct(last.current)}</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={proposal.chart} margin={{ top: 8, right: 52, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="plan-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CFEAF8" />
                <stop offset="100%" stopColor="#EEF7FC" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EEF2F6" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} tickFormatter={(l: string) => l.replace('Tháng ', 'T')} interval={0} />
            <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} width={40} />
            <Tooltip formatter={(v, name) => [formatPct(Number(v)), name === 'current' ? 'Kế hoạch hiện tại' : 'Kế hoạch đề xuất']} />
            <Bar dataKey="proposed" fill="url(#plan-bar)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} legendType="none" />
            <Line dataKey="current" stroke="#94A3B8" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#94A3B8', strokeWidth: 2 }} isAnimationActive={false} />
            <Line dataKey="proposed" stroke="#1FA16B" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#1FA16B', strokeWidth: 2 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ───────── Việc cần làm + Áp dụng ───────── */

function TaskRow({ task, onToggle, disabled }: { task: Pick<PlanTask, 'title' | 'tag' | 'done'>; onToggle?: (done: boolean) => void; disabled?: boolean }) {
  return (
    <li>
      <label className={cx('flex items-center gap-3 rounded-xl border border-line px-4 py-3', disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50')}>
        <input
          type="checkbox"
          checked={task.done}
          disabled={disabled}
          onChange={(e) => onToggle?.(e.target.checked)}
          className="h-5 w-5 shrink-0 cursor-pointer rounded accent-accent-600 disabled:cursor-default"
        />
        <span className={cx('flex-1 text-[15px]', task.done ? 'text-ink-soft line-through' : 'text-ink')}>{task.title}</span>
        <Badge tone={task.tag === 'Quan trọng' ? 'green' : 'blue'}>{task.tag}</Badge>
      </label>
    </li>
  );
}

function TasksCard({ proposal, applied }: { proposal: PlanProposal; applied: PlansData['applied'] }) {
  const toggle = useToggleTask();
  return (
    <Card>
      <CardTitle icon={SquareCheck} title="Việc cần làm tháng này" subtitle={applied ? undefined : 'Áp dụng kế hoạch để bắt đầu theo dõi các việc này.'} />
      <ul className="space-y-2">
        {applied
          ? applied.tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={(done) => toggle.mutate({ id: t.id, done })} />)
          : proposal.tasks.map((t) => <TaskRow key={t.title} task={{ ...t, done: false }} disabled />)}
      </ul>
    </Card>
  );
}

function ApplyCard({ applied }: { applied: PlansData['applied'] }) {
  const apply = useApplyPlan();
  return (
    <Card className="flex flex-col">
      <CardTitle icon={Flag} title="Sẵn sàng áp dụng kế hoạch?" />
      <p className="text-sm leading-relaxed text-ink-soft">
        Áp dụng kế hoạch để AI theo dõi và nhắc nhở bạn hàng tháng.
        <br />
        Bạn cũng có thể tùy chỉnh lại cho phù hợp hơn với tình hình của mình.
      </p>
      {applied && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2 text-sm font-medium text-success-600">
          <CircleCheck className="h-4 w-4" aria-hidden />
          Đã áp dụng ngày {new Date(applied.appliedAt).toLocaleDateString('vi-VN')}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-3 pt-5">
        <Button size="lg" arrow onClick={() => apply.mutate()} disabled={apply.isPending} className="flex-1">
          {apply.isPending ? 'Đang áp dụng…' : applied ? 'Áp dụng lại' : 'Áp dụng kế hoạch'}
        </Button>
        <ButtonLink to="/mo-phong" size="lg" variant="outline" icon={SlidersHorizontal} className="flex-1">
          Tùy chỉnh lại
        </ButtonLink>
      </div>
      {apply.error && <p role="alert" className="mt-2 text-sm text-danger-600">{apply.error.message}</p>}
    </Card>
  );
}
