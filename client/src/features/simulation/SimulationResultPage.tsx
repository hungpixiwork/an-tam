import { useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, Coins, House, Info, PiggyBank, ShieldCheck, ShieldPlus, TrendingUp, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react';
import type { SimulationReport } from '@shared/engine/analysis';
import { formatDuration, formatPct, formatVnd } from '@shared/format';
import { HeroLakeCity } from '@/components/pixel';
import { ButtonLink, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Rich, cx, type Tone } from '@/components/ui';
import { isDecisionResult, useRun } from '@/lib/queries';
import { SavedDecisionResult } from './SavedDecisionResult';

export default function SimulationResultPage() {
  const { runId = '' } = useParams();
  const { data, error, isPending, refetch } = useRun(runId);
  if (isPending) return <PageSkeleton />;
  if (error)
    return (
      <div className="space-y-4">
        <ErrorState error={error} onRetry={() => refetch()} />
        <div className="text-center">
          <ButtonLink to="/mo-phong" variant="soft" arrow>
            Quay lại mô phỏng
          </ButtonLink>
        </div>
      </div>
    );
  if (isDecisionResult(data)) return <SavedDecisionResult r={data} createdAt={data.createdAt} />;
  return <Result report={data} />;
}

function Result({ report }: { report: SimulationReport }) {
  const { before, after, home } = report;
  const homeImpact = report.goals.find((g) => g.kind === 'home');
  const nwDiff = after.netWorth - before.netWorth;
  const emergencyLost = Math.max(0, Math.round(before.emergencyMonths - after.emergencyMonths));

  let handleStatus: { label: string; cardTone: 'mint' | 'rose' | 'cream'; titleTone: Tone; cls: string; desc: string };
  if (after.emergencyMonths >= 6 && after.peaceScore >= 60) {
    handleStatus = { label: 'Có thể xử lý được', cardTone: 'mint', titleTone: 'green', cls: 'bg-success-50 text-success-700', desc: 'Quỹ dự phòng và mức an tâm vẫn ở mức an toàn.' };
  } else if (after.emergencyMonths < 3 || after.peaceScore < 40) {
    handleStatus = { label: 'Cần hành động ngay', cardTone: 'rose', titleTone: 'red', cls: 'bg-danger-50 text-danger-700', desc: 'Tình hình tài chính sẽ rơi vào vùng nguy hiểm.' };
  } else {
    handleStatus = { label: 'Căng nhưng khả thi', cardTone: 'cream', titleTone: 'orange', cls: 'bg-warning-50 text-warning-700', desc: 'Bạn sẽ cần thắt chặt chi tiêu một thời gian.' };
  }

  return (
    <div className="space-y-4">
      <PageHero
        eyebrow={`Kịch bản: ${report.label}`}
        title={report.headline.title}
        highlight={<span className="text-primary-700">{report.headline.emphasis}</span>}
        subtitle={<Rich text={report.headline.body} />}
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CompareCard
          icon={Coins}
          tone="violet"
          title="Tổng tài sản"
          before={formatVnd(before.netWorth)}
          after={formatVnd(after.netWorth)}
          pill={nwDiff < 0 ? `↓ ${formatPct(-nwDiff / before.netWorth)}` : 'Không đổi'}
          note={nwDiff < 0 ? `giảm ${formatVnd(-nwDiff)}` : ''}
          worse={nwDiff < 0}
        />
        <CompareCard
          icon={ShieldPlus}
          tone="green"
          title="Mức an tâm"
          before={String(before.peaceScore)}
          after={String(after.peaceScore)}
          pill={after.peaceScore < before.peaceScore ? `↓ ${before.peaceScore - after.peaceScore} điểm` : 'Không đổi'}
          note={after.peaceScore < before.peaceScore ? 'mức an tâm giảm' : ''}
          worse={after.peaceScore < before.peaceScore}
        />
        {home && (
          <CompareCard
            icon={House}
            tone="orange"
            title={`Mục tiêu ${home.goalTitle.toLowerCase()}`}
            before={home.beforeLabel}
            after={home.afterLabel}
            pill={home.delayMonths > 0 ? `+${home.delayMonths} tháng` : 'Đúng hạn'}
            pillIcon={Clock}
            note={home.delayMonths > 0 ? 'so với kế hoạch' : ''}
            worse={home.delayMonths > 0}
          />
        )}
        <CompareCard
          icon={PiggyBank}
          tone="blue"
          title="Tiền dự phòng"
          before={formatVnd(before.emergencyAmount)}
          after={`còn đủ ${formatDuration(after.emergencyMonths)}`}
          pill={emergencyLost > 0 ? `↓ ${emergencyLost} tháng` : 'Không đổi'}
          note={emergencyLost > 0 ? 'ngắn hơn so với trước' : ''}
          worse={emergencyLost > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChangeChart report={report} homeBefore={homeImpact?.probabilityBefore} homeAfter={homeImpact?.probabilityAfter} />
        <div className="flex flex-col gap-4">
          <Card tone={handleStatus.cardTone}>
            <CardTitle icon={ShieldCheck} tone={handleStatus.titleTone} title="Bạn có thể vượt qua không?" />
            <div className="flex flex-col items-center justify-center p-4 text-center">
               <span className={cx('inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold', handleStatus.cls)}>
                 {handleStatus.label}
               </span>
               <p className="mt-3 text-[14px] text-ink-soft">{handleStatus.desc}</p>
            </div>
          </Card>
          <Card tone="rose" className="flex-1">
            <CardTitle icon={TriangleAlert} tone="red" title="Điều đáng lo nhất" />
            <div className="flex items-start gap-4 rounded-xl bg-[#FDE8E6] p-4">
              <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white">
                <UserRound className="h-11 w-11 text-ink-soft" aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-danger-500 text-sm font-bold text-white">!</span>
              </span>
              <p className="text-[15px] font-semibold leading-relaxed text-ink">
                <Rich text={report.worry.replace(/\{em:/g, '{danger:')} />
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Danh mục của bạn vẫn tồn tại và có khả năng phục hồi khi thị trường ổn định trở lại. Tuy nhiên, quỹ dự phòng hiện tại chỉ đủ khoảng{' '}
              {formatDuration(after.emergencyMonths)} chi tiêu
              {home && home.delayMonths > 0 ? `, khiến mục tiêu ${home.goalTitle.toLowerCase()} có thể bị chậm hơn ${home.delayMonths} tháng` : ''}.
            </p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle icon={BarChart3} title="AI đề xuất 3 việc nên làm" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {report.suggestions.map((s, i) => {
              const style = SUGGESTION_STYLE[i % SUGGESTION_STYLE.length];
              return (
                <div key={s.key} className={cx('flex flex-col rounded-xl border p-4', style.box)}>
                  <div className="flex items-start gap-3">
                    <IconTile icon={style.icon} tone={style.tone} />
                    <p className={cx('text-[14.5px] font-bold leading-snug', style.title)}>{s.title}</p>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{s.body}</p>
                  <ButtonLink to={s.to} variant="white" size="sm" arrow className={cx('mt-auto self-start border-0', style.btn)}>
                    {s.action}
                  </ButtonLink>
                </div>
              );
            })}
          </div>
        </Card>
        <Card tone="mint" className="flex flex-col">
          <CardTitle icon={TrendingUp} tone="green" title="Nếu áp dụng gợi ý này" />
          <div className="space-y-3 rounded-xl bg-white p-4">
            <Improve label={`Khả năng đạt mục tiêu ${home?.goalTitle.toLowerCase() ?? 'chính'}`} before={formatPct(report.improvement.goalProbBefore)} after={formatPct(report.improvement.goalProbAfter)} />
            <div className="border-t border-line" />
            <Improve label="Mức an tâm" before={String(report.improvement.peaceBefore)} after={String(report.improvement.peaceAfter)} />
          </div>
          <div className="mt-auto flex flex-wrap gap-3 pt-4">
            <ButtonLink to="/ke-hoach" arrow className="flex-1">
              Tạo kế hoạch an toàn hơn
            </ButtonLink>
            <ButtonLink to="/mo-phong" variant="outline" className="flex-1">
              Thử kịch bản khác
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}

const SUGGESTION_STYLE = [
  { icon: PiggyBank, tone: 'green', box: 'border-[#D7EFE2] bg-[#F1FAF5]', title: 'text-primary-700', btn: 'bg-[#DDF3E7] text-primary-700 hover:bg-[#CDEBDC]' },
  { icon: BarChart3, tone: 'violet', box: 'border-[#E6DEFD] bg-[#F7F4FF]', title: 'text-violet-600', btn: 'bg-[#ECE6FE] text-violet-600 hover:bg-[#E2D9FD]' },
  { icon: ShieldCheck, tone: 'orange', box: 'border-[#F6E3C4] bg-[#FFF8EC]', title: 'text-warning-600', btn: 'bg-[#FDEBCB] text-warning-600 hover:bg-[#FBE0B0]' },
] as const satisfies readonly { icon: LucideIcon; tone: Tone; box: string; title: string; btn: string }[];

function CompareCard({ icon, tone, title, before, after, pill, pillIcon: PillIcon, note, worse }: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  before: string;
  after: string;
  pill: string;
  pillIcon?: LucideIcon;
  note: string;
  worse: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
          {title} <Info className="h-4 w-4 text-ink-mute" aria-hidden />
        </p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <p className="text-xs text-ink-soft">Trước mô phỏng</p>
          <p className="mt-1 text-[22px] font-bold leading-tight text-ink">{before}</p>
        </div>
        <ArrowRight className="mb-1.5 h-5 w-5 text-ink-soft" aria-hidden />
        <div>
          <p className="text-xs text-ink-soft">Sau mô phỏng</p>
          <p className={cx('mt-1 text-[22px] font-bold leading-tight', worse ? 'text-danger-600' : 'text-success-600')}>{after}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={cx('inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px] font-semibold', worse ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>
          {PillIcon && <PillIcon className="h-3.5 w-3.5" aria-hidden />}
          {pill}
        </span>
        {note && <span className="text-xs text-ink-soft">{note}</span>}
      </div>
    </Card>
  );
}

interface Group {
  label: string;
  before: number;
  after: number;
  fmt: (v: number) => string;
  change: string;
}

/** Mỗi nhóm có thang riêng (cột cao nhất = 100%) để so sánh trước / sau trong cùng đơn vị. */
function ChangeChart({ report, homeBefore, homeAfter }: { report: SimulationReport; homeBefore?: number; homeAfter?: number }) {
  const { before, after } = report;
  const pct = (a: number, b: number) => (a > 0 ? `${b >= a ? '+' : '-'}${formatPct(Math.abs(b - a) / a)}` : '0%');
  const groups: Group[] = [
    { label: 'Tài sản', before: before.netWorth, after: after.netWorth, fmt: (v) => formatVnd(v), change: pct(before.netWorth, after.netWorth) },
    ...(homeBefore !== undefined && homeAfter !== undefined
      ? [{ label: 'Mục tiêu mua nhà', before: homeBefore, after: homeAfter, fmt: (v: number) => formatPct(v), change: `${homeAfter >= homeBefore ? '+' : '-'}${Math.round(Math.abs(homeAfter - homeBefore) * 100)} điểm %` }]
      : []),
    { label: 'Quỹ dự phòng', before: before.emergencyAmount, after: after.emergencyAmount, fmt: (v) => formatVnd(v), change: pct(before.emergencyAmount, after.emergencyAmount) },
    { label: 'Mức an tâm', before: before.peaceScore, after: after.peaceScore, fmt: (v) => String(v), change: `${after.peaceScore >= before.peaceScore ? '+' : '-'}${Math.abs(after.peaceScore - before.peaceScore)} điểm` },
  ];

  return (
    <Card>
      <CardTitle
        icon={BarChart3}
        title="Điều gì thay đổi nhiều nhất?"
        action={
          <div className="hidden gap-4 text-xs text-ink-soft sm:flex">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#BFDBFE]" />Trước mô phỏng</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent-500" />Sau mô phỏng</span>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
        {groups.map((g) => {
          const max = Math.max(g.before, g.after, 1);
          const worse = g.after < g.before;
          return (
            <figure key={g.label} className="flex flex-col items-center">
              <div className="flex h-[170px] w-full items-end justify-center gap-2 border-b border-line">
                {[
                  { v: g.before, cls: 'bg-[#BFDBFE]', text: 'text-ink' },
                  { v: g.after, cls: 'bg-accent-500', text: 'text-ink font-bold' },
                ].map((bar, i) => (
                  <div key={i} className="flex w-14 flex-col items-center justify-end" style={{ height: '100%' }}>
                    {i === 1 && g.before !== g.after && (
                      <span className={cx('mb-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', worse ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>{g.change}</span>
                    )}
                    <span className={cx('mb-1 whitespace-nowrap text-xs', bar.text)}>{g.fmt(bar.v)}</span>
                    <div className={cx('w-full rounded-t-md', bar.cls)} style={{ height: `${Math.max(2, (bar.v / max) * 110)}px` }} />
                  </div>
                ))}
              </div>
              <figcaption className="mt-2 text-center text-[13px] font-medium text-ink">{g.label}</figcaption>
            </figure>
          );
        })}
      </div>
    </Card>
  );
}

function Improve({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-ink-soft">
        {label} <Info className="h-3.5 w-3.5 text-ink-mute" aria-hidden />
      </p>
      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="text-2xl font-bold text-ink">
          {before}
          <span className="block text-[11px] font-normal text-ink-soft">Hiện tại</span>
        </p>
        <ArrowRight className="h-5 w-5 text-ink-soft" aria-hidden />
        <p className="text-[30px] font-bold text-success-600">
          {after}
          <span className="block text-[11px] font-normal text-ink-soft">Sau khi áp dụng</span>
        </p>
      </div>
    </div>
  );
}
