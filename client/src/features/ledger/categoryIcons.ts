import { Baby, Briefcase, Car, CirclePlus, Ellipsis, Gift, HeartPulse, House, PartyPopper, ShoppingBag, Store, TrendingUp, Utensils, type LucideIcon } from 'lucide-react';

/** Tên icon trong TRANSACTION_CATEGORIES (shared/engine/ledger.ts) → component lucide. */
const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  gift: Gift,
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
