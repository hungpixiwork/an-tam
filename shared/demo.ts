// Bộ dữ liệu tài chính demo ("Nguyễn Văn Minh") — nạp cho mỗi tài khoản mới để dashboard có dữ liệu ngay.
// Thu nhập 80,5tr − chi tiêu 22,5tr − để dành cho mục tiêu 40tr = dòng tiền tự do 18tr.
// Snapshot được sinh tương đối so với tháng hiện tại nên luôn "mới".

import type { FinancialProfile, Goal, Holding, Snapshot } from './types/domain';
import { addMonths } from './engine/month';

const M = 1_000_000;

export const DEMO_PROFILE: FinancialProfile = {
  monthlyIncome: 80.5 * M,
  monthlyExpense: 22.5 * M,
  emergencyTargetMonths: 10,
  riskSelfScore: 8,
};

type DemoHolding = Omit<Holding, 'id'>;

/** Tổng 1,24 tỷ: Tiền mặt 174 · Quỹ mở 343 · Cổ phiếu 397 · Trái phiếu 223 · Khác 103 (triệu). */
export const DEMO_HOLDINGS: DemoHolding[] = [
  { name: 'Quỹ cổ phiếu tăng trưởng', category: 'stock', value: 320 * M, role: 'Tăng trưởng', volatility: 'high', riskGroup: 'Nhóm tăng trưởng công nghệ', isMain: true },
  { name: 'Quỹ trái phiếu', category: 'bond', value: 223 * M, role: 'Ổn định', volatility: 'low', riskGroup: 'Lãi suất và trái phiếu', isMain: true },
  { name: 'ETF thị trường rộng', category: 'fund', value: 180 * M, role: 'Tăng trưởng', volatility: 'mid', riskGroup: 'Nhóm cổ phiếu trong nước', isMain: true },
  { name: 'Tiền gửi ngắn hạn', category: 'cash', value: 174 * M, role: 'An toàn', volatility: 'low', riskGroup: 'Tiền mặt và tài sản an toàn', isMain: true },
  { name: 'Quỹ mở cân bằng', category: 'fund', value: 163 * M, role: 'Cân bằng', volatility: 'mid', riskGroup: 'Nhóm tăng trưởng công nghệ', isMain: false },
  { name: 'Cổ phiếu công nghệ', category: 'stock', value: 77 * M, role: 'Tăng trưởng', volatility: 'high', riskGroup: 'Nhóm tăng trưởng công nghệ', isMain: false },
  { name: 'Vàng tích trữ', category: 'other', value: 103 * M, role: 'Dự phòng', volatility: 'mid', riskGroup: 'Tiền mặt và tài sản an toàn', isMain: false },
];

type DemoGoal = Omit<Goal, 'id' | 'targetMonth'> & { targetYearOffset: number; targetCalendarMonth: number };

/** Mục tiêu có hạn tính theo năm tương đối (+4 năm, tháng 8...) để demo không bị "quá hạn" theo thời gian. */
export const DEMO_GOALS: DemoGoal[] = [
  { kind: 'home', title: 'Mua nhà', targetAmount: 2000 * M, currentAmount: 1120 * M, monthlyContribution: 11 * M, priority: 1, targetYearOffset: 4, targetCalendarMonth: 8 },
  { kind: 'education', title: 'Quỹ học cho con', targetAmount: 500 * M, currentAmount: 220 * M, monthlyContribution: 5 * M, priority: 2, targetYearOffset: 4, targetCalendarMonth: 8 },
  { kind: 'retirement', title: 'Nghỉ hưu an tâm', targetAmount: 6000 * M, currentAmount: 1400 * M, monthlyContribution: 21.5 * M, priority: 2, targetYearOffset: 9, targetCalendarMonth: 8 },
  { kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: 250 * M, currentAmount: 180 * M, monthlyContribution: 2.5 * M, priority: 1, targetYearOffset: 2, targetCalendarMonth: 8 },
];

export const demoGoalMonth = (today: string, g: DemoGoal): string =>
  `${Number(today.slice(0, 4)) + g.targetYearOffset}-${String(g.targetCalendarMonth).padStart(2, '0')}`;

/** 11 tháng trước tháng hiện tại (tháng hiện tại tính sống từ holdings). Đơn vị: triệu. */
const HISTORY = {
  total:     [620, 680, 740, 800, 860, 920, 990, 1080, 1170, 1195, 1215],
  emergency: [110, 115, 120, 126, 132, 138, 145, 153, 161, 168, 174],
  invested:  [400, 440, 480, 520, 560, 600, 630, 660, 685, 705, 722],
  cashflow:  [12, 13, 12, 14, 15, 14, 16, 15, 17, 16, 15],
};

export function demoSnapshots(today: string): Snapshot[] {
  const n = HISTORY.total.length;
  return HISTORY.total.map((_, i) => ({
    month: addMonths(today, i - n),
    total: HISTORY.total[i] * M,
    emergency: HISTORY.emergency[i] * M,
    invested: HISTORY.invested[i] * M,
    cashflow: HISTORY.cashflow[i] * M,
  }));
}

/** Nhật ký "AI theo dõi" mẫu (số giờ trước thời điểm đăng ký). */
export const DEMO_EVENTS: { type: 'alert' | 'simulation' | 'reminder' | 'analysis'; title: string; body: string; hoursAgo: number }[] = [
  { type: 'simulation', title: 'Chạy lại mô phỏng sau khi thị trường giảm', body: 'AI đã cập nhật các kịch bản và đánh giá lại khả năng đạt mục tiêu của bạn.', hoursAgo: 14 },
  { type: 'reminder', title: 'Nhắc bạn bổ sung quỹ dự phòng', body: 'Số dư quỹ dự phòng hiện thấp hơn mức bạn đã đặt cho 10 tháng chi tiêu.', hoursAgo: 60 },
  { type: 'analysis', title: 'Tóm tắt ảnh hưởng của lãi suất mới đến kế hoạch hiện tại', body: 'AI đã phân tích tác động của việc tăng lãi suất 0,5% đến khoản vay mua nhà và đưa ra các phương án điều chỉnh.', hoursAgo: 84 },
];

/** Câu trả lời thói quen mẫu (khớp seed habit_scenarios). */
export const DEMO_HABIT_ANSWERS: Record<string, string> = { hs1: 'hold', hs2: 'reduce', hs3: 'cash' };
