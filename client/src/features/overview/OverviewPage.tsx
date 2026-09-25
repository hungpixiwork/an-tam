import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { BarChart3, Bot, Check, ChevronRight, CircleDollarSign, Coins, Info, Lightbulb, NotebookPen, PieChart, Plus, ShieldPlus, Target, TrendingUp, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OverviewData } from '@shared/types/api';
import { formatVnd } from '@shared/format';
import { FamilyCity, HeroLakeCity, HouseCalendar } from '@/components/pixel';
import { Badge, ButtonLink, Card, CardTitle, DeltaBadge, DonutChart, EmptyState, ErrorState, IconTile, PageHero, PageSkeleton, ProgressBar, Rich, ScoreRing, Select, TextLink, cx, type Tone } from '@/components/ui';
import { useOverview } from '@/lib/queries';

export default function OverviewPage() {
  const [range, setRange] = useState(12);
  const { data, error, refetch, isPending } = useOverview(range);
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHero
        eyebrow={null}
        title={data.greeting.title}
        highlight={<Rich text={data.greeting.headline} />}
        subtitle={<Rich text={data.greeting.sub} />}
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <SetupCard setup={data.setup} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.75fr_repeat(4,1fr)]">
        <PeaceCard peace={data.peace} ready={data.setup.profile || data.setup.holdings} />
        <StatCard icon={Coins} tone="violet" label="Tổng tài sản" kpi={data.kpis.netWorth} />
        <StatCard icon={Wallet} tone="green" label="Tiền dự phòng" kpi={data.kpis.emergency} />
        <StatCard icon={BarChart3} tone="orange" label="Tiền đầu tư" kpi={data.kpis.invested} />
        <CashflowCard kpi={data.kpis.cashflow} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[7fr_5fr]">
        <NetWorthChart series={data.netWorthSeries} range={range} onRange={setRange} />
        <AllocationCard allocation={data.allocation} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
        <AiDoingCard />
        <TipCard tip={data.tip} />
        <CommunityCard />
      </div>
    </div>
  );
}

/* ───────── Checklist nhập liệu ───────── */

const SETUP_STEPS: { key: keyof OverviewData['setup']; icon: LucideIcon; title: string; body: string; to: string; cta: string }[] = [
  { key: 'profile', icon: Wallet, title: 'Thu chi hằng tháng', body: 'Số ước lượng để AI tính khả năng để dành.', to: '/cai-dat#tai-chinh', cta: 'Nhập thu chi' },
  { key: 'holdings', icon: PieChart, title: 'Tài sản đang có', body: 'Tiết kiệm, quỹ, cổ phiếu, vàng...', to: '/danh-muc', cta: 'Thêm tài sản' },
  { key: 'goals', icon: Target, title: 'Mục tiêu', body: 'Mua nhà, học cho con, nghỉ hưu...', to: '/muc-tieu', cta: 'Đặt mục tiêu' },
  { key: 'transactions', icon: NotebookPen, title: 'Ghi sổ thu chi', body: 'AI dùng số thực tế thay cho số ước lượng.', to: '/thu-chi', cta: 'Ghi khoản đầu tiên' },
];

/** Ẩn khi người dùng đã nhập đủ cả 4 phần. */
function SetupCard({ setup }: { setup: OverviewData['setup'] }) {
  const done = SETUP_STEPS.filter((s) => setup[s.key]).length;
  if (done === SETUP_STEPS.length) return null;
  return (
    <Card tone="mint">
      <CardTitle icon={Bot} tone="teal" title="Giúp An Tâm AI hiểu bạn rõ hơn" subtitle={`Đã hoàn thành ${done}/${SETUP_STEPS.length} phần — càng đủ dữ liệu, phân tích càng chính xác.`} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SETUP_STEPS.map((s) => (
          <li key={s.key} className="flex items-start gap-3 rounded-xl border border-[#D7EFE2] bg-white p-3">
            <IconTile icon={setup[s.key] ? Check : s.icon} tone={setup[s.key] ? 'green' : 'teal'} size="sm" />
            <div className="min-w-0">
              <p className={cx('text-sm font-semibold', setup[s.key] ? 'text-ink-soft line-through' : 'text-ink')}>{s.title}</p>
              {setup[s.key] ? (
                <p className="text-xs text-success-600">Đã có dữ liệu</p>
              ) : (
                <>
                  <p className="text-xs text-ink-soft">{s.body}</p>
                  <TextLink to={s.to} className="mt-1">
                    {s.cta}
                  </TextLink>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Mức an tâm ───────── */

const LEVEL_TONE: Record<OverviewData['peace']['level'], Tone> = { stable: 'green', watch: 'orange', action: 'red' };

function PeaceCard({ peace, ready }: { peace: OverviewData['peace']; ready: boolean }) {
  const [open, setOpen] = useState(false);
  if (!ready) {
    return (
      <Card className="flex items-center gap-5 md:col-span-2 lg:col-span-4 xl:col-span-1">
        <ScoreRing score={0} size={124} stroke={15} color="#94A3B8" label="Chưa đủ dữ liệu để tính mức an tâm">
          <span className="text-2xl font-bold text-ink-mute">—</span>
        </ScoreRing>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink">Mức an tâm tài chính</p>
          <Badge tone="gray" className="mt-3">{peace.label}</Badge>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">{peace.description}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="relative flex items-center gap-5 md:col-span-2 lg:col-span-4 xl:col-span-1">
      <ScoreRing score={peace.score} size={124} stroke={15} label={`Mức an tâm tài chính ${peace.score}/100`} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-bold text-ink">
          Mức an tâm tài chính
          <Info className="h-4 w-4 text-ink-mute" aria-hidden />
        </p>
        <Badge tone={LEVEL_TONE[peace.level]} icon={TrendingUp} className="mt-3 h-8 px-4 text-sm">
          {peace.label}
        </Badge>
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">{peace.description}</p>
        <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600 hover:text-accent-700" aria-expanded={open}>
          Xem chi tiết <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {open && <PeaceBreakdown peace={peace} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function PeaceBreakdown({ peace, onClose }: { peace: OverviewData['peace']; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose} role="dialog" aria-modal="true" aria-label="Chi tiết mức an tâm tài chính">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Vì sao bạn đạt {peace.score} điểm?</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-slate-100" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-5">
          {peace.factors.map((f) => (
            <li key={f.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-semibold text-ink">{f.label}</span>
                <span className="text-sm font-bold text-ink">
                  {Math.round(f.score)}<span className="font-medium text-ink-soft">/{f.max}</span>
                </span>
              </div>
              <ProgressBar value={f.score / f.max} color={f.score / f.max >= 0.8 ? '#1FA16B' : f.score / f.max >= 0.6 ? '#F5A524' : '#EF4444'} label={f.label} />
              <p className="mt-1.5 text-[13px] text-ink-soft">{f.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 rounded-xl bg-accent-50 p-4 text-[13px] leading-relaxed text-ink-soft">
          Điểm được tính hoàn toàn từ dữ liệu của bạn theo công thức cố định — cùng dữ liệu luôn cho cùng kết quả.
        </p>
      </div>
    </div>
  );
}

/* ───────── KPI ───────── */

function StatCard({ icon, tone, label, kpi }: { icon: typeof Coins; tone: Tone; label: string; kpi: OverviewData['kpis']['netWorth'] }) {
  return (
    <Card className="flex flex-col">
      <IconTile icon={icon} tone={tone} size="lg" />
      <p className="mt-5 text-[15px] font-medium text-ink">{label}</p>
      <p className="mt-1 text-[30px] font-bold leading-tight tracking-tight text-ink">{formatVnd(kpi.value)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <DeltaBadge value={kpi.deltaPct} />
        <span className="text-[11.5px] text-ink-soft">{kpi.compareLabel}</span>
      </div>
    </Card>
  );
}

const TREND = { better: { label: 'Tốt hơn', tone: 'green' }, worse: { label: 'Kém hơn', tone: 'red' }, same: { label: 'Như cũ', tone: 'gray' } } as const;

function CashflowCard({ kpi }: { kpi: OverviewData['kpis']['cashflow'] }) {
  const t = TREND[kpi.trend];
  return (
    <Card className="flex flex-col">
      <IconTile icon={CircleDollarSign} tone="blue" size="lg" />
      <p className="mt-5 text-[15px] font-medium text-ink">Dòng tiền tháng này</p>
      <p className={cx('mt-1 text-[30px] font-bold leading-tight tracking-tight', kpi.value >= 0 ? 'text-primary-700' : 'text-danger-600')}>{formatVnd(kpi.value, { sign: true })}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <Badge tone={t.tone}>{t.label}</Badge>
        <span className="text-[11.5px] text-ink-soft">{kpi.compareLabel}</span>
      </div>
    </Card>
  );
}

/* ───────── Biểu đồ tài sản ───────── */

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-ink">{label}</p>
      <p className="text-ink-soft">Tổng tài sản: <b className="text-ink">{formatVnd(Number(payload[0].value))}</b></p>
    </div>
  );
}

/** Mốc trục Y "tròn" (1-2-2,5-5 × 10ⁿ) phủ được giá trị lớn nhất, khoảng 4 khoảng chia. */
function niceTicks(max: number): number[] {
  const raw = Math.max(max, 10_000_000) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((x) => x * pow).find((x) => x >= raw)!;
  return Array.from({ length: Math.max(2, Math.ceil(max / step) + 1) }, (_, i) => i * step);
}

function NetWorthChart({ series, range, onRange }: { series: OverviewData['netWorthSeries']; range: number; onRange: (v: number) => void }) {
  const last = series.at(-1);
  const ticks = niceTicks(Math.max(...series.map((s) => s.total)));
  return (
    <Card>
      <CardTitle
        icon={BarChart3}
        title={`Tài sản ${range} tháng gần đây`}
        action={<Select label="Khoảng thời gian" value={range} onChange={onRange} options={[{ value: 6, label: '6 tháng' }, { value: 12, label: '12 tháng' }]} />}
      />
      <div className="relative h-[190px]">
        {last && (
          <span className="absolute right-3 top-0 z-10 rounded-md bg-primary-600 px-2 py-0.5 text-[13px] font-semibold text-white shadow-sm">{formatVnd(last.total)}</span>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 22, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="nw-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#BFE3F7" />
                <stop offset="100%" stopColor="#E3F2FB" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EEF2F6" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} interval={0} tickFormatter={(l: string) => l.replace('Tháng ', 'T')} />
            <YAxis ticks={ticks} domain={[0, ticks.at(-1)!]} tickFormatter={(v: number) => (v === 0 ? '0' : formatVnd(v, { axis: true }))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A97A8' }} width={64} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F4F8FB' }} />
            <Bar dataKey="total" fill="url(#nw-bar)" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
            <Line dataKey="total" type="monotone" stroke="#1FA37A" strokeWidth={2} dot={{ r: 3, fill: '#fff', stroke: '#1FA37A', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ───────── Phân bổ ───────── */

function AllocationCard({ allocation }: { allocation: OverviewData['allocation'] }) {
  if (allocation.total === 0) {
    return (
      <Card>
        <CardTitle icon={PieChart} title="Tiền của bạn đang nằm ở đâu?" />
        <EmptyState compact icon={Coins} title="Chưa có tài sản nào" body="Thêm tài sản để xem tiền của bạn đang phân bổ thế nào." action={<ButtonLink to="/danh-muc" variant="soft" size="sm" icon={Plus}>Thêm tài sản</ButtonLink>} />
      </Card>
    );
  }
  return (
    <Card>
      <CardTitle icon={PieChart} title="Tiền của bạn đang nằm ở đâu?" action={<TextLink to="/danh-muc">Chi tiết</TextLink>} />
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <DonutChart data={allocation.slices.map((s) => ({ key: s.category, value: s.value, color: s.color }))} size={180} thickness={34}>
          <span className="text-xl font-bold text-ink">{formatVnd(allocation.total)}</span>
          <span className="text-[11px] text-ink-soft">tổng tài sản</span>
        </DonutChart>
        <ul className="w-full flex-1 space-y-3">
          {allocation.slices.map((s) => (
            <li key={s.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 whitespace-nowrap text-sm">
              <span className="flex items-center gap-2.5 text-ink">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="w-10 text-right text-ink-soft">{Math.round(s.pct * 100)}%</span>
              <span className="w-[72px] text-right font-medium text-ink">{formatVnd(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ───────── Hàng cuối ───────── */

const AI_DOING = [
  { icon: BarChart3, tone: 'blue', title: 'Theo dõi sự thay đổi của danh mục', body: 'Liên tục phân tích biến động và cập nhật cho bạn.' },
  { icon: ShieldPlus, tone: 'green', title: 'Cảnh báo nếu rủi ro tăng cao', body: 'Phát hiện sớm các dấu hiệu bất thường.' },
  { icon: Target, tone: 'violet', title: 'Mô phỏng các tình huống tương lai', body: 'Giúp bạn xem trước tác động trước khi quyết định.' },
  { icon: Lightbulb, tone: 'orange', title: 'Gợi ý cách giữ kế hoạch an toàn hơn', body: 'Đưa ra khuyến nghị phù hợp với mục tiêu của bạn.' },
] as const;

function AiDoingCard() {
  return (
    <Card>
      <CardTitle icon={Bot} tone="blue" title="AI đang làm gì cho bạn?" action={<TextLink to="/ai-theo-doi">Xem</TextLink>} />
      <ul className="space-y-4">
        {AI_DOING.map((item) => (
          <li key={item.title} className="flex items-start gap-4">
            <IconTile icon={item.icon} tone={item.tone} />
            <div>
              <p className="text-[15px] font-medium text-ink">{item.title}</p>
              <p className="text-[13px] text-ink-soft">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TipCard({ tip }: { tip: OverviewData['tip'] }) {
  return (
    <Card tone="cream" className="flex flex-col">
      <Link to="/ai-theo-doi" className="group mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-lg font-bold text-ink">
          <Lightbulb className="h-6 w-6 text-warning-500" fill="#FDE3A7" aria-hidden />
          Gợi ý hôm nay
        </span>
        <ChevronRight className="h-5 w-5 text-ink-soft group-hover:text-ink" aria-hidden />
      </Link>
      <HouseCalendar className="-mx-2 h-[104px] w-[calc(100%+16px)]" />
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{tip.text}</p>
      <div className="mt-auto pt-4">
        {tip.goalTitle ? (
          <ButtonLink to={`/mo-phong?preset=${tip.presetSlug}`} arrow>
            Xem mô phỏng
          </ButtonLink>
        ) : (
          <ButtonLink to="/muc-tieu" arrow>
            Đặt mục tiêu
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

function CommunityCard() {
  return (
    <Card tone="sky" className="flex flex-col">
      <Link to="/cong-dong" className="group mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-lg font-bold text-ink">
          <Users className="h-6 w-6 text-accent-600" aria-hidden />
          Vì cộng đồng
        </span>
        <ChevronRight className="h-5 w-5 text-ink-soft group-hover:text-ink" aria-hidden />
      </Link>
      <FamilyCity className="-mx-2 h-[112px] w-[calc(100%+16px)]" />
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink">
        An Tâm AI hướng đến giúp nhiều người hiểu tài chính rõ hơn, bớt đầu tư theo cảm tính và xây dựng cuộc sống bền vững.
      </p>
      <div className="mt-auto pt-4">
        <ButtonLink to="/cong-dong" variant="soft" arrow>
          Tìm hiểu thêm
        </ButtonLink>
      </div>
    </Card>
  );
}
