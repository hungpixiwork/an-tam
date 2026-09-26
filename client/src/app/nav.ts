import { Bot, ChartColumn, CircleCheck, House, NotebookPen, PieChart, Settings, ShieldCheck, Target, TrendingUp, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  key: string;
  to: string;
  label: string;
  /** Tiêu đề hiển thị ở topbar. */
  title: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { key: 'overview', to: '/', label: 'Tổng quan', title: 'Tổng quan tài chính', icon: House },
  { key: 'ledger', to: '/thu-chi', label: 'Sổ thu chi', title: 'Sổ thu chi', icon: NotebookPen },
  { key: 'earn', to: '/tang-thu-nhap', label: 'Tăng thu nhập', title: 'Tăng thu nhập', icon: TrendingUp },
  { key: 'goals', to: '/muc-tieu', label: 'Mục tiêu', title: 'Mục tiêu cuộc sống', icon: Target },
  { key: 'simulation', to: '/mo-phong', label: 'Mô phỏng tương lai', title: 'Mô phỏng tương lai', icon: ChartColumn },
  { key: 'habits', to: '/thoi-quen', label: 'Kiểm tra thói quen', title: 'Kiểm tra thói quen', icon: CircleCheck },
  { key: 'portfolio', to: '/danh-muc', label: 'Danh mục đầu tư', title: 'Danh mục đầu tư', icon: PieChart },
  { key: 'plan', to: '/ke-hoach', label: 'Kế hoạch an toàn', title: 'Kế hoạch an toàn', icon: ShieldCheck },
  { key: 'ai', to: '/ai-theo-doi', label: 'AI theo dõi', title: 'AI theo dõi', icon: Bot },
  { key: 'community', to: '/cong-dong', label: 'Học tài chính', title: 'Học tài chính', icon: Users },
  { key: 'settings', to: '/cai-dat', label: 'Cài đặt', title: 'Cài đặt & quyền riêng tư', icon: Settings },
];

/** Tiêu đề topbar theo đường dẫn (route con như /mo-phong/ket-qua/:id có tiêu đề riêng). */
export function titleFor(pathname: string, t?: (key: string) => string): string {
  if (pathname.startsWith('/mo-phong/ket-qua')) {
    return t ? t('nav.simulation.result') : 'Kết quả mô phỏng';
  }
  const item = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  if (!item) return t ? t('app.name') : 'An Tâm AI';
  return t ? t(`nav.${item.key}.title`) : item.title;
}
