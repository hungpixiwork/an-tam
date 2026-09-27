// Lựa chọn cuộc đời (B1) — phần tối thiểu cho màn Tổng quan: mức sẵn sàng về tài chính trước khi bắt đầu.
// Màn Lựa chọn cuộc đời mở rộng tiếp (điểm khả thi, so sánh phương án).

import type { UserState } from '../types/domain';
import { emergencyAmount, savingsCapacity } from './peace';

export interface LifeChoiceReadiness {
  /** Quỹ dự phòng tối thiểu nên có trước khi bắt đầu = số tháng an toàn mục tiêu × chi tiêu tháng. */
  requiredReserve: number;
  reserveMonths: number;
  have: number;
  gap: number;
  /** Số tháng cần chuẩn bị thêm; null = không tính được (chưa có khoản để dành mỗi tháng). */
  monthsNeeded: number | null;
  ready: boolean;
}

export function lifeChoiceReadiness(state: UserState): LifeChoiceReadiness {
  const reserveMonths = state.profile.emergencyTargetMonths || 6;
  const requiredReserve = Math.round(state.profile.monthlyExpense * reserveMonths);
  const have = emergencyAmount(state);
  const gap = Math.max(0, requiredReserve - have);
  const goal = state.goals.find((g) => g.kind === 'emergency');
  // Tốc độ lấp khoảng thiếu: số tiền đang góp vào quỹ dự phòng mỗi tháng, chưa có thì lấy phần để dành được
  const monthly = goal && goal.monthlyContribution > 0 ? goal.monthlyContribution : Math.max(0, savingsCapacity(state));
  const monthsNeeded = gap === 0 ? 0 : monthly > 0 ? Math.ceil(gap / monthly) : null;
  return { requiredReserve, reserveMonths, have, gap, monthsNeeded, ready: requiredReserve > 0 && gap === 0 };
}
