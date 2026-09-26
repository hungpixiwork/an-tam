import type { UserState, Transaction } from '../types/domain';
import { formatVnd } from '../format';
import { nearestMajorGoal } from './goals';
import { evaluateAlerts, ALERT_ACTIONS } from './alerts';

export interface WeeklyDigest {
  weekLabel: string;
  moneyIn: number;
  moneyOut: number;
  saved: number;
  goalProgress: { title: string; pct: number } | null;
  valueHours: number;
  oneNotice: string;
  oneAction: string;
  actionTo: string;
}

export function weeklyDigest(state: UserState, weekTransactions: Transaction[], valueHoursThisWeek: number): WeeklyDigest {
  const moneyIn = weekTransactions.filter(t => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0);
  const moneyOut = weekTransactions.filter(t => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const saved = moneyIn - moneyOut;

  const major = nearestMajorGoal(state);
  let goalProgress: { title: string; pct: number } | null = null;
  if (major) {
    goalProgress = {
      title: major.title,
      pct: Math.min(1, major.currentAmount / major.targetAmount),
    };
  }

  const alerts = evaluateAlerts(state);
  const topAlert = alerts.length > 0 ? alerts[0] : null;

  let oneNotice = '';
  let oneAction = '';
  let actionTo = '';

  if (topAlert) {
    oneNotice = topAlert.body;
    const action = ALERT_ACTIONS[topAlert.ruleKey.split(':')[0]] || { label: 'Xem chi tiết', to: '/ai' };
    oneAction = action.label;
    actionTo = action.to;
  } else if (moneyOut > moneyIn && moneyOut > 0) {
    oneNotice = `Chi tiêu tuần này (${formatVnd(moneyOut)}) đang cao hơn thu nhập (${formatVnd(moneyIn)}).`;
    oneAction = 'Kiểm tra thu chi';
    actionTo = '/thu-chi';
  } else if (saved > 0) {
    oneNotice = `Tuần này bạn đã tiết kiệm được ${formatVnd(saved)}, giữ vững phong độ nhé!`;
    oneAction = 'Xem mục tiêu';
    actionTo = '/muc-tieu';
  } else {
    oneNotice = 'Mọi thứ đang đi đúng hướng, chưa có vấn đề gì đáng lo.';
    oneAction = 'Xem tổng quan';
    actionTo = '/';
  }

  // Generate a mock week label for now, since we don't have exact dates
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const weekLabel = `Tuần ${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}`;

  return {
    weekLabel,
    moneyIn,
    moneyOut,
    saved,
    goalProgress,
    valueHours: valueHoursThisWeek,
    oneNotice,
    oneAction,
    actionTo,
  };
}
