import type { IncomeProfile, ValueHourEntry, TimeAllocation, TimeCategory, UserState } from '../types/domain';

// === Income Growth Plan ===

export interface IncomeGrowthPlan {
  currentIncome: number;
  targetIncome: number;
  gap: number;
  targetMonths: number;
  hoursPerWeek: number;
  totalAvailableHours: number;
  focusSkill: string;
  recommendations: string[];
}

export function incomeGrowthPlan(profile: IncomeProfile): IncomeGrowthPlan {
  const gap = Math.max(0, profile.targetIncome - profile.currentIncome);
  const totalAvailableHours = Math.round(profile.hoursPerWeek * profile.targetMonths * 4.33);

  const recommendations: string[] = [];
  if (profile.hoursPerWeek > 0) {
    if (totalAvailableHours < 50) {
      recommendations.push(`Khởi động thói quen dành thời gian cho ${profile.focusSkill} mỗi tuần.`);
      recommendations.push(`Tìm hiểu các kiến thức nền tảng và lộ trình phát triển nhanh gọn.`);
    } else if (totalAvailableHours < 200) {
      recommendations.push(`Hoàn thành một khoá học ngắn hạn hoặc chứng chỉ cốt lõi về ${profile.focusSkill}.`);
      recommendations.push(`Áp dụng kiến thức vào dự án cá nhân hoặc công việc hiện tại để thấy kết quả.`);
    } else {
      recommendations.push(`Đầu tư chuyên sâu vào ${profile.focusSkill} để trở thành chuyên gia.`);
      recommendations.push(`Xây dựng danh mục dự án thực tế và chia sẻ quá trình học hỏi.`);
      recommendations.push(`Kết nối với những người có chuyên môn cao trong cùng lĩnh vực.`);
    }
  } else {
    recommendations.push(`Hiện chưa có thời gian phân bổ cho ${profile.focusSkill}. Hãy thử sắp xếp lại lịch trình.`);
  }

  return {
    currentIncome: profile.currentIncome,
    targetIncome: profile.targetIncome,
    gap,
    targetMonths: profile.targetMonths,
    hoursPerWeek: profile.hoursPerWeek,
    totalAvailableHours,
    focusSkill: profile.focusSkill,
    recommendations,
  };
}

// === Financial Connection ===

export interface FinancialConnection {
  additionalMonthlyIncome: number;
  currentSavingsRate: number;
  potentialMonthlySaving: number;
  goalAcceleration: { goalTitle: string; monthsSaved: number } | null;
  disclaimer: string;
}

export function financialConnection(
  incomeProfile: IncomeProfile,
  state: UserState,
): FinancialConnection {
  const additionalMonthlyIncome = Math.max(0, incomeProfile.targetIncome - incomeProfile.currentIncome);
  
  let currentSavingsRate = 0;
  if (state.profile.monthlyIncome > 0) {
    currentSavingsRate = Math.max(0, (state.profile.monthlyIncome - state.profile.monthlyExpense) / state.profile.monthlyIncome);
  }

  const potentialMonthlySaving = additionalMonthlyIncome * currentSavingsRate;

  let goalAcceleration: { goalTitle: string; monthsSaved: number } | null = null;
  if (potentialMonthlySaving > 0) {
    // Find the highest priority non-emergency goal
    const sortedGoals = [...state.goals]
      .filter(g => g.kind !== 'emergency')
      .sort((a, b) => a.priority - b.priority);

    if (sortedGoals.length > 0) {
      const topGoal = sortedGoals[0];
      const remainingAmount = Math.max(0, topGoal.targetAmount - topGoal.currentAmount);
      
      if (remainingAmount > 0 && topGoal.monthlyContribution > 0) {
        const currentMonths = remainingAmount / topGoal.monthlyContribution;
        const newMonths = remainingAmount / (topGoal.monthlyContribution + potentialMonthlySaving);
        const saved = currentMonths - newMonths;
        
        if (saved > 0) {
          goalAcceleration = {
            goalTitle: topGoal.title,
            monthsSaved: Math.round(saved),
          };
        }
      }
    }
  }

  return {
    additionalMonthlyIncome,
    currentSavingsRate,
    potentialMonthlySaving,
    goalAcceleration,
    disclaimer: 'Đây là kịch bản mô phỏng tương lai dựa trên tỷ lệ tiết kiệm hiện tại, không phải là cam kết tài chính.',
  };
}

// === Value Hours Summary ===

export interface ValueHoursSummary {
  totalPlanned: number;
  totalActual: number;
  activities: { title: string; planned: number; actual: number }[];
  insight: string;
}

export function valueHoursSummary(
  entries: ValueHourEntry[],
  activityTitles: Map<string, string>,
): ValueHoursSummary {
  let totalPlanned = 0;
  let totalActual = 0;
  const activityMap = new Map<string, { title: string; planned: number; actual: number }>();

  for (const entry of entries) {
    totalPlanned += entry.planned;
    totalActual += entry.actual;

    const title = activityTitles.get(entry.activityId) || entry.activityTitle;
    const existing = activityMap.get(entry.activityId);
    if (existing) {
      existing.planned += entry.planned;
      existing.actual += entry.actual;
    } else {
      activityMap.set(entry.activityId, { title, planned: entry.planned, actual: entry.actual });
    }
  }

  const activities = Array.from(activityMap.values());
  let insight = '';
  if (totalPlanned > 0) {
    const ratio = totalActual / totalPlanned;
    if (ratio >= 0.8) {
      insight = `Tuần này bạn đã đầu tư ${totalActual} giờ rất sát với kế hoạch. Giữ vững phong độ!`;
    } else {
      insight = `Tuần này bạn đầu tư ${totalActual} giờ trên tổng ${totalPlanned} giờ dự kiến.`;
    }
  } else if (totalActual > 0) {
    insight = `Tuần này bạn đã dành ${totalActual} giờ ngoài kế hoạch cho các hoạt động giá trị.`;
  } else {
    insight = 'Chưa có hoạt động giá trị nào được ghi nhận trong tuần này.';
  }

  return {
    totalPlanned,
    totalActual,
    activities,
    insight,
  };
}

// === Time Allocation Insight ===

export const TIME_CATEGORIES: { category: TimeCategory; label: string; icon: string }[] = [
  { category: 'sleep', label: 'Ngủ', icon: 'Moon' },
  { category: 'work', label: 'Làm việc', icon: 'Briefcase' },
  { category: 'life', label: 'Sinh hoạt & Giải trí', icon: 'Coffee' },
  { category: 'learning', label: 'Học tập & Rèn luyện', icon: 'BookOpen' },
  { category: 'side_income', label: 'Nguồn thu phụ', icon: 'Wallet' },
];

export const TOTAL_WEEKLY_HOURS = 168;

export interface TimeInsight {
  allocations: TimeAllocation[];
  unallocated: number;
  insight: string | null;
}

export function timeAllocationInsight(
  allocations: TimeAllocation[],
  incomeProfile: IncomeProfile | null,
): TimeInsight {
  let totalAllocated = 0;
  let learningAndSideHours = 0;

  for (const a of allocations) {
    totalAllocated += a.hours;
    if (a.category === 'learning' || a.category === 'side_income') {
      learningAndSideHours += a.hours;
    }
  }

  const unallocated = Math.max(0, TOTAL_WEEKLY_HOURS - totalAllocated);
  let insight: string | null = null;

  if (incomeProfile && incomeProfile.targetIncome > incomeProfile.currentIncome) {
    if (learningAndSideHours < 5) {
      insight = 'Mục tiêu này hiện chưa nhận được nhiều thời gian. Bạn có thể cân nhắc phân bổ lại.';
    } else {
      insight = `Bạn đang dành ${learningAndSideHours} giờ/tuần để chuẩn bị cho mục tiêu tăng thu nhập. Một khởi đầu tốt!`;
    }
  }

  return {
    allocations,
    unallocated,
    insight,
  };
}
