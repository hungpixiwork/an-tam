// Phân tích cho các màn: Mục tiêu (02), Kết quả mô phỏng (04), Thói quen (05), Danh mục (06).

import type { Goal, SimulationParams, UserState } from '../types/domain';
import { formatDuration, formatPct, formatVnd } from '../format';
import { goalInsights, goalProbability, nearestMajorGoal, type GoalInsight } from './goals';
import { monthsBetween } from './month';
import { applyPlan, proposePlan } from './plan';
import { peaceScore } from './peace';
import { allocation, portfolioStats, totalValue } from './portfolio';
import { applyShock, simulate, type SimulationOutcome } from './simulate';

/* ─────────────────────────── 02 · Mục tiêu ─────────────────────────── */

export interface GoalCard {
  id: string;
  kind: Goal['kind'];
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  monthlyContribution: number;
  priority: number;
  progress: number;
  probability: number;
  expectedMonth: string | null;
  delayMonths: number;
  requiredMonthly: number;
}

export interface GoalsSummary {
  goals: GoalCard[];
  milestones: { year: number; title: string; detail: string; kind: Goal['kind'] }[];
  tip: { text: string; goalTitle: string | null; delayMonths: number; extraMonthly: number; probabilityAfter: number } | null;
}

const toCard = (i: GoalInsight): GoalCard => ({ ...i.goal, progress: i.progress, probability: i.probability, expectedMonth: i.expectedMonth, delayMonths: i.delayMonths, requiredMonthly: i.requiredMonthly });

export function goalsSummary(state: UserState): GoalsSummary {
  const insights = goalInsights(state);
  const home = insights.find((i) => i.goal.kind === 'home');
  const milestones: GoalsSummary['milestones'] = [];
  if (home) {
    // Mốc giữa chặng: năm dự kiến đạt 50% mục tiêu mua nhà
    const half = monthsBetween(state.today, home.goal.targetMonth) / 2;
    milestones.push({ year: Number(state.today.slice(0, 4)) + Math.max(1, Math.round(half / 12)), title: 'Đạt 50%', detail: `mục tiêu ${home.goal.title.toLowerCase()}`, kind: 'custom' });
  }
  for (const i of insights) {
    milestones.push({
      year: Number(i.goal.targetMonth.slice(0, 4)),
      title: i.goal.kind === 'emergency' ? 'Hoàn thành' : i.goal.title,
      detail: i.goal.kind === 'emergency' ? `${i.goal.title.toLowerCase()} ${formatVnd(i.goal.targetAmount)}` : formatVnd(i.goal.targetAmount),
      kind: i.goal.kind,
    });
  }
  milestones.sort((a, b) => a.year - b.year);

  // Gợi ý: mục tiêu lớn gần nhất bị chậm bao lâu nếu thị trường xấu, và kế hoạch giúp được bao nhiêu
  const major = nearestMajorGoal(state);
  let tip: GoalsSummary['tip'] = null;
  if (major) {
    const sim = simulate(state, { marketDropPct: -20, inflationPct: 6, incomePauseMonths: 0, interestRateDeltaPct: 0, surpriseCost: 0 });
    const delay = Math.max(0, sim.goals.find((g) => g.goalId === major.id)?.delayMonths ?? 0);
    const plan = proposePlan(state);
    const extra = plan.steps.find((s) => s.key === 'contribution')?.amount ?? 0;
    const planned = applyPlan(state, plan.steps);
    const after = goalProbability(planned.goals.find((g) => g.id === major.id)!, planned);
    tip = {
      text: `Mục tiêu ${major.title.toLowerCase()} đang có nguy cơ chậm {danger:${delay} tháng} nếu bạn giữ danh mục hiện tại. Chỉ cần tăng tiền dự phòng thêm {danger:${formatVnd(extra)}/tháng} và giảm bớt phần đầu tư biến động cao, khả năng đạt đúng hạn có thể tăng lên {success:${formatPct(after)}}.`,
      goalTitle: major.title,
      delayMonths: delay,
      extraMonthly: extra,
      probabilityAfter: after,
    };
  }
  return { goals: insights.map(toCard), milestones, tip };
}

/* ─────────────────────── 04 · Kết quả mô phỏng ─────────────────────── */

export interface SimulationReport extends SimulationOutcome {
  label: string;
  headline: { title: string; emphasis: string; body: string };
  home: { goalTitle: string; beforeLabel: string; afterLabel: string; delayMonths: number } | null;
  worry: string;
  suggestions: { key: string; title: string; body: string; action: string; to: string }[];
  improvement: { goalProbBefore: number; goalProbAfter: number; peaceBefore: number; peaceAfter: number };
}

export function describeParams(p: SimulationParams): string {
  const parts: string[] = [];
  if (p.marketDropPct < 0) parts.push(`Thị trường giảm ${Math.abs(p.marketDropPct)}%`);
  if (p.marketDropPct > 0) parts.push(`Thị trường tăng ${p.marketDropPct}%`);
  if (p.incomePauseMonths > 0) parts.push(`thu nhập gián đoạn ${p.incomePauseMonths} tháng`);
  if (p.inflationPct > 4) parts.push(`lạm phát ${p.inflationPct}%`);
  if (p.surpriseCost > 0) parts.push(`chi phí bất ngờ ${formatVnd(p.surpriseCost)}`);
  if (p.goalShiftMonths) parts.push(`mua nhà ${p.goalShiftMonths < 0 ? 'sớm' : 'muộn'} ${Math.abs(p.goalShiftMonths)} tháng`);
  return parts.length ? parts.join(' + ') : 'Giữ nguyên hiện tại';
}

export function simulationReport(state: UserState, params: SimulationParams): SimulationReport {
  const out = simulate(state, params);
  const major = nearestMajorGoal(state);
  const impact = major ? out.goals.find((g) => g.goalId === major.id) : undefined;
  const delay = Math.max(0, impact?.delayMonths ?? 0);
  const survives = out.after.netWorth > out.before.netWorth * 0.6;

  const headline = {
    title: survives ? 'Danh mục của bạn vẫn tồn tại,' : 'Danh mục của bạn chịu áp lực lớn,',
    emphasis: major ? (delay > 0 ? `nhưng mục tiêu ${major.title.toLowerCase()} có thể bị chậm.` : `và mục tiêu ${major.title.toLowerCase()} vẫn đúng hướng.`) : 'hãy đặt mục tiêu để xem tác động.',
    body: survives
      ? 'Ngay cả trong kịch bản khó khăn, bạn vẫn giữ được nền tảng tài chính.\nTuy nhiên, một số mục tiêu quan trọng có thể bị ảnh hưởng nếu không có điều chỉnh kịp thời.'
      : 'Kịch bản này làm tài sản giảm mạnh. Hãy ưu tiên quỹ dự phòng\nvà giảm bớt phần đầu tư biến động cao trước khi rủi ro xảy ra.',
  };

  const home =
    major && impact
      ? {
          goalTitle: major.title,
          beforeLabel: impact.expectedBefore ? `đạt sau ${formatDuration(monthsBetween(state.today, impact.expectedBefore))}` : 'chưa xác định',
          afterLabel: delay > 0 ? `chậm ${delay} tháng` : 'đúng hạn',
          delayMonths: delay,
        }
      : null;

  const worry =
    out.after.emergencyMonths < 6
      ? `Rủi ro lớn nhất {em:không phải là} bạn mất hết tiền, {em:mà là mục tiêu ${major?.title.toLowerCase() ?? 'chính'} bị lệch khỏi kế hoạch} do tiền dự phòng chưa đủ mạnh.`
      : `Quỹ dự phòng vẫn đủ ${out.after.emergencyMonths.toString().replace('.', ',')} tháng. Điều cần theo dõi là {em:tỷ trọng tài sản biến động} khi thị trường chưa ổn định.`;

  // Áp kế hoạch an toàn lên trạng thái sau cú sốc để đo mức cải thiện
  const shocked = applyShock(state, params);
  const plan = proposePlan(shocked);
  const improved = applyPlan(shocked, plan.steps);
  const goalAfterShock = major ? shocked.goals.find((g) => g.id === major.id) : undefined;
  const goalImproved = major ? improved.goals.find((g) => g.id === major.id) : undefined;

  return {
    ...out,
    label: describeParams(params),
    headline,
    home,
    worry,
    suggestions: plan.steps.map((s) => ({
      key: s.key,
      title: s.title,
      body:
        s.key === 'emergency'
          ? 'Giúp bạn có đủ tháng chi tiêu dự phòng, giảm áp lực khi thu nhập bị gián đoạn.'
          : s.key === 'rebalance'
            ? 'Hạn chế rủi ro khi thị trường tiếp tục biến động, ưu tiên giữ vững nền tảng tài chính.'
            : 'Dồn một phần tiền mới tích lũy cho mục tiêu quan trọng nhất để giữ tiến độ.',
      action: s.key === 'emergency' ? 'Xem hướng dẫn' : s.key === 'rebalance' ? 'Xem gợi ý chi tiết' : 'Xem cách thực hiện',
      to: s.key === 'rebalance' ? '/danh-muc' : '/ke-hoach',
    })),
    improvement: {
      goalProbBefore: goalAfterShock ? goalProbability(goalAfterShock, shocked) : 0,
      goalProbAfter: goalImproved ? goalProbability(goalImproved, improved) : 0,
      peaceBefore: out.after.peaceScore,
      peaceAfter: peaceScore(improved).score,
    },
  };
}

/* ─────────────────────────── 05 · Thói quen ─────────────────────────── */

export interface HabitOption { key: string; label: string; risk: number }
export interface HabitScenario { id: string; prompt: string; context: string; icon: string; options: HabitOption[] }

export interface HabitsProfile {
  selfScore: number;       // 0..10 người dùng tự đánh giá
  actualScore: number | null; // 0..10 suy ra từ lựa chọn
  traits: { label: string; value: string; tone: 'success' | 'violet' | 'accent' }[];
  insights: { title: string; body: string; tone: 'success' | 'violet' | 'warning' }[];
  answered: number;
  total: number;
}

export function habitsProfile(selfScore: number, scenarios: HabitScenario[], answers: Record<string, string>): HabitsProfile {
  const picked = scenarios.map((s) => s.options.find((o) => o.key === answers[s.id])).filter((o): o is HabitOption => !!o);
  const actual = picked.length ? Math.round(picked.reduce((s, o) => s + o.risk, 0) / picked.length) : null;
  const first = picked[0];
  const calm = first ? (first.risk >= 6 ? 'Khá tốt' : first.risk >= 4 ? 'Trung bình' : 'Dễ lo lắng') : 'Chưa rõ';
  const gap = actual === null ? 0 : selfScore - actual;

  const insights: HabitsProfile['insights'] = [];
  if (first) insights.push(first.risk >= 6
    ? { title: 'Bạn khá bình tĩnh ở mức giảm nhẹ', body: 'Bạn không vội thay đổi khi thị trường chỉ giảm một chút.', tone: 'success' }
    : { title: 'Bạn phản ứng sớm với biến động nhỏ', body: 'Hãy đặt trước giới hạn rủi ro để tránh quyết định theo cảm xúc.', tone: 'warning' });
  if (picked.length >= 2 && picked[1].risk < picked[0].risk) insights.push({ title: 'Khi áp lực tăng, bạn bắt đầu ưu tiên an toàn', body: 'Ở mức giảm sâu hơn, bạn có xu hướng giảm rủi ro để bảo vệ thành quả.', tone: 'violet' });
  if (gap >= 2) insights.push({ title: 'Danh mục hiện tại nên bớt biến động để phù hợp với mục tiêu thật của bạn', body: 'Cách bạn phản ứng cho thấy bạn phù hợp với mức rủi ro vừa phải, ổn định hơn.', tone: 'warning' });

  return {
    selfScore,
    actualScore: actual,
    traits: [
      { label: 'Mức bình tĩnh khi thị trường giảm', value: calm, tone: 'success' },
      { label: 'Khi thấy lỗ, bạn thường', value: first && first.risk >= 6 ? 'Chờ thêm dữ liệu trước khi quyết định' : 'Muốn hành động ngay', tone: 'violet' },
      { label: 'Bạn ưu tiên', value: actual !== null && actual <= 6 ? 'Giữ an toàn cho mục tiêu hơn là chạy theo lợi nhuận cao' : 'Tăng trưởng dài hạn, chấp nhận biến động', tone: 'accent' },
    ],
    insights,
    answered: picked.length,
    total: scenarios.length,
  };
}

/* ─────────────────────────── 06 · Danh mục ─────────────────────────── */

export interface PortfolioAnalysis {
  total: number;
  slices: ReturnType<typeof allocation>;
  riskGroups: { name: string; pct: number; value: number; color: string }[];
  concentration: string | null;
  holdings: { id: string; name: string; value: number; role: string; volatility: 'low' | 'mid' | 'high'; category: string }[];
  insights: { key: string; title: string; body: string; tone: 'success' | 'danger' | 'accent' }[];
  suggestions: { key: string; title: string; body: string; tone: 'success' | 'danger' | 'accent'; to: string }[];
}

const GROUP_COLORS = ['#F07171', '#F5A524', '#4C8DF0', '#3DBE8B', '#8B5CF6', '#94A3B8'];

export function portfolioAnalysis(state: UserState): PortfolioAnalysis {
  const total = totalValue(state.holdings) || 1;
  const groups = new Map<string, number>();
  for (const h of state.holdings) groups.set(h.riskGroup, (groups.get(h.riskGroup) ?? 0) + h.value);
  const riskGroups = [...groups]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, pct: value / total, color: GROUP_COLORS[i % GROUP_COLORS.length] }));
  const top = riskGroups[0];
  const stats = portfolioStats(state.holdings);
  const growth = state.holdings.filter((h) => h.category === 'stock' || h.category === 'fund').reduce((s, h) => s + h.value, 0) / total;
  const safe = state.holdings.filter((h) => h.category === 'cash' || h.category === 'bond').reduce((s, h) => s + h.value, 0) / total;
  const major = nearestMajorGoal(state);

  return {
    total,
    slices: allocation(state.holdings),
    riskGroups,
    concentration: top && top.pct > 0.3 ? `Một phần rủi ro của bạn đang tập trung khá nhiều vào ${top.name.toLowerCase()}.` : null,
    holdings: state.holdings.filter((h) => h.isMain).map((h) => ({ id: h.id, name: h.name, value: h.value, role: h.role, volatility: h.volatility, category: h.category })),
    insights: [
      { key: 'growth', title: `Danh mục của bạn đang thiên về ${growth >= 0.5 ? 'tăng trưởng' : 'an toàn'}`, body: `Khoảng ${formatPct(growth)} tài sản của bạn đang ở cổ phiếu và quỹ tăng trưởng, giúp có tiềm năng sinh lời cao trong dài hạn.`, tone: 'success' },
      { key: 'shock', title: 'Nếu thị trường biến động mạnh, phần cổ phiếu sẽ ảnh hưởng nhiều nhất', body: top ? `${top.name} chiếm ${formatPct(top.pct)} danh mục nên có thể biến động mạnh khi thị trường điều chỉnh.` : 'Danh mục chưa có dữ liệu.', tone: 'danger' },
      { key: 'safe', title: `Bạn đang ${safe < 0.4 ? 'thiếu' : 'có đủ'} phần tài sản an toàn cho mục tiêu ${major?.title.toLowerCase() ?? 'gần nhất'}`, body: `Tài sản an toàn (tiền mặt, trái phiếu) hiện chiếm ${formatPct(safe)}, ${safe < 0.4 ? 'có thể tăng thêm để giảm rủi ro và ổn định hơn' : 'đủ làm lớp đệm khi thị trường xấu'}.`, tone: 'accent' },
    ],
    suggestions: [
      { key: 'safe', title: 'Tăng tài sản an toàn thêm 10%', body: `Bổ sung tiền gửi hoặc quỹ trái phiếu để giảm rủi ro và tạo nền tảng ổn định cho mục tiêu ${major?.title.toLowerCase() ?? 'chính'}.`, tone: 'success', to: '/ke-hoach' },
      { key: 'volatile', title: 'Giảm bớt phần biến động cao', body: `Tài sản biến động đang chiếm ${formatPct(stats.riskyShare)}. Cân nhắc hạ tỷ trọng nhóm tăng trưởng để tránh rủi ro quá tập trung.`, tone: 'danger', to: '/mo-phong' },
      { key: 'goals', title: 'Ưu tiên cân bằng theo mục tiêu hơn là theo cảm xúc', body: 'Phân bổ tài sản dựa trên mục tiêu cuộc sống (mua nhà, nghỉ hưu...) thay vì theo xu hướng ngắn hạn.', tone: 'accent', to: '/muc-tieu' },
    ],
  };
}
