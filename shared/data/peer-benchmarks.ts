// Tỷ lệ tiết kiệm tham chiếu theo nhóm tuổi — dùng để so sánh tương đối ("cao hơn / thấp hơn người cùng độ tuổi").
// Đây là số ước lượng làm mốc tham chiếu (người đi làm có thu nhập ở đô thị Việt Nam), không phải thống kê chính thức;
// cập nhật khi có nguồn công bố chính thức. Tỷ lệ = (thu − chi) / thu.

export interface PeerBenchmark {
  /** Tuổi nhỏ nhất của nhóm (bao gồm). */
  minAge: number;
  /** Nhãn nhóm tuổi, ví dụ "25–34". */
  label: string;
  savingsRate: number;
}

export const PEER_SAVINGS_BENCHMARKS: PeerBenchmark[] = [
  { minAge: 0, label: '<25', savingsRate: 0.12 },
  { minAge: 25, label: '25–34', savingsRate: 0.2 },
  { minAge: 35, label: '35–44', savingsRate: 0.18 },
  { minAge: 45, label: '45–54', savingsRate: 0.17 },
  { minAge: 55, label: '55+', savingsRate: 0.15 },
];

/** Nhóm tham chiếu theo tuổi; null khi chưa biết tuổi. */
export function peerBenchmark(age: number | null | undefined): PeerBenchmark | null {
  if (age == null || !Number.isFinite(age) || age <= 0) return null;
  return [...PEER_SAVINGS_BENCHMARKS].reverse().find((b) => age >= b.minAge) ?? null;
}

/**
 * Tỷ trọng chi tiêu phổ biến theo danh mục (người đi làm ở đô thị, 25–44 tuổi) — mốc tham chiếu ước lượng,
 * dùng để AI nhận ra danh mục đang chi "nhiều hơn mức trung bình". Tổng ≈ 1.
 */
export const PEER_SPENDING_SHARES: Record<string, number> = {
  food: 0.28,
  housing: 0.22,
  transport: 0.12,
  children: 0.1,
  shopping: 0.09,
  entertainment: 0.06,
  health: 0.07,
  other_expense: 0.06,
};
