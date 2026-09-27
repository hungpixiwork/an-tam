import { BellRing, CalendarCheck, CalendarDays, Coins, FileSpreadsheet, FileText, GraduationCap, Mail, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { ExtTone } from '@/components/ui';
import type { AgentKeyName } from '@shared/types/api';

export const AGENT_META: Record<AgentKeyName, { icon: LucideIcon; tone: ExtTone; chip: string }> = {
  planner: { icon: CalendarDays, tone: 'blue', chip: 'bg-accent-50 text-accent-700' },
  calendar: { icon: CalendarCheck, tone: 'blue', chip: 'bg-accent-50 text-accent-700' },
  cashflow: { icon: Coins, tone: 'amber', chip: 'bg-amber-50 text-amber-700' },
  skill: { icon: GraduationCap, tone: 'violet', chip: 'bg-violet-50 text-violet-700' },
  goal: { icon: Target, tone: 'rose', chip: 'bg-rose-50 text-rose-600' },
};

export const isAgentKey = (k: string): k is AgentKeyName => k in AGENT_META;

export const ACTION_ICON: Record<string, { icon: LucideIcon; cls: string }> = {
  'calendar.create_events': { icon: CalendarDays, cls: 'text-accent-600' },
  'budget.set': { icon: Wallet, cls: 'text-success-600' },
  'sheets.update_budget': { icon: FileSpreadsheet, cls: 'text-success-600' },
  'goal.update_progress': { icon: Target, cls: 'text-rose-500' },
  'reminder.create': { icon: BellRing, cls: 'text-accent-600' },
  'gmail.send': { icon: Mail, cls: 'text-danger-500' },
  'notion.weekly_report': { icon: FileText, cls: 'text-accent-600' },
};

/** Giờ Việt Nam HH:MM từ ISO UTC. */
export const vnTime = (iso: string) => new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(11, 16);

/** "x phút trước" theo khóa i18n workspace.ago.*. */
export function ago(iso: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (min < 1) return t('workspace.ago.now');
  if (min < 60) return t('workspace.ago.min', { n: min });
  if (min < 60 * 24) return t('workspace.ago.hour', { n: Math.round(min / 60) });
  return t('workspace.ago.day', { n: Math.round(min / 1440) });
}
