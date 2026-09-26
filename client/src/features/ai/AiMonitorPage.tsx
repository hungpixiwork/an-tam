import { useState } from 'react';
import { Activity, BarChart3, Bell, CheckCircle2, Database, FileText, Lightbulb, PieChart, Search, Settings, ShieldCheck, X } from 'lucide-react';
import { HeroLakeCity } from '@/components/pixel';
import { Badge, ButtonLink, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Rich, Select, cx, type Tone } from '@/components/ui';
import { useAi, useResolveAlert, useWeeklyDigest } from '@/lib/queries';
import type { AiAlert, AiEvent } from '@/lib/queries';
import { formatVnd, formatPct } from '@shared/format';

const ALERT_ACTIONS: Record<string, { label: string; to: string }> = {
  goal_delay: { label: 'Xem mục tiêu', to: '/muc-tieu' },
  volatile_share: { label: 'Xem danh mục', to: '/danh-muc' },
  emergency_low: { label: 'Xem kế hoạch', to: '/ke-hoach' },
  spending_over: { label: 'Xem thu chi', to: '/thu-chi' },
  savings_declining: { label: 'Xem tổng quan', to: '/' },
};

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}

export default function AiMonitorPage() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const { data, error, refetch, isPending } = useAi(range);
  const digestQuery = useWeeklyDigest();

  if (isPending || digestQuery.isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (digestQuery.error) return <ErrorState error={digestQuery.error} onRetry={() => digestQuery.refetch()} />;

  const digest = digestQuery.data;

  return (
    <div className="space-y-4">
      <PageHero
        title="AI không chỉ trả lời câu hỏi."
        highlight={<Rich text="AI đang theo dõi, phân tích và {em:nhắc bạn đúng lúc}." />}
        subtitle={<Rich text="Mọi gợi ý đều dựa trên dữ liệu tài chính của bạn, mục tiêu bạn đặt ra\nvà các tình huống có thể xảy ra." />}
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <WeeklyDigestCard digest={digest} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <AlertsCard alerts={data.alerts} />
        <SuggestionCard alerts={data.alerts} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr]">
        <TimelineCard events={data.events} range={range} onRange={setRange} />
        <div className="space-y-4">
          <HowItWorksCard />
          <WillNotDoCard />
        </div>
      </div>
    </div>
  );
}

function WeeklyDigestCard({ digest }: { digest: any }) {
  if (!digest) return null;
  return (
    <Card>
      <CardTitle icon={FileText} tone="blue" title="Tuần này của bạn" action={<Badge tone="blue">{digest.weekLabel}</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
        <div>
          <p className="text-sm text-ink-soft">Tổng thu</p>
          <p className="font-bold text-success-600 text-lg">{formatVnd(digest.moneyIn)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-soft">Tổng chi</p>
          <p className="font-bold text-danger-600 text-lg">{formatVnd(digest.moneyOut)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-soft">Tiết kiệm</p>
          <p className="font-bold text-accent-600 text-lg">{formatVnd(digest.saved)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-soft">Giờ giá trị</p>
          <p className="font-bold text-ink text-lg">{digest.valueHours}h</p>
        </div>
      </div>
      {digest.goalProgress && (
        <div className="py-3 border-t border-b border-[#E8EEF4]">
          <p className="text-sm text-ink-soft mb-1">Mục tiêu: {digest.goalProgress.title}</p>
          <div className="w-full bg-[#E8EEF4] rounded-full h-2">
            <div className="bg-success-500 h-2 rounded-full" style={{ width: `${digest.goalProgress.pct * 100}%` }}></div>
          </div>
          <p className="text-xs text-right mt-1 font-semibold text-ink">{formatPct(digest.goalProgress.pct)}</p>
        </div>
      )}
      <div className="mt-4 flex flex-col md:flex-row items-center gap-4 justify-between bg-sky-50 p-4 rounded-xl">
        <p className="text-sm font-semibold text-ink flex-1">{digest.oneNotice}</p>
        <ButtonLink to={digest.actionTo} variant="accent">{digest.oneAction}</ButtonLink>
      </div>
    </Card>
  );
}

/* ───────── Timeline Card ───────── */

function timeLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const time = `${h}:${m}`;

  if (eventDate.getTime() === today.getTime()) {
    return `Hôm nay ${time}`;
  }
  if (eventDate.getTime() === yesterday.getTime()) {
    return `Hôm qua ${time}`;
  }

  const weekDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return `${weekDays[date.getDay()]} ${time}`;
}

const EVENT_ICON = { alert: PieChart, simulation: Activity, reminder: Bell, analysis: FileText };
const EVENT_TONE: Record<AiEvent['type'], 'red' | 'violet' | 'orange' | 'green'> = { alert: 'red', simulation: 'violet', reminder: 'orange', analysis: 'green' };

function TimelineCard({ events, range, onRange }: { events: AiEvent[]; range: 'week' | 'month'; onRange: (r: 'week' | 'month') => void }) {
  return (
    <Card>
      <CardTitle
        icon={BarChart3}
        title="AI đã làm gì tuần này?"
        action={<Select label="Khoảng thời gian" value={range} onChange={onRange} options={[{ value: 'week', label: 'Tuần này' }, { value: 'month', label: 'Tháng này' }]} />}
      />
      {events.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-8">Chưa có hoạt động nào trong khoảng thời gian này.</p>
      ) : (
        <ul className="space-y-4 relative">
          {events.map((event, i) => {
            const Icon = EVENT_ICON[event.type];
            const tone = EVENT_TONE[event.type];
            return (
              <li key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-ink-soft w-[92px] shrink-0 whitespace-nowrap text-right">{timeLabel(event.createdAt)}</span>
                  <span className={cx('h-4 w-4 rounded-full shrink-0', tone === 'red' ? 'bg-danger-500' : tone === 'violet' ? 'bg-violet-500' : tone === 'orange' ? 'bg-warning-500' : 'bg-success-500')} aria-hidden />
                  {i < events.length - 1 && <div className="absolute left-[31px] top-[60px] h-[32px] w-px bg-[#E8EEF4]" aria-hidden />}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-start gap-2">
                    <IconTile icon={Icon} tone={tone} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-ink">{event.title}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{event.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ───────── How It Works Card ───────── */

const HOW_IT_WORKS: Array<{ icon: typeof Database; tone: Tone; num: string; title: string; body: string }> = [
  { icon: Database, tone: 'green', num: '1', title: 'Theo dõi danh mục và mục tiêu', body: 'Liên tục cập nhật dữ liệu tài chính của bạn.' },
  { icon: Search, tone: 'violet', num: '2', title: 'Phát hiện thay đổi đáng chú ý', body: 'Nhận ra rủi ro và cơ hội từ biến động thị trường và hành vi của bạn.' },
  { icon: BarChart3, tone: 'blue', num: '3', title: 'Chạy mô phỏng các khả năng', body: 'Đánh giá tác động đến mục tiêu với nhiều kịch bản khác nhau.' },
  { icon: Lightbulb, tone: 'orange', num: '4', title: 'Đưa cảnh báo và gợi ý rõ ràng', body: 'Thông báo đúng lúc với hướng hành động cụ thể, dễ hiểu.' },
] as const;

function HowItWorksCard() {
  return (
    <Card>
      <CardTitle icon={Settings} tone="blue" title="AI hoạt động như thế nào?" />
      <div className="space-y-3">
        {HOW_IT_WORKS.map((item, i) => (
          <div key={item.num} className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-2">
              <div className={cx('h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white', item.tone === 'green' ? 'bg-success-500' : item.tone === 'violet' ? 'bg-violet-500' : item.tone === 'blue' ? 'bg-accent-600' : 'bg-warning-500')}>
                {item.num}
              </div>
              {i < HOW_IT_WORKS.length - 1 && <div className="h-6 w-px bg-[#E8EEF4]" aria-hidden />}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-soft mt-0.5">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ───────── Will Not Do Card ───────── */

const WILL_NOT: Array<{ icon: typeof Activity; tone: Tone; title: string; body: string }> = [
  { icon: Activity, tone: 'red', title: 'Không tự ý mua bán thay bạn', body: 'Bạn luôn là người ra quyết định cuối cùng.' },
  { icon: ShieldCheck, tone: 'blue', title: 'Không lấy dữ liệu riêng tư để quảng cáo', body: 'Dữ liệu của bạn chỉ dùng để phân tích và hỗ trợ bạn đạt mục tiêu tài chính.' },
  { icon: Search, tone: 'violet', title: 'Không đưa lời khuyên chung chung thiếu căn cứ', body: 'Mọi gợi ý đều dựa trên dữ liệu thực tế của bạn, có phân tích rõ ràng.' },
] as const;

function WillNotDoCard() {
  return (
    <Card>
      <CardTitle icon={ShieldCheck} tone="green" title="AI sẽ không làm gì?" />
      <ul className="space-y-3">
        {WILL_NOT.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5">
            <IconTile icon={item.icon} tone={item.tone} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-soft mt-0.5">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── Alerts Card ───────── */

const ALERT_TONE: Record<AiAlert['severity'], { bg: string; border: string; icon: typeof PieChart; pill: string; pillTone: Tone }> = {
  danger: { bg: 'bg-[#FFF5F4]', border: 'border-[#F9DAD6]', icon: BarChart3, pill: 'Nguy cơ cao', pillTone: 'red' },
  warning: { bg: 'bg-[#FFFBF0]', border: 'border-[#FCDFD0]', icon: BarChart3, pill: 'Cần chú ý', pillTone: 'orange' },
  action: { bg: 'bg-[#F1FAF5]', border: 'border-[#D7EFE2]', icon: ShieldCheck, pill: 'Cần hành động', pillTone: 'green' },
};

function AlertsCard({ alerts }: { alerts: AiAlert[] }) {
  const resolveAlert = useResolveAlert();
  
  const openAlerts = alerts.filter(a => a.status === 'open');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const renderAlert = (alert: AiAlert) => {
    const config = ALERT_TONE[alert.severity];
    const baseRule = alert.ruleKey.split(':')[0];
    const action = ALERT_ACTIONS[baseRule] || { label: 'Xem chi tiết', to: '/ai' };
    
    return (
      <div key={alert.id} className={cx('rounded-xl p-4 border flex flex-col', config.bg, config.border)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconTile icon={config.icon} tone={config.pillTone} size="sm" />
            <Badge tone={config.pillTone}>{config.pill}</Badge>
          </div>
          {alert.status === 'open' && (
            <button
              type="button"
              onClick={() => resolveAlert.mutate(alert.id)}
              className="text-ink-soft hover:text-ink"
              aria-label="Đánh dấu đã xử lý"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink">{alert.title}</p>
        <p className="mt-1 text-xs text-ink-soft flex-1">{alert.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-ink-soft">{relativeDate(alert.createdAt)}</span>
          {alert.status === 'open' && (
            <ButtonLink to={action.to} variant="white" className="!px-3 !py-1.5 !text-xs">
              {action.label}
            </ButtonLink>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">Cảnh báo đang mở {openAlerts.length > 0 && <Badge tone="red" className="ml-2">{openAlerts.length}</Badge>}</h2>
      </div>

      {openAlerts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-success-500" aria-hidden />
          <p className="text-sm text-ink-soft">Không có cảnh báo nào đang mở.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {openAlerts.map(renderAlert)}
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <>
          <div className="mb-4 mt-6">
            <h2 className="text-md font-semibold text-ink-soft">Đã xử lý</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 opacity-60">
            {resolvedAlerts.map(renderAlert)}
          </div>
        </>
      )}
    </Card>
  );
}

/* ───────── Suggestion Card ───────── */

function SuggestionCard({ alerts }: { alerts: AiAlert[] }) {
  const openAlerts = alerts.filter(a => a.status === 'open');
  const firstAlert = openAlerts[0];

  if (!firstAlert) {
    return (
      <Card tone="sky">
        <CardTitle icon={Lightbulb} tone="orange" title="Gợi ý hành động hôm nay" />
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Lightbulb className="h-8 w-8 text-warning-500" aria-hidden />
          <p className="text-sm text-ink-soft">Hôm nay chưa có việc gì cần làm. Hãy thử một kịch bản mô phỏng!</p>
          <ButtonLink to="/mo-phong" variant="accent" arrow className="mt-2">
            Xem mô phỏng
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const titleMap: Record<string, string> = {
    volatile_share: 'Xem xét điều chỉnh danh mục đầu tư',
    emergency_low: 'Bổ sung quỹ dự phòng',
  };

  const title = titleMap[firstAlert.ruleKey] || 'Giữ tiến độ mục tiêu';

  return (
    <Card tone="sky">
      <CardTitle icon={Lightbulb} tone="orange" title="Gợi ý hành động hôm nay" />
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{firstAlert.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to={firstAlert.ruleKey === 'volatile_share' ? '/danh-muc' : '/muc-tieu'} variant="accent" arrow>
          Xem lý do
        </ButtonLink>
        <ButtonLink to="/ke-hoach" variant="white">
          Điều chỉnh kế hoạch
        </ButtonLink>
      </div>
    </Card>
  );
}
