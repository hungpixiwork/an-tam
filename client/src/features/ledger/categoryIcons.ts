import { Baby, Briefcase, Car, CirclePlus, Ellipsis, Gift, HeartPulse, House, Laptop, PartyPopper, ShoppingBag, Store, TrendingUp, Utensils, type LucideIcon } from 'lucide-react';
import type { ExtTone } from '@/components/ui';

/** Tên icon trong TRANSACTION_CATEGORIES (shared/engine/ledger.ts) → component lucide. */
const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  gift: Gift,
  laptop: Laptop,
  store: Store,
  'trending-up': TrendingUp,
  'plus-circle': CirclePlus,
  utensils: Utensils,
  home: House,
  car: Car,
  baby: Baby,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  'party-popper': PartyPopper,
  'more-horizontal': Ellipsis,
};

export const categoryIcon = (name: string): LucideIcon => ICONS[name] ?? Ellipsis;

/** Màu danh mục chi (donut + chấm chú thích), theo mockup trang 2. */
export const CATEGORY_COLOR: Record<string, string> = {
  food: '#F58A3C',
  housing: '#5B8DEF',
  transport: '#F5C04A',
  shopping: '#A56EF0',
  entertainment: '#F06BB5',
  health: '#1FA16B',
  children: '#2BB3C0',
  other_expense: '#C4CBD6',
};
export const categoryColor = (key: string) => CATEGORY_COLOR[key] ?? '#C4CBD6';

/** Tông badge/icon theo danh mục (thu nhập luôn xanh lá). */
export const CATEGORY_TONE: Record<string, ExtTone> = {
  food: 'orange',
  housing: 'blue',
  transport: 'amber',
  shopping: 'violet',
  entertainment: 'rose',
  health: 'green',
  children: 'teal',
  other_expense: 'gray',
};
export const categoryTone = (key: string, kind: 'income' | 'expense' = 'expense'): ExtTone => (kind === 'income' ? 'green' : CATEGORY_TONE[key] ?? 'gray');
