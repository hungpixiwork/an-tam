import { Briefcase, Car, GraduationCap, Heart, Home, PiggyBank, Plane, Umbrella, type LucideIcon } from 'lucide-react';
import type { Goal } from '@shared/types/domain';
import { TONE_HEX, type ExtTone } from '@/components/ui';

export const GOAL_ICONS: Record<string, { icon: LucideIcon; tone: ExtTone }> = {
  umbrella: { icon: Umbrella, tone: 'green' },
  plane: { icon: Plane, tone: 'blue' },
  'graduation-cap': { icon: GraduationCap, tone: 'violet' },
  car: { icon: Car, tone: 'orange' },
  home: { icon: Home, tone: 'teal' },
  heart: { icon: Heart, tone: 'rose' },
  'piggy-bank': { icon: PiggyBank, tone: 'amber' },
  briefcase: { icon: Briefcase, tone: 'sky' },
};

const KIND_ICON: Record<Goal['kind'], string> = { emergency: 'umbrella', education: 'graduation-cap', home: 'home', retirement: 'piggy-bank', custom: 'heart' };

/** Biểu tượng + màu của mục tiêu (mặc định theo loại). */
export function goalLook(goal: Pick<Goal, 'kind' | 'icon'>) {
  const key = goal.icon && GOAL_ICONS[goal.icon] ? goal.icon : KIND_ICON[goal.kind];
  const look = GOAL_ICONS[key];
  return { key, ...look, hex: TONE_HEX[look.tone] };
}
