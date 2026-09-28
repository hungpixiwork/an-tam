// "Bàn đầu tư" — bước quản lý rủi ro THEO TỪNG NGƯỜI. Hàm thuần, tất định: kết luận chung của mã + tình hình của người
// (tỷ trọng, quỹ dự phòng, mục tiêu, trùng ngành với công việc) → giữ bình tĩnh / theo dõi / cân nhắc giảm tỷ trọng.
// Không bao giờ khuyên mua mã nào. Người quyết định là chính người dùng: chỉ trả về việc gợi ý chờ duyệt.

import type { Goal } from '../types/domain';
import type { DeskRisk, DeskStance, DeskSuggestedAction, DeskVerdict } from '../types/api/desk';
import { formatVnd } from '../format';
import { monthsBetween } from './month';

/** Mức giảm giả định trong kịch bản xấu theo mức rủi ro của kết luận. */
export const DESK_SHOCK: Record<DeskVerdict['risk'], number> = { thap: 0.05, vua: 0.1, cao: 0.2 };
/** Tỷ trọng coi là lớn / vừa trên tổng tài sản. */
export const DESK_BIG_WEIGHT = 0.2;
export const DESK_MID_WEIGHT = 0.05;
/** Mục tiêu đến hạn trong bao nhiêu tháng thì coi là dễ bị ảnh hưởng. */
const GOAL_NEAR_MONTHS = 36;

export interface DeskRiskInput {
  symbol: string;
  /** Tên dễ đọc của tài sản (ví dụ "Vàng SJC", "cổ phiếu FPT"). */
  name: string;
  verdict: Pick<DeskVerdict, 'trend' | 'risk'>;
  holdingVnd: number;
  totalAssetsVnd: number;
  /** Chi tiêu mỗi tháng — để đổi số tiền ra số tháng an toàn. */
  monthlyExpense: number;
  /** Tiền có thể dùng khi cần (tiền mặt + danh mục đầu tư) — xem monthsCovered. */
  liquidVnd: number;
  /** Tài sản này có nằm trong phần tiền dùng được khi cần không. */
  holdingIsLiquid: boolean;
  /** Quỹ dự phòng đủ sống bao nhiêu tháng (emergencyMonths). */
  emergencyMonths: number;
  goals: Goal[];
  /** Tài sản cùng ngành với công việc (concentration.ts). */
  sameSectorAsJob: boolean;
  /** Tháng hiện tại 'YYYY-MM' và ngày 'YYYY-MM-DD' (giờ Việt Nam) — truyền vào để hàm tất định. */
  month: string;
  day: string;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const dec = (x: number) => String(round1(x)).replace('.', ',');
const pct = (x: number) => `${Math.round(x * 100)}%`;

const isNegative = (v: DeskRiskInput['verdict']) => v.trend === 'giam' || v.risk === 'cao';

export function deskStance(input: Pick<DeskRiskInput, 'verdict' | 'sameSectorAsJob' | 'emergencyMonths'> & { weight: number }): DeskStance {
  const { verdict, weight, sameSectorAsJob, emergencyMonths } = input;
  if (weight <= 0) return 'binh_tinh';
  if (isNegative(verdict)) {
    if (weight >= DESK_BIG_WEIGHT) return 'can_nhac_giam';
    if (weight >= 0.1 && (sameSectorAsJob || emergencyMonths < 3)) return 'can_nhac_giam';
    if (weight >= DESK_MID_WEIGHT) return 'theo_doi';
    return 'binh_tinh';
  }
  if (verdict.risk === 'vua' && weight >= 0.3) return 'theo_doi';
  return 'binh_tinh';
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

export function deskRisk(input: DeskRiskInput): DeskRisk {
  const holding = Math.max(0, input.holdingVnd);
  const weight = input.totalAssetsVnd > 0 ? Math.min(1, holding / input.totalAssetsVnd) : 0;
  const impactVnd = -Math.round(holding * DESK_SHOCK[input.verdict.risk]);
  const exp = input.monthlyExpense;
  const monthsSafeBefore = exp > 0 ? round1(input.liquidVnd / exp) : 0;
  const liquidAfter = Math.max(0, input.liquidVnd + (input.holdingIsLiquid ? impactVnd : 0));
  const monthsSafeAfter = exp > 0 ? round1(liquidAfter / exp) : 0;
  const stance = deskStance({ verdict: input.verdict, weight, sameSectorAsJob: input.sameSectorAsJob, emergencyMonths: input.emergencyMonths });

  // Mục tiêu dài hạn đến hạn sớm, khoản giảm đáng kể so với số tiền mục tiêu
  const loss = -impactVnd;
  const goalsAffected =
    stance === 'binh_tinh' || loss <= 0
      ? []
      : input.goals
          .filter((g) => g.kind !== 'emergency' && g.targetAmount > g.currentAmount)
          .filter((g) => monthsBetween(input.month, g.targetMonth) <= GOAL_NEAR_MONTHS && loss >= 0.01 * g.targetAmount)
          .sort((a, b) => a.priority - b.priority)
          .map((g) => g.title);

  const lines: string[] = [];
  if (holding <= 0) {
    lines.push(`Bạn chưa giữ ${input.name}, nên biến động này không làm tài sản của bạn thay đổi.`);
  } else {
    lines.push(`${input.name} chiếm ${pct(weight)} tổng tài sản của bạn (${formatVnd(holding)}).`);
    lines.push(`Nếu giá giảm thêm ${pct(DESK_SHOCK[input.verdict.risk])}, tài sản giảm khoảng ${formatVnd(loss)}.`);
    if (exp > 0) {
      lines.push(
        input.holdingIsLiquid && monthsSafeAfter < monthsSafeBefore
          ? `Tiền dùng được khi cần vẫn đủ sống ${dec(monthsSafeAfter)} tháng (hiện ${dec(monthsSafeBefore)} tháng).`
          : `Tiền dùng được khi cần vẫn đủ sống ${dec(monthsSafeBefore)} tháng.`,
      );
    }
    if (input.sameSectorAsJob) lines.push('Tài sản này cùng ngành với công việc của bạn, nên khi ngành gặp khó thì cả thu nhập lẫn tài sản cùng chịu ảnh hưởng.');
    if (goalsAffected.length) lines.push(`Mục tiêu có thể chậm lại: ${goalsAffected.join(', ')}.`);
    lines.push(
      stance === 'can_nhac_giam'
        ? 'Bạn có thể cân nhắc giảm dần tỷ trọng để rủi ro không dồn vào một chỗ; quyết định là của bạn.'
        : stance === 'theo_doi'
          ? 'Chưa cần làm gì, chỉ nên theo dõi thêm vài phiên.'
          : 'Khoản này nhỏ so với tổng tài sản, bạn có thể giữ bình tĩnh.',
    );
  }

  const suggestedActions: DeskSuggestedAction[] = [];
  if (holding > 0 && stance === 'can_nhac_giam') {
    const title = `Xem lại tỷ trọng ${input.name}`;
    suggestedActions.push({ type: 'reminder.create', title, payload: { title, time: '20:00', dates: [nextDay(input.day)], category: 'finance' } });
  }
  if (holding > 0 && stance !== 'binh_tinh') {
    const thresholdPct = input.verdict.risk === 'cao' ? 5 : 3;
    suggestedActions.push({
      type: 'alert_rule.create',
      title: `Báo khi ${input.name} giảm từ ${thresholdPct}% trong ngày`,
      payload: { symbol: input.symbol, direction: 'down', thresholdPct },
    });
  }

  return {
    stance,
    impactVnd,
    holdingVnd: holding,
    weight: Math.round(weight * 1000) / 1000,
    monthsSafeBefore,
    monthsSafeAfter,
    goalsAffected,
    sameSectorAsJob: input.sameSectorAsJob,
    text: lines.join(' '),
    suggestedActions,
  };
}
