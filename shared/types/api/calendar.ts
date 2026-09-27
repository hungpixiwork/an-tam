// Lịch AI — sự kiện lịch (màn Tổng quan dùng "hôm nay", màn Lịch AI mở rộng theo tuần).

export type CalendarCategory = 'finance' | 'skill' | 'work' | 'rest' | 'personal';
export type CalendarSource = 'local' | 'google' | 'agent';

export interface CalendarEvent {
  id: string;
  title: string;
  note: string;
  category: CalendarCategory;
  /** Giờ Việt Nam 'YYYY-MM-DDTHH:MM'. */
  startsAt: string;
  endsAt: string;
  source: CalendarSource;
  done: boolean;
}

export interface CalendarEventInput {
  title: string;
  note?: string;
  category: CalendarCategory;
  startsAt: string;
  endsAt: string;
}

/* ───────── Màn Lịch AI (tuần) ───────── */

export type ProposalPriority = 'high' | 'goal' | 'normal';
export type ProposalStatus = 'pending' | 'done' | 'rejected' | 'failed' | 'expired';

export interface CalendarProposal {
  id: string;
  title: string;
  reason: string;
  priority: ProposalPriority;
  /** Quy tắc sinh ra đề xuất (bill_reminder, skill_block…) hoặc 'goal'. */
  rule: string;
  status: ProposalStatus;
  integration: 'local' | 'google_calendar';
  events: CalendarEventInput[];
  createdAt: string;
}

export type GoogleSyncStatus = 'connected' | 'disconnected' | 'error';

export interface CalendarSyncInfo {
  /** false = máy chủ chưa có GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / TOKEN_ENC_KEY. */
  configured: boolean;
  status: GoogleSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface CalendarWeek {
  /** Thứ Hai 'YYYY-MM-DD'. */
  weekStart: string;
  /** Chủ nhật 'YYYY-MM-DD'. */
  weekEnd: string;
  /** Hôm nay (giờ Việt Nam). */
  today: string;
  events: CalendarEvent[];
  proposals: CalendarProposal[];
  sync: CalendarSyncInfo;
}

export interface CalendarMonthDay { date: string; counts: Partial<Record<CalendarCategory, number>> }
export interface CalendarMonth { month: string; today: string; days: CalendarMonthDay[] }

export interface AutoScheduleResult { created: number; proposals: CalendarProposal[] }

export interface CalendarSyncResult { pulled: number; removed: number; pushed: number; syncedAt: string }

export type AutomationRuleKey = 'weekly_review' | 'bill_reminder' | 'skill_block' | 'freelance_followup';
export interface AutomationRule { key: AutomationRuleKey; enabled: boolean; requiresApproval: boolean; lastFiredAt: string | null }

/* ───────── Tích hợp ───────── */

export interface IntegrationInfo {
  provider: 'google' | 'notion' | 'sepay';
  configured: boolean;
  status: GoogleSyncStatus;
  scopes: string[];
  lastSyncedAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
}
