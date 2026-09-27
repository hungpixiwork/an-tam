// Đội ngũ agent và công cụ (MCP / tích hợp) mà agent dùng — metadata thuần, client + worker dùng chung.

import type { ActionIntegration } from '../types/api/agent';

export const AGENT_KEYS = ['planner', 'calendar', 'cashflow', 'skill', 'goal'] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

/** Engine mà từng agent gọi (hiển thị ở nhật ký, không phải LLM tự do). */
export const AGENT_ENGINES: Record<AgentKey, string> = {
  planner: 'intent + planner',
  calendar: 'scheduler',
  cashflow: 'budget',
  skill: 'humanCapital',
  goal: 'goals',
};

export const TOOL_KEYS = ['google_calendar', 'google_sheets', 'notion', 'gmail'] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

/** Công cụ bên ngoài ↔ nhà cung cấp trong bảng `integrations` + scope Google cần có. */
export const TOOL_PROVIDER: Record<ToolKey, { provider: 'google' | 'notion'; scope?: RegExp }> = {
  google_calendar: { provider: 'google', scope: /calendar/ },
  google_sheets: { provider: 'google', scope: /spreadsheets/ },
  gmail: { provider: 'google', scope: /gmail\.(send|compose)/ },
  notion: { provider: 'notion' },
};

export const TOOL_NAME: Record<ToolKey, string> = {
  google_calendar: 'Google Calendar',
  google_sheets: 'Google Sheets',
  notion: 'Notion',
  gmail: 'Gmail',
};

export const isTool = (i: ActionIntegration): i is ToolKey => i !== 'local';
