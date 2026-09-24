import { Bot, ChartColumn, CircleCheck, House, PieChart, Settings, ShieldCheck, Target, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** Tiêu đề hiển thị ở topbar. */
  title: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Tổng quan', title: 'Tổng quan tài chính', icon: House },
  { to: '/muc-tieu', label: 'Mục tiêu', title: 'Mục tiêu cuộc sống', icon: Target },
  { to: '/mo-phong', label: 'Mô phỏng tương lai', title: 'Mô phỏng tương lai', icon: ChartColumn },
  { to: '/thoi-quen', label: 'Kiểm tra thói quen', title: 'Kiểm tra thói quen', icon: CircleCheck },
  { to: '/danh-muc', label: 'Danh mục đầu tư', title: 'Danh mục đầu tư', icon: PieChart },
  { to: '/ke-hoach', label: 'Kế hoạch an toàn', title: 'Kế hoạch an toàn', icon: ShieldCheck },
  { to: '/ai-theo-doi', label: 'AI theo dõi', title: 'AI theo dõi', icon: Bot },
  { to: '/cong-dong', label: 'Bài học cộng đồng', title: 'Bài học cộng đồng', icon: Users },
  { to: '/cai-dat', label: 'Cài đặt', title: 'Cài đặt & quyền riêng tư', icon: Settings },
];

/** Tiêu đề topbar theo đường dẫn (route con như /mo-phong/ket-qua/:id có tiêu đề riêng). */
export function titleFor(pathname: string): string {
  if (pathname.startsWith('/mo-phong/ket-qua')) return 'Kết quả mô phỏng';
  const item = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  return item?.title ?? 'An Tâm AI';
}
