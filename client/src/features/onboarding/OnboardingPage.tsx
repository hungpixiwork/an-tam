import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, Coins, GraduationCap, House, NotebookPen, Palmtree, PieChart, ShieldCheck, Sprout, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { OnboardingResult } from '@shared/types/api';
import type { AssetCategory, GoalKind } from '@shared/types/domain';
import { addMonths, currentMonth } from '@shared/engine/month';
import { formatVnd } from '@shared/format';
import { useAuth } from '@/app/auth';
import { Badge, Button, Card, FormAlert, FormField, IconTile, MoneyInput, ScoreRing, Segmented, Select, cx, type Tone } from '@/components/ui';
import { useOnboarding, type GoalInput, type OnboardingInput } from '@/lib/queries';

const M = 1_000_000;

type Persona = 'starting' | 'building' | 'investing';

/* ───────── Dữ liệu các bước ───────── */

const ASSET_ROWS: { category: AssetCategory; name: string; hint: string; icon: LucideIcon; tone: Tone }[] = [
  { category: 'cash', name: 'Tiền mặt & tiết kiệm', hint: 'Tài khoản thanh toán, sổ tiết kiệm', icon: Wallet, tone: 'blue' },
  { category: 'fund', name: 'Quỹ mở / ETF', hint: 'Chứng chỉ quỹ, ETF', icon: Coins, tone: 'green' },
  { category: 'stock', name: 'Cổ phiếu', hint: 'Cổ phiếu tự mua', icon: Target, tone: 'orange' },
  { category: 'bond', name: 'Trái phiếu', hint: 'Trái phiếu, quỹ trái phiếu', icon: ShieldCheck, tone: 'violet' },
  { category: 'other', name: 'Vàng & tài sản khác', hint: 'Vàng, ngoại tệ...', icon: Coins, tone: 'gray' },
];

interface GoalTemplate { kind: GoalKind; title: string; icon: LucideIcon; tone: Tone; target: number; years: number; monthly: number }

const GOAL_TEMPLATES: GoalTemplate[] = [
  { kind: 'home', title: 'Mua nhà', icon: House, tone: 'blue', target: 2000 * M, years: 5, monthly: 10 * M },
  { kind: 'emergency', title: 'Quỹ dự phòng', icon: ShieldCheck, tone: 'green', target: 0, years: 1, monthly: 2 * M },
  { kind: 'education', title: 'Quỹ học cho con', icon: GraduationCap, tone: 'violet', target: 500 * M, years: 10, monthly: 3 * M },
  { kind: 'retirement', title: 'Nghỉ hưu an tâm', icon: Palmtree, tone: 'orange', target: 5000 * M, years: 20, monthly: 5 * M },
];

type GoalDraft = { targetAmount: number; currentAmount: number; years: number; monthlyContribution: number };

export default function OnboardingPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [emergencyMonths, setEmergencyMonths] = useState('6');
  const [assets, setAssets] = useState<Record<AssetCategory, number>>({ cash: 0, fund: 0, stock: 0, bond: 0, other: 0 });
  const [goals, setGoals] = useState<Partial<Record<GoalKind, GoalDraft>>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const { submit } = useOnboarding();

  const assetTotal = Object.values(assets).reduce((s, v) => s + v, 0);

  function toggleGoal(t: GoalTemplate) {
    setGoals((g) => {
      if (g[t.kind]) {
        const rest = { ...g };
        delete rest[t.kind];
        return rest;
      }
      // Quỹ dự phòng: mặc định đủ số tháng chi tiêu đã chọn, đã có = tiền mặt vừa nhập
      const draft: GoalDraft =
        t.kind === 'emergency'
          ? { targetAmount: expense * Number(emergencyMonths) || 100 * M, currentAmount: assets.cash, years: t.years, monthlyContribution: t.monthly }
          : { targetAmount: t.target, currentAmount: 0, years: t.years, monthlyContribution: t.monthly };
      return { ...g, [t.kind]: draft };
    });
  }

  function buildInput(skipCurrent: boolean): OnboardingInput {
    const skip = { ...skipped, [step]: skipCurrent };
    const today = currentMonth();
    return {
      profile: skip[0] || (!income && !expense) ? undefined : { monthlyIncome: income, monthlyExpense: expense, emergencyTargetMonths: Number(emergencyMonths) },
      holdings: skip[1] ? [] : ASSET_ROWS.filter((r) => assets[r.category] > 0).map((r) => ({ name: r.name, category: r.category, value: assets[r.category] })),
      goals: skip[2]
        ? []
        : GOAL_TEMPLATES.filter((t) => goals[t.kind] && goals[t.kind]!.targetAmount > 0).map((t): GoalInput => {
            const d = goals[t.kind]!;
            return {
              kind: t.kind,
              title: t.title,
              targetAmount: d.targetAmount,
              currentAmount: d.currentAmount,
              targetMonth: addMonths(today, d.years * 12),
              monthlyContribution: d.monthlyContribution,
              priority: t.kind === 'home' || t.kind === 'emergency' ? 1 : 2,
            };
          }),
    };
  }

  const STEPS = persona === 'starting' 
    ? ['Thu chi tháng', 'Mục tiêu'] 
    : ['Thu chi tháng', 'Tài sản', 'Mục tiêu'];

  function next(skipCurrent = false) {
    setSkipped((s) => ({ ...s, [step]: skipCurrent }));
    if (step === 0 && persona === 'starting') {
      setStep(2);
    } else if (step < 2) {
      setStep(step + 1);
    } else {
      submit.mutate(buildInput(skipCurrent));
    }
  }

  if (submit.data) return <ResultStep result={submit.data} />;

  if (persona === null) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">Cho An Tâm AI biết tình hình của bạn</h1>
          <p className="mt-1 text-sm text-ink-soft">Chỉ cần số ước lượng, bạn có thể sửa bất cứ lúc nào. Bước nào chưa muốn nhập thì cứ bỏ qua.</p>
        </div>
        <Card>
          <PersonaStep onSelect={(p) => {
            setPersona(p);
            if (p === 'starting') {
              const t = GOAL_TEMPLATES.find((x) => x.kind === 'emergency')!;
              setGoals({
                emergency: { targetAmount: 100 * M, currentAmount: 0, years: t.years, monthlyContribution: t.monthly }
              });
              setSkipped((s) => ({ ...s, 1: true }));
            }
          }} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">Cho An Tâm AI biết tình hình của bạn</h1>
        <p className="mt-1 text-sm text-ink-soft">Chỉ cần số ước lượng, bạn có thể sửa bất cứ lúc nào. Bước nào chưa muốn nhập thì cứ bỏ qua.</p>
      </div>

      <ol className={cx('grid gap-2', STEPS.length === 2 ? 'grid-cols-2' : 'grid-cols-3')} aria-label="Các bước">
        {STEPS.map((label, i) => {
          const logicalStep = label === 'Mục tiêu' ? 2 : (label === 'Tài sản' ? 1 : 0);
          return (
            <li key={label} aria-current={logicalStep === step ? 'step' : undefined}>
              <div className={cx('h-1.5 rounded-full', logicalStep <= step ? 'bg-primary-500' : 'bg-line')} />
              <p className={cx('mt-1.5 text-xs font-semibold', logicalStep === step ? 'text-ink' : 'text-ink-mute')}>
                {i + 1}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      <Card>
        {step === 0 && (
          <div className="space-y-5">
            <StepTitle icon={Wallet} title="Mỗi tháng bạn thu và chi khoảng bao nhiêu?" body="AI dùng hai con số này để tính khả năng để dành. Sau này khi bạn ghi Sổ thu chi, AI sẽ tự chuyển sang số thực tế." />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Thu nhập hằng tháng">{(id) => <MoneyInput id={id} value={income} onChange={setIncome} chips={[10 * M, 20 * M, 30 * M, 50 * M]} autoFocus />}</FormField>
              <FormField label="Chi tiêu hằng tháng">{(id) => <MoneyInput id={id} value={expense} onChange={setExpense} chips={[5 * M, 10 * M, 15 * M, 25 * M]} />}</FormField>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Quỹ dự phòng bạn muốn có đủ cho</p>
              <Segmented
                label="Số tháng chi tiêu dự phòng"
                value={emergencyMonths}
                onChange={setEmergencyMonths}
                options={['3', '6', '12'].map((v) => ({ value: v, label: `${v} tháng chi tiêu` }))}
                className="max-w-md"
              />
            </div>
            {income > 0 && expense > 0 && (
              <p className={cx('rounded-xl p-3 text-sm', income > expense ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
                {income > expense ? `Bạn có thể để dành khoảng ${formatVnd(income - expense)} mỗi tháng.` : 'Chi tiêu đang lớn hơn thu nhập — AI sẽ ưu tiên gợi ý cân đối dòng tiền.'}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <StepTitle icon={Coins} title="Bạn đang có những tài sản nào?" body="Nhập tổng giá trị theo từng loại. Để trống loại nào không có. Chi tiết từng khoản có thể thêm sau ở màn Danh mục." />
            <ul className="divide-y divide-line">
              {ASSET_ROWS.map((r) => (
                <li key={r.category} className="grid items-center gap-3 py-3 sm:grid-cols-[1fr_260px]">
                  <div className="flex items-center gap-3">
                    <IconTile icon={r.icon} tone={r.tone} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-mute">{r.hint}</p>
                    </div>
                  </div>
                  <MoneyInput label={r.name} value={assets[r.category]} onChange={(v) => setAssets((a) => ({ ...a, [r.category]: v }))} />
                </li>
              ))}
            </ul>
            <p className="text-right text-sm text-ink-soft">
              Tổng tài sản: <span className="font-bold text-ink">{formatVnd(assetTotal)}</span>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <StepTitle icon={Target} title="Bạn đang để dành cho điều gì?" body="Chọn một vài mục tiêu, AI sẽ ước tính khả năng đạt đúng hạn và cảnh báo sớm khi có rủi ro." />
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_TEMPLATES.map((t) => {
                const d = goals[t.kind];
                return (
                  <div key={t.kind} className={cx('rounded-2xl border p-4 transition-colors', d ? 'border-accent-500 bg-accent-50/40' : 'border-line')}>
                    <button type="button" onClick={() => toggleGoal(t)} aria-pressed={!!d} className="flex w-full items-center gap-3 text-left">
                      <IconTile icon={t.icon} tone={t.tone} size="sm" />
                      <span className="flex-1 font-semibold text-ink">{t.title}</span>
                      <span className={cx('flex h-6 w-6 items-center justify-center rounded-full border', d ? 'border-accent-600 bg-accent-600 text-white' : 'border-line')}>
                        {d && <Check className="h-4 w-4" aria-hidden />}
                      </span>
                    </button>
                    {d && (
                      <div className="mt-3 space-y-3">
                        <FormField label="Cần bao nhiêu">
                          {(id) => <MoneyInput id={id} value={d.targetAmount} onChange={(v) => setGoals((g) => ({ ...g, [t.kind]: { ...d, targetAmount: v } }))} />}
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="Đã có">
                            {(id) => <MoneyInput id={id} value={d.currentAmount} showHint={false} onChange={(v) => setGoals((g) => ({ ...g, [t.kind]: { ...d, currentAmount: v } }))} />}
                          </FormField>
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-ink">Trong vòng</p>
                            <Select
                              label={`Thời hạn ${t.title}`}
                              value={d.years}
                              onChange={(v) => setGoals((g) => ({ ...g, [t.kind]: { ...d, years: v } }))}
                              options={[1, 2, 3, 5, 7, 10, 15, 20, 25].map((y) => ({ value: y, label: `${y} năm` }))}
                              className="h-11 w-full text-[15px]"
                            />
                          </div>
                        </div>
                        <FormField label="Mỗi tháng để dành">
                          {(id) => <MoneyInput id={id} value={d.monthlyContribution} onChange={(v) => setGoals((g) => ({ ...g, [t.kind]: { ...d, monthlyContribution: v } }))} />}
                        </FormField>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {submit.error && (
          <div className="mt-4">
            <FormAlert error={submit.error} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {step > 0 && (
            <Button variant="white" onClick={() => setStep(step === 2 && persona === 'starting' ? 0 : step - 1)} disabled={submit.isPending}>
              Quay lại
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={() => next(true)} disabled={submit.isPending}>
            Bỏ qua bước này
          </Button>
          <Button onClick={() => next(false)} arrow disabled={submit.isPending}>
            {step < 2 ? 'Tiếp tục' : submit.isPending ? 'AI đang phân tích…' : 'Hoàn tất'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StepTitle({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconTile icon={icon} tone="teal" />
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
    </div>
  );
}

function PersonaStep({ onSelect }: { onSelect: (p: Persona) => void }) {
  const options: { key: Persona; icon: LucideIcon; title: string; sub: string; tone: Tone }[] = [
    { key: 'starting', icon: Sprout, title: 'Mới bắt đầu', sub: 'Chưa có tiết kiệm nhiều, muốn kiểm soát chi tiêu', tone: 'green' },
    { key: 'building', icon: Target, title: 'Đã có tiết kiệm', sub: 'Có sổ tiết kiệm hoặc quỹ, muốn đặt mục tiêu', tone: 'blue' },
    { key: 'investing', icon: PieChart, title: 'Có danh mục đầu tư', sub: 'Có cổ phiếu, quỹ, trái phiếu, muốn tối ưu', tone: 'violet' },
  ];
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-ink-soft">Chọn phương án phù hợp với bạn nhất</p>
      <div className="grid gap-3">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            className="flex items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition-colors hover:border-accent-200 hover:bg-accent-50"
          >
            <IconTile icon={o.icon} tone={o.tone} size="md" />
            <div>
              <p className="font-semibold text-ink">{o.title}</p>
              <p className="text-xs text-ink-soft">{o.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Kết quả ───────── */

const SEVERITY_TONE = { danger: 'red', warning: 'orange', action: 'blue' } as const;
const LEVEL_TONE = { stable: 'green', watch: 'orange', action: 'red' } as const;

function ResultStep({ result }: { result: OnboardingResult }) {
  const { finish } = useOnboarding();
  const { me } = useAuth();
  const navigate = useNavigate();
  // navigate trước rồi mới cập nhật `me`: hai cập nhật được gộp trong 1 lần render,
  // tránh OnboardingLayout thấy onboarded=true ở /bat-dau và tự đẩy về "/"
  const go = (to: string) => {
    navigate(to, { replace: true });
    finish(result.me);
  };
  // Chưa có thu chi lẫn tài sản thì điểm an tâm chưa có ý nghĩa
  const empty = !result.setup.profile && !result.setup.holdings;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        {empty ? (
          <IconTile icon={Bot} tone="teal" size="lg" />
        ) : (
          <ScoreRing score={result.peace.score} size={132} stroke={15} label={`Mức an tâm ${result.peace.score}/100`} />
        )}
        <div>
          <p className="text-sm font-semibold text-ink-soft">{empty ? 'Tài khoản của bạn đã sẵn sàng' : `Mức an tâm tài chính của ${me?.salutation ?? 'bạn'}`}</p>
          {!empty && (
            <Badge tone={LEVEL_TONE[result.peace.level]} className="mt-2 h-8 px-4 text-sm">
              {result.peace.label}
            </Badge>
          )}
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {empty
              ? 'Chưa có đủ dữ liệu để đánh giá. Bạn có thể nhập dần ở Sổ thu chi, Danh mục và Mục tiêu.'
              : 'An Tâm AI đã đọc dữ liệu bạn vừa nhập và sẽ chạy lại phân tích mỗi ngày hoặc mỗi khi bạn cập nhật.'}
          </p>
        </div>
      </div>

      {result.alerts.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <Bot className="h-4 w-4 text-accent-600" aria-hidden /> AI nhận thấy
          </p>
          <ul className="space-y-2">
            {result.alerts.map((a) => (
              <li key={a.title} className="flex items-center gap-2.5 rounded-xl border border-line p-3 text-sm text-ink">
                <Badge tone={SEVERITY_TONE[a.severity]} className="h-6 px-2 text-xs">
                  {a.severity === 'danger' ? 'Nguy cơ' : a.severity === 'warning' ? 'Chú ý' : 'Nên làm'}
                </Badge>
                {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="white" icon={NotebookPen} onClick={() => go('/thu-chi')}>
          Ghi khoản thu chi đầu tiên
        </Button>
        <Button arrow onClick={() => go('/')}>
          Vào Tổng quan
        </Button>
      </div>
    </Card>
  );
}
