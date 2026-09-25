import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { CalendarDays, ChevronRight, CheckCircle, AlertCircle, BarChart3, Zap, Target, Lightbulb, House, GraduationCap, Palmtree, ShieldCheck } from 'lucide-react';
import type { GoalCard, GoalsSummary } from '@shared/engine/analysis';
import type { GoalKind } from '@shared/types/domain';
import { formatVnd, formatMonth, formatPct } from '@shared/format';
import { FamilyCity, HouseCalendar } from '@/components/pixel';
import { Button, ButtonLink, Card, CardTitle, EmptyState, ErrorState, IconTile, PageHero, PageSkeleton, ProgressBar, Rich, cx, type Tone } from '@/components/ui';
import { useGoals } from '@/lib/queries';
import { GoalFormModal } from './GoalFormModal';

export default function GoalsPage() {
  // undefined = đóng; null = thêm mới; GoalCard = đang sửa
  const [editing, setEditing] = useState<GoalCard | null | undefined>(undefined);
  const { data, error, refetch, isPending } = useGoals();

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const hero = (
    <PageHero
      title="Tiền không chỉ để đầu tư,"
      highlight={<Rich text="mà để đạt những điều quan trọng trong {em:cuộc sống}." />}
      subtitle="Đặt mục tiêu rõ ràng để AI giúp bạn giữ kế hoạch đi đúng hướng."
      scene={(cls) => <FamilyCity className={cls} />}
      sceneWidth="42%"
    />
  );
  const modal = editing !== undefined && <GoalFormModal key={editing?.id ?? 'new'} goal={editing} onClose={() => setEditing(undefined)} />;

  if (data.goals.length === 0) {
    return (
      <div className="space-y-4">
        {hero}
        <EmptyState
          icon={Target}
          title="Bạn chưa đặt mục tiêu nào"
          body="Mua nhà, quỹ học cho con, nghỉ hưu hay đơn giản là quỹ dự phòng. AI sẽ ước tính khả năng đạt đúng hạn và cảnh báo sớm khi kế hoạch lệch hướng."
          action={<Button onClick={() => setEditing(null)}>+ Thêm mục tiêu đầu tiên</Button>}
        />
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hero}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {data.goals.map((goal) => (
          <GoalCardItem key={goal.id} goal={goal} index={data.goals.indexOf(goal)} onEdit={setEditing} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <MilestonesCard milestones={data.milestones} onAdd={() => setEditing(null)} />
        <MonthlyChartCard goals={data.goals} />
      </div>

      {data.tip && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.15fr]">
          <AiHelpCard />
          <TipCard tip={data.tip} />
        </div>
      )}
      {!data.tip && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AiHelpCard />
        </div>
      )}

      {modal}
    </div>
  );
}

/* ───────── Goal Card ───────── */

const GOAL_ICON: Record<GoalKind, typeof House> = {
  home: House,
  education: GraduationCap,
  retirement: Palmtree,
  emergency: ShieldCheck,
  custom: Target,
};

const GOAL_TONE: Record<GoalKind, Tone> = {
  home: 'red',
  education: 'violet',
  retirement: 'green',
  emergency: 'blue',
  custom: 'orange',
};

const BAR_COLORS = ['#3DBE8B', '#4C8DF0', '#F5B83D', '#A78BFA'];

function GoalCardItem({ goal, index, onEdit }: { goal: GoalCard; index: number; onEdit: (goal: GoalCard) => void }) {
  const Icon = GOAL_ICON[goal.kind];
  const good = goal.probability >= 0.7;
  return (
    <Card className="flex flex-col">
      <button type="button" onClick={() => onEdit(goal)} className="group -m-1 mb-4 flex items-center gap-3 rounded-xl p-1 text-left hover:bg-slate-50" aria-label={`Chỉnh sửa mục tiêu ${goal.title}`}>
        <IconTile icon={Icon} tone={GOAL_TONE[goal.kind]} size="lg" />
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-ink">{goal.title}</span>
        <ChevronRight className="h-5 w-5 text-ink-soft group-hover:text-ink" aria-hidden />
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-ink-soft">Mục tiêu</p>
          <p className="mt-0.5 whitespace-nowrap text-[21px] font-bold leading-tight text-ink">{formatVnd(goal.targetAmount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-soft">Đã có</p>
          <p className="mt-0.5 whitespace-nowrap text-[21px] font-bold leading-tight text-ink">{formatVnd(goal.currentAmount)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={goal.progress} color={BAR_COLORS[index % BAR_COLORS.length]} label={`Tiến độ ${goal.title}`} />
        <span className="text-xs font-medium text-ink-soft">{Math.round(goal.progress * 100)}%</span>
      </div>
      <p className={cx('mt-4 flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-[12.5px] text-ink', good ? 'bg-success-50' : 'bg-warning-50')}>
        {good ? <CheckCircle className="h-4 w-4 shrink-0 text-success-600" aria-hidden /> : <AlertCircle className="h-4 w-4 shrink-0 text-warning-600" aria-hidden />}
        Khả năng đạt đúng hạn: <b className={good ? 'text-success-600' : 'text-warning-600'}>{formatPct(goal.probability)}</b>
      </p>
      <p className="mt-3 flex items-center gap-2 whitespace-nowrap text-[12.5px] text-ink-soft">
        <CalendarDays className="h-4 w-4" aria-hidden />
        Thời gian mục tiêu: <b className="font-semibold text-ink">{formatMonth(goal.targetMonth)}</b>
      </p>
    </Card>
  );
}

/* ───────── Lộ trình ───────── */

const MILESTONE_ICON: Record<GoalKind, typeof House> = { ...GOAL_ICON, custom: BarChart3 };
const MILESTONE_DOT: Record<GoalKind, string> = { home: 'bg-violet-500', education: 'bg-violet-500', retirement: 'bg-warning-500', emergency: 'bg-success-500', custom: 'bg-accent-600' };

function MilestonesCard({ milestones, onAdd }: { milestones: GoalsSummary['milestones']; onAdd: () => void }) {
  return (
    <Card>
      <CardTitle icon={Target} title="Lộ trình mục tiêu" subtitle="Những cột mốc quan trọng trên hành trình của bạn." action={<Button size="sm" variant="soft" onClick={onAdd}>+ Thêm mục tiêu</Button>} />
      <ol className="relative mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
        <span className="absolute left-[10%] right-[10%] top-[58px] h-1 rounded-full bg-gradient-to-r from-accent-100 via-violet-50 to-warning-50" aria-hidden />
        {milestones.map((m, i) => {
          const Icon = MILESTONE_ICON[m.kind];
          return (
            <li key={`${m.year}-${i}`} className="relative flex flex-col items-center text-center">
              <IconTile icon={Icon} tone={m.kind === 'custom' ? 'blue' : GOAL_TONE[m.kind]} className="rounded-full" />
              <span className={cx('relative mt-2.5 h-3.5 w-3.5 rounded-full ring-4 ring-white', MILESTONE_DOT[m.kind])} aria-hidden />
              <p className="mt-2 text-[15px] font-bold text-ink">{m.year}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                {m.title}
                <br />
                {m.detail}
              </p>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ───────── Mỗi tháng cần để dành ───────── */

function MonthlyChartCard({ goals }: { goals: GoalCard[] }) {
  const data = goals.map((g, i) => ({ name: g.title, value: g.requiredMonthly, color: BAR_COLORS[i % BAR_COLORS.length] }));
  return (
    <Card>
      <CardTitle icon={BarChart3} title="Mỗi tháng cần để dành bao nhiêu?" subtitle="Số tiền gợi ý để giúp bạn đạt mục tiêu đúng hạn." />
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F6" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5B6B7F' }} interval={0} />
            <YAxis tickFormatter={(v: number) => (v === 0 ? '0' : formatVnd(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} width={64} />
            <Tooltip content={<ChartTooltipMonthly />} cursor={{ fill: '#F4F8FB' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(v) => formatVnd(Number(v))} style={{ fontSize: 13, fontWeight: 700, fill: '#0F2A44' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}


function ChartTooltipMonthly({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <p className="text-ink-soft">{payload[0].name}: <b className="text-ink font-semibold">{formatVnd(Number(payload[0].value))}</b></p>
    </div>
  );
}


/* ───────── AI Help Card ───────── */

const AI_HELP = [
  { icon: BarChart3, tone: 'blue' as Tone, title: 'Tính xem mục tiêu nào đang an toàn', desc: 'AI phân tích tiến độ và khả năng đạt đúng hạn.' },
  { icon: Target, tone: 'violet' as Tone, title: 'Ước lượng mỗi tháng cần để dành bao nhiêu', desc: 'Dựa trên mục tiêu, thu nhập và danh mục hiện tại.' },
  { icon: AlertCircle, tone: 'orange' as Tone, title: 'Báo sớm nếu mục tiêu có nguy cơ bị chậm', desc: 'Giúp bạn kịp thời điều chỉnh kế hoạch.' },
  { icon: Zap, tone: 'green' as Tone, title: 'Gợi ý ưu tiên mục tiêu nào trước', desc: 'Dựa trên mức độ quan trọng và khả năng thực hiện.' },
];

function AiHelpCard() {
  return (
    <Card>
      <CardTitle icon={Lightbulb} tone="orange" title="AI giúp gì ở trang này?" />
      <ul className="space-y-4">
        {AI_HELP.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <IconTile icon={item.icon} tone={item.tone} size="sm" />
            <div>
              <p className="text-[14px] font-medium text-ink">{item.title}</p>
              <p className="text-[13px] text-ink-soft">{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Tip Card ───────── */

function TipCard({ tip }: { tip: NonNullable<GoalsSummary['tip']> }) {
  return (
    <Card tone="cream" className="flex flex-col">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
        <Lightbulb className="h-6 w-6 text-warning-500" fill="#FDE3A7" aria-hidden />
        Gợi ý từ AI
      </h3>
      <div className="-mx-5 mb-3 h-[104px] w-[calc(100%+40px)]">
        <HouseCalendar className="h-full w-full" />
      </div>
      <p className="text-[14.5px] leading-relaxed text-ink">
        <Rich text={tip.text} />
      </p>
      <div className="mt-auto flex flex-wrap gap-3 pt-4">
        <ButtonLink to="/ke-hoach" variant="primary" arrow>
          Xem kế hoạch an toàn
        </ButtonLink>
        <ButtonLink to="/mo-phong" variant="soft" arrow>
          Mô phỏng ngay
        </ButtonLink>
      </div>
    </Card>
  );
}
