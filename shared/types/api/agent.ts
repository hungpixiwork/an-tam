// AI Workspace: agent_runs / agent_steps / agent_actions (khớp CHECK trong migrations/0008_agent_audit.sql).

export type AgentRunSource = 'user' | 'mcp' | 'automation';
export type AgentRunStatus = 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
export type AgentStepKind = 'plan' | 'tool' | 'propose' | 'note' | 'error';
export type AgentStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type AgentActionSource = 'agent' | 'mcp' | 'automation' | 'user';
export type AgentActionStatus = 'pending' | 'approved' | 'executing' | 'done' | 'rejected' | 'changes_requested' | 'failed' | 'expired';
export type ActionIntegration = 'local' | 'google_calendar' | 'google_sheets' | 'gmail' | 'notion';
export type ActionRisk = 'low' | 'mid' | 'high';

/** Hộp "trước / sau" + các dòng chi tiết hiển thị khi duyệt. */
export interface ActionPreview { before?: string | null; after?: string | null; lines: string[] }

export interface AgentActionView {
  id: string;
  runId: string | null;
  agent: string | null;
  type: string;
  title: string;
  integration: ActionIntegration;
  risk: ActionRisk;
  status: AgentActionStatus;
  preview: ActionPreview | null;
  /** Kết quả sau khi thực thi (vd. số sự kiện đã tạo). */
  result: Record<string, unknown> | null;
  /** Lý do thất bại, ví dụ "Cần kết nối Gmail". */
  error: string | null;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  executedAt: string | null;
}

export interface AgentStepView {
  id: string;
  idx: number;
  agent: string;
  kind: AgentStepKind;
  title: string;
  detail: string | null;
  status: AgentStepStatus;
  startedAt: string;
}

/** Sự kiện đề xuất trong kế hoạch tuần (payload của calendar.create_events). */
export interface PlannedEventView { title: string; note?: string; category: 'finance' | 'skill' | 'work' | 'rest' | 'personal'; startsAt: string; endsAt: string }

export interface AgentRunView {
  id: string;
  source: AgentRunSource;
  promptMasked: string;
  intents: string[];
  intentSource: 'rules' | 'llm';
  agents: string[];
  status: AgentRunStatus;
  /** Tuần kế hoạch (thứ Hai, YYYY-MM-DD). */
  weekStart: string;
  createdAt: string;
  steps: AgentStepView[];
  actions: AgentActionView[];
  plannedEvents: PlannedEventView[];
  /** Công cụ bên ngoài lượt này dùng / sẽ dùng. */
  tools: string[];
  /** Lượt AI đã dùng hôm nay / hạn mức theo gói (chỉ có trong phản hồi POST /runs). */
  aiQuota?: { used: number; limit: number };
  /** Câu trả lời ngắn cho người dùng (số do engine tính; có thể được AI diễn đạt lại, số giữ nguyên). */
  reply?: string;
}

export type AgentKeyName = 'planner' | 'calendar' | 'cashflow' | 'skill' | 'goal';

export interface AgentInfo {
  key: AgentKeyName;
  status: 'working' | 'active' | 'idle';
  lastActivity: { title: string; at: string } | null;
}

export interface AgentRunInput { prompt: string; weekStart?: string }
export interface ApproveBatchResult { results: { id: string; status: AgentActionStatus; error: string | null }[] }
