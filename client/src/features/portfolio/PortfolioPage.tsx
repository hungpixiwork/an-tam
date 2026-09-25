import { useState } from 'react';
import { AlertCircle, AlertTriangle, BarChart3, Bot, Coins, Database, Lightbulb, Pencil, PieChart, Plus, Shield, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PortfolioAnalysis } from '@shared/engine/analysis';
import { formatPct, formatVnd } from '@shared/format';
import { HeroLakeCity } from '@/components/pixel';
import { Badge, Button, Card, CardTitle, DonutChart, EmptyState, ErrorState, IconTile, PageHero, PageSkeleton, cx, type Tone } from '@/components/ui';
import { usePortfolio } from '@/lib/queries';
import { HoldingFormModal } from './HoldingFormModal';

type HoldingRow = PortfolioAnalysis['holdings'][number];

type SuggestionTone = 'success' | 'danger' | 'accent';

export default function PortfolioPage() {
  const { data, error, refetch, isPending } = usePortfolio();
  // undefined = đóng; null = thêm mới; HoldingRow = đang sửa
  const [editing, setEditing] = useState<HoldingRow | null | undefined>(undefined);
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const hero = (
    <PageHero
      title="Tiền của bạn đang phân bổ như thế nào?"
      subtitle="Không cần đọc biểu đồ nến phức tạp, bạn vẫn có thể hiểu tiền mình đang ở đâu."
      scene={(cls) => <HeroLakeCity className={cls} />}
    />
  );
  const modal = editing !== undefined && <HoldingFormModal key={editing?.id ?? 'new'} holding={editing} onClose={() => setEditing(undefined)} />;

  if (data.holdings.length === 0) {
    return (
      <div className="space-y-4">
        {hero}
        <EmptyState
          icon={PieChart}
          title="Danh mục của bạn đang trống"
          body="Thêm tiền tiết kiệm, quỹ, cổ phiếu hay vàng bạn đang có. AI sẽ chỉ ra rủi ro đang tập trung ở đâu và mức biến động có hợp với mục tiêu không."
          action={<Button icon={Plus} onClick={() => setEditing(null)}>Thêm tài sản đầu tiên</Button>}
        />
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hero}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <DonutCardSection allocation={data} />
        <RiskGroupsCard riskGroups={data.riskGroups} concentration={data.concentration} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <HoldingsTableCard holdings={data.holdings} onAdd={() => setEditing(null)} onEdit={setEditing} />
        <AiExplainCard insights={data.insights} />
      </div>

      <SuggestionsSection suggestions={data.suggestions} />
      {modal}
    </div>
  );
}

/* ───────── Danh mục hiện tại (Donut) ───────── */

function DonutCardSection({ allocation }: { allocation: PortfolioAnalysis }) {
  return (
    <Card>
      <CardTitle icon={PieChart} title="Danh mục hiện tại" />
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <DonutChart
          data={allocation.slices.map((s) => ({
            key: s.category,
            value: s.value,
            color: s.color,
            label: s.label,
          }))}
          size={200}
          thickness={38}
        >
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

/* ───────── Rủi ro tập trung ───────── */

function RiskGroupsCard({ riskGroups, concentration }: { riskGroups: PortfolioAnalysis['riskGroups']; concentration: string | null }) {
  return (
    <Card>
      <CardTitle icon={AlertTriangle} tone="red" title="Rủi ro đang tập trung ở đâu?" />
      <div className="space-y-3">
        {riskGroups.map((group) => (
          <div key={group.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{group.name}</span>
              <span className="text-ink-soft">{formatPct(group.pct)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${group.pct * 100}%`, background: group.color }} />
            </div>
          </div>
        ))}
        {concentration && (
          <div className="mt-4 flex gap-3 rounded-lg bg-danger-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" aria-hidden />
            <p className="text-sm text-danger-700">{concentration}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ───────── Bảng các khoản chính ───────── */

const CATEGORY_ICON: Record<string, typeof TrendingUp> = {
  stock: TrendingUp,
  bond: Shield,
  fund: PieChart,
  cash: Database,
  other: Coins,
};

const ROLE_TONE: Record<string, 'green' | 'blue' | 'violet' | 'gray'> = {
  'Tăng trưởng': 'green',
  'Ổn định': 'blue',
  'An toàn': 'blue',
  'Cân bằng': 'violet',
};

const VOLATILITY_TONE: Record<'high' | 'mid' | 'low', 'red' | 'orange' | 'green'> = {
  high: 'red',
  mid: 'orange',
  low: 'green',
};

const VOLATILITY_LABEL: Record<'high' | 'mid' | 'low', string> = {
  high: 'Cao',
  mid: 'Trung bình',
  low: 'Thấp',
};

function HoldingsTableCard({ holdings, onAdd, onEdit }: { holdings: HoldingRow[]; onAdd: () => void; onEdit: (h: HoldingRow) => void }) {
  return (
    <Card>
      <CardTitle icon={BarChart3} title="Các khoản của bạn" action={<Button variant="soft" size="sm" icon={Plus} onClick={onAdd}>Thêm</Button>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wider text-ink-soft">
              <th className="pb-2 pl-0 pr-3">Khoản đầu tư</th>
              <th className="pb-2 px-3 text-right">Giá trị</th>
              <th className="pb-2 px-3">Vai trò</th>
              <th className="pb-2 px-3">Mức biến động</th>
              <th className="pb-2 pl-3"><span className="sr-only">Sửa</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {holdings.map((h) => {
              const Icon = CATEGORY_ICON[h.category] || Coins;
              const roleTone = ROLE_TONE[h.role] || 'gray';
              return (
                <tr key={h.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 pl-0 pr-3">
                    <div className="flex items-center gap-2.5">
                      <IconTile icon={Icon} tone="orange" size="sm" />
                      <span className="font-medium text-ink">{h.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-ink">{formatVnd(h.value)}</td>
                  <td className="py-3 px-3">
                    <Badge tone={roleTone} className="text-xs">
                      {h.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <Badge tone={VOLATILITY_TONE[h.volatility]} icon={BarChart3} className="text-xs">
                      {VOLATILITY_LABEL[h.volatility]}
                    </Badge>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button type="button" onClick={() => onEdit(h)} className="rounded-lg p-2 text-ink-mute hover:bg-slate-100 hover:text-ink" aria-label={`Sửa ${h.name}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ───────── AI giải thích ───────── */

const INSIGHT_ICON: Record<SuggestionTone, typeof TrendingUp> = {
  success: TrendingUp,
  danger: PieChart,
  accent: Shield,
};

const INSIGHT_TONE_MAP: Record<SuggestionTone, Tone> = {
  success: 'green',
  danger: 'red',
  accent: 'blue',
};

function AiExplainCard({ insights }: { insights: PortfolioAnalysis['insights'] }) {
  return (
    <Card>
      <CardTitle icon={Bot} title="AI giải thích dễ hiểu" />
      <div className="space-y-3">
        {insights.map((insight) => {
          const Icon = INSIGHT_ICON[insight.tone as SuggestionTone];
          const iconTone = INSIGHT_TONE_MAP[insight.tone as SuggestionTone];
          return (
            <div key={insight.key} className="border border-line rounded-lg p-3">
              <div className="flex gap-3">
                <IconTile icon={Icon} tone={iconTone} size="sm" />
                <div className="min-w-0">
                  <p className="font-bold text-ink">{insight.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{insight.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────── Gợi ý điều chỉnh ───────── */

interface SuggestionColor {
  bgTone: 'mint' | 'rose' | 'sky';
  textColor: string;
  icon: typeof Shield;
}

const SUGGESTION_COLORS: Record<SuggestionTone, SuggestionColor> = {
  success: { bgTone: 'mint', textColor: '#1FA16B', icon: Shield },
  danger: { bgTone: 'rose', textColor: '#EF4444', icon: BarChart3 },
  accent: { bgTone: 'sky', textColor: '#3B82F6', icon: TrendingUp },
};

function SuggestionsSection({ suggestions }: { suggestions: PortfolioAnalysis['suggestions'] }) {
  return (
    <Card>
      <CardTitle
        icon={Lightbulb}
        title="Nên điều chỉnh gì?"
        subtitle="Dưới đây là một số gợi ý dựa trên danh mục hiện tại và mục tiêu của bạn."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {suggestions.map((sugg) => {
          const colorConfig = SUGGESTION_COLORS[sugg.tone as SuggestionTone];
          const { bgTone, textColor, icon: Icon } = colorConfig;
          const BG_CLASS: Record<'mint' | 'rose' | 'sky', string> = {
            mint: 'bg-[#F1FAF5]',
            rose: 'bg-[#FFF5F4]',
            sky: 'bg-[#F3F8FE]',
          };

          return (
            <Link
              key={sugg.key}
              to={sugg.to}
              className={cx(
                'group flex flex-col gap-4 rounded-lg p-4 transition-colors hover:opacity-80',
                BG_CLASS[bgTone],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-ink">{sugg.title}</p>
                  <p className="mt-2 text-sm text-ink-soft">{sugg.body}</p>
                </div>
                <div className="shrink-0 rounded-full p-2" style={{ background: sugg.tone === 'success' ? '#DCF5E9' : sugg.tone === 'danger' ? '#F9E6E3' : '#D7E9F8' }}>
                  <Icon className="h-5 w-5" style={{ color: textColor }} aria-hidden />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
