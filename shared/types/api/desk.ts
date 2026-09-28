// "Bàn đầu tư": nhóm phân tích → tranh luận → người tổng hợp (theo mã, dùng chung) → quản lý rủi ro (theo người).
// Không bao giờ khuyên mua mã nào; chỉ nói về tài sản người dùng đang giữ.

export type DeskAnalystKey = 'technical' | 'news' | 'fundamentals' | 'macro';
export type DeskTone = 'good' | 'bad' | 'neutral';

/** Một dữ kiện do code tính (số đã định dạng sẵn), kèm chiều tác động với người đang giữ. */
export interface DeskFact { text: string; tone: DeskTone }

export interface DeskAnalystReport {
  key: DeskAnalystKey;
  label: string;
  /** -2..2, do code đếm / chấm. */
  score: number;
  facts: DeskFact[];
  note: string;
  /** false = thiếu dữ liệu, bỏ qua. */
  available: boolean;
}

export interface DeskDebateRound { round: number; optimist: string[]; cautious: string[] }
export interface DeskDebate { rounds: DeskDebateRound[] }

export type DeskTrend = 'tang' | 'giam' | 'di_ngang';
export type DeskRiskLevel = 'thap' | 'vua' | 'cao';

export interface DeskVerdict {
  trend: DeskTrend;
  risk: DeskRiskLevel;
  /** 0..1, do code tính từ mức đồng thuận của nhóm phân tích và độ đủ dữ liệu. */
  confidence: number;
  reasons: string[];
}

export interface DeskOutcome {
  after5?: { changePct: number; correct: boolean };
  after20?: { changePct: number; correct: boolean };
}

export interface DeskReport {
  symbol: string;
  day: string;
  analysts: DeskAnalystReport[];
  debate: DeskDebate;
  verdict: DeskVerdict;
  priceAt: number | null;
  model: string;
  createdAt: string;
  lesson: string | null;
  outcome: DeskOutcome | null;
}

export type DeskStance = 'binh_tinh' | 'can_nhac_giam' | 'theo_doi';

/** Việc chờ người dùng duyệt — tầng agent tạo pending action từ payload này (bàn không tự tạo). */
export type DeskSuggestedAction =
  | { type: 'reminder.create'; title: string; payload: { title: string; time: string; dates: string[]; category: 'finance' } }
  | { type: 'alert_rule.create'; title: string; payload: { symbol: string; label: string; direction: 'down' | 'up'; thresholdPct: number } };

export interface DeskRisk {
  stance: DeskStance;
  /** Số tiền tài sản có thể giảm trong kịch bản xấu (âm), VND. */
  impactVnd: number;
  holdingVnd: number;
  /** Tỷ trọng trên tổng tài sản, 0..1. */
  weight: number;
  monthsSafeBefore: number;
  monthsSafeAfter: number;
  goalsAffected: string[];
  sameSectorAsJob: boolean;
  text: string;
  suggestedActions: DeskSuggestedAction[];
}

/** Dòng tương thích agent_steps để ActivityLog hiện lại. */
export interface DeskStepLine { agent: 'desk'; kind: 'plan' | 'note' | 'propose'; title: string; detail: string | null; status: 'done' | 'skipped' }

export interface DeskView {
  symbol: string;
  report: DeskReport | null;
  risk: DeskRisk | null;
  steps: DeskStepLine[];
  /** Báo cáo không phải của hôm nay. */
  stale: boolean;
  /** 'running' khi bàn đang chạy nền cho hôm nay. */
  status: 'ready' | 'running' | 'empty';
}
