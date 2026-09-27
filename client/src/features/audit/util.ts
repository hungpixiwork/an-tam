// Tên tác nhân, icon, màu trạng thái + định dạng thời gian cho trang Nhật ký AI.

import { BarChart3, Bell, CalendarDays, FileText, GraduationCap, Landmark, PieChart, Settings, ShieldCheck, Target, type LucideIcon } from 'lucide-react';
import type { AuditStatus } from '@shared/types/api';
import type { ExtTone } from '@/components/ui';

export const AGENT_LOOK: Record<string, { icon: LucideIcon; tone: ExtTone }> = {
  cashflow: { icon: BarChart3, tone: 'blue' },
  goal: { icon: Target, tone: 'green' },
  planner: { icon: Target, tone: 'green' },
  portfolio: { icon: PieChart, tone: 'violet' },
  calendar: { icon: CalendarDays, tone: 'orange' },
  bank: { icon: Landmark, tone: 'sky' },
  privacy: { icon: ShieldCheck, tone: 'teal' },
  skill: { icon: GraduationCap, tone: 'violet' },
  reminder: { icon: Bell, tone: 'amber' },
  report: { icon: FileText, tone: 'blue' },
  system: { icon: Settings, tone: 'gray' },
};
export const agentLook = (a: string | null) => AGENT_LOOK[a ?? 'system'] ?? AGENT_LOOK.system;

/** Tên tác nhân dễ hiểu — khóa lạ thì hiện nguyên khóa. */
export const agentName = (t: (k: string) => string, a: string | null) => {
  const key = `audit.agent.${a ?? 'system'}`;
  const v = t(key);
  return v === key ? (a ?? '') : v;
};

export const STATUS_TONE: Record<AuditStatus, ExtTone> = { completed: 'green', approved: 'green', rejected: 'red', failed: 'orange' };

const INTL: Record<string, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN' };
const TZ = 'Asia/Ho_Chi_Minh';

/** ["27/09/2026", "10:24"] theo giờ Việt Nam. */
export function dateTimeParts(iso: string, locale: string): [string, string] {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat(INTL[locale] ?? 'vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(INTL[locale] ?? 'vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return [day, time];
}

export function relativeTime(iso: string, locale: string) {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(INTL[locale] ?? 'vi-VN', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
