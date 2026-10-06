// Sổ đăng ký điểm chuẩn tài chính & nguồn gốc dữ liệu (Sheet 11_Benchmark_Registry).
// Tuân thủ triệt để Rule R8, G8, G9: Mọi con số so sánh phải có nguồn gốc rõ ràng, cấm bịa đặt số liệu cùng lứa tuổi.

export type BenchmarkType =
  | 'external_population'         // Số liệu thống kê dân số quan sát được (cần mẫu khảo sát hợp lệ)
  | 'external_rule_of_thumb'      // Quy tắc kinh nghiệm giáo dục tài chính phổ quát (vd 50/30/20)
  | 'external_market_observation' // Dữ liệu thị trường quan sát tại một thời điểm (vd tỷ trọng ngành quỹ ETF)
  | 'internal_model_threshold'    // Mốc quy định của mô hình An Tâm (vd mốc tỷ trọng rủi ro theo thời hạn)
  | 'internal_estimate';          // Giả định ước tính nội bộ (vd tỷ suất sinh lời kỳ vọng)

export type BenchmarkStatus = 'current' | 'stale' | 'unsupported';

export interface BenchmarkItem {
  id: string;
  metric: string;
  label: string;
  value: number | string | null;
  unit: string;
  benchmarkType: BenchmarkType;
  population?: string;
  source: string;
  publishedAt?: string;
  observedAt?: string;
  accessedAt: string;
  status: BenchmarkStatus;
  userFacingNote: string;
  forbiddenInterpretation?: string;
}

export const BENCHMARK_REGISTRY: Record<string, BenchmarkItem> = {
  'BM-PEACE-SAVE': {
    id: 'BM-PEACE-SAVE',
    metric: 'savings_rate_cap',
    label: 'Mốc tối đa điểm dòng tiền tiết kiệm',
    value: 0.5,
    unit: 'tỷ lệ',
    benchmarkType: 'internal_model_threshold',
    source: 'Mô hình Điểm An Tâm (peace.ts)',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mốc 50% thu nhập để dành là ngưỡng đạt điểm dòng tiền tối đa của mô hình.',
  },
  'BM-EMERG-6': {
    id: 'BM-EMERG-6',
    metric: 'emergency_target_default',
    label: 'Số tháng an toàn mục tiêu mặc định',
    value: 6,
    unit: 'tháng',
    benchmarkType: 'internal_model_threshold',
    source: 'Quy chuẩn sản phẩm An Tâm',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mục tiêu 6 tháng chi phí thiết yếu giúp bạn đứng vững trước các biến cố gián đoạn thu nhập.',
  },
  'BM-EMERG-3-6': {
    id: 'BM-EMERG-3-6',
    metric: 'emergency_guidance_range',
    label: 'Khuyến nghị quỹ khẩn cấp phổ quát',
    value: '3–6',
    unit: 'tháng',
    benchmarkType: 'external_rule_of_thumb',
    source: 'FINRA Investor Insights (2024)',
    publishedAt: '2024-04-30',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Khuyến nghị 3–6 tháng chi phí sinh hoạt từ các tổ chức giáo dục tài chính quốc tế.',
    forbiddenInterpretation: 'Không được coi đây là ngưỡng bắt buộc tuyệt đối cho mọi gia đình.',
  },
  'BM-RISK-24': {
    id: 'BM-RISK-24',
    metric: 'risky_share_under_24m',
    label: 'Tỷ trọng tài sản biến động khi mục tiêu ≤ 24 tháng',
    value: 0.25,
    unit: 'tỷ lệ',
    benchmarkType: 'internal_model_threshold',
    source: 'Mô hình phân bổ An Tâm',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mục tiêu ngắn hạn dưới 2 năm nên giữ phần lớn ở tài sản an toàn, tối đa 25% tài sản biến động.',
  },
  'BM-RISK-60': {
    id: 'BM-RISK-60',
    metric: 'risky_share_under_60m',
    label: 'Tỷ trọng tài sản biến động khi mục tiêu ≤ 60 tháng',
    value: 0.40,
    unit: 'tỷ lệ',
    benchmarkType: 'internal_model_threshold',
    source: 'Mô hình phân bổ An Tâm',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mục tiêu trung hạn 2–5 năm khuyến nghị tỷ trọng tài sản biến động tối đa 40%.',
  },
  'BM-RISK-120': {
    id: 'BM-RISK-120',
    metric: 'risky_share_under_120m',
    label: 'Tỷ trọng tài sản biến động khi mục tiêu ≤ 120 tháng',
    value: 0.55,
    unit: 'tỷ lệ',
    benchmarkType: 'internal_model_threshold',
    source: 'Mô hình phân bổ An Tâm',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mục tiêu dài hạn 5–10 năm khuyến nghị tỷ trọng tài sản biến động tối đa 55%.',
  },
  'BM-RISK-LONG': {
    id: 'BM-RISK-LONG',
    metric: 'risky_share_over_120m',
    label: 'Tỷ trọng tài sản biến động khi mục tiêu > 120 tháng',
    value: 0.70,
    unit: 'tỷ lệ',
    benchmarkType: 'internal_model_threshold',
    source: 'Mô hình phân bổ An Tâm',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Mục tiêu rất dài hạn (> 10 năm như nghỉ hưu) có thể nâng tỷ trọng tài sản biến động lên tối đa 70%.',
  },
  'BM-503020': {
    id: 'BM-503020',
    metric: 'budget_rule_503020',
    label: 'Quy tắc phân bổ ngân sách 50/30/20',
    value: 0.50,
    unit: 'tỷ lệ nhu cầu thiết yếu',
    benchmarkType: 'external_rule_of_thumb',
    source: 'CFPB & Nguyên lý Quản lý Tài chính Cá nhân',
    publishedAt: '2022-06-02',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Khung tham chiếu 50% chi tiêu thiết yếu, 30% chi tiêu linh hoạt, 20% để dành và trả nợ.',
    forbiddenInterpretation: 'Tuyệt đối không gọi 50/30/20 là số liệu trung bình của bạn bè cùng lứa.',
  },
  'BM-ETF-TECH': {
    id: 'BM-ETF-TECH',
    metric: 'etf_tech_weight',
    label: 'Tỷ trọng ngành Công nghệ trong Quỹ ETF toàn cầu (SWDA)',
    value: 0.3022,
    unit: 'tỷ lệ',
    benchmarkType: 'external_market_observation',
    source: 'iShares Core MSCI World UCITS ETF Factsheet',
    observedAt: '2026-09-09',
    accessedAt: '2026-10-01',
    status: 'current',
    userFacingNote: 'Tỷ trọng công nghệ quan sát thực tế tại ngày 09/09/2026 là 30,22%.',
  },
  'BM-SAME-AGE': {
    id: 'BM-SAME-AGE',
    metric: 'same_age_peer_percentile',
    label: 'So sánh vị thế với bạn bè cùng độ tuổi',
    value: null,
    unit: 'phần trăm thứ hạng',
    benchmarkType: 'external_population',
    source: 'Chưa có bộ dữ liệu mẫu dân số khảo sát chính thức được kiểm chứng tại Việt Nam',
    accessedAt: '2026-10-01',
    status: 'unsupported',
    userFacingNote: 'Ẩn hoàn toàn tính năng này để tránh đưa ra kết luận thiếu căn cứ khoa học.',
    forbiddenInterpretation: 'Nghiêm cấm tự tạo số ảo về thứ hạng tài chính so với bạn bè cùng lứa.',
  },
};

/** Lấy điểm chuẩn hợp lệ, trả về null nếu dữ liệu chưa được hỗ trợ hoặc không có căn cứ */
export function getBenchmark(id: string): BenchmarkItem | null {
  const item = BENCHMARK_REGISTRY[id];
  if (!item || item.status === 'unsupported') return null;
  return item;
}
