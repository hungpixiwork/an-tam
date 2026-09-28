import { Bot, CalendarDays, ChartColumn, FileText, House, NotebookPen, PieChart, Settings, ShieldCheck, Target, TrendingUp, type LucideIcon } from 'lucide-react';

export interface NavItem {
  key: string;
  to: string;
  /** Nhãn sidebar (fallback khi không có i18n; i18n: `nav.<key>`). */
  label: string;
  /** Tiêu đề trang cho document.title (i18n: `nav.<key>.title`). */
  title: string;
  icon: LucideIcon;
}

/** 11 mục sidebar theo mockup 2026-09. Placeholder ô tìm kiếm: i18n `topbar.search.<key>`. */
export const NAV: NavItem[] = [
  { key: 'overview', to: '/', label: 'Tổng quan', title: 'Tổng quan', icon: House },
  { key: 'ledger', to: '/thu-chi', label: 'Sổ thu chi', title: 'Sổ thu chi & dòng tiền', icon: NotebookPen },
  { key: 'safety', to: '/quy-an-toan', label: 'Quỹ an toàn', title: 'Quỹ an toàn & mục tiêu', icon: ShieldCheck },
  { key: 'earn', to: '/tang-thu-nhap', label: 'Tăng thu nhập', title: 'Tăng thu nhập & phát triển kỹ năng', icon: TrendingUp },
  { key: 'choices', to: '/lua-chon', label: 'Mục tiêu & Lựa chọn', title: 'Lựa chọn cuộc đời', icon: Target },
  { key: 'calendar', to: '/lich-ai', label: 'Lịch AI', title: 'Lịch AI & kế hoạch tự động', icon: CalendarDays },
  { key: 'simulation', to: '/mo-phong', label: 'Mô phỏng', title: 'Mô phỏng cú sốc kép', icon: ChartColumn },
  { key: 'portfolio', to: '/danh-muc', label: 'Danh mục', title: 'Danh mục & rủi ro tập trung', icon: PieChart },
  { key: 'workspace', to: '/ai-workspace', label: 'AI Workspace', title: 'AI Workspace · MCP · Agents', icon: Bot },
  { key: 'audit', to: '/nhat-ky-ai', label: 'Nhật ký AI', title: 'Nhật ký AI, kiểm toán & quyền riêng tư', icon: FileText },
  { key: 'settings', to: '/cai-dat', label: 'Cài đặt', title: 'Cài đặt & quyền riêng tư', icon: Settings },
];

/** Route không nằm trên sidebar nhưng vẫn có tiêu đề riêng. */
const EXTRA_TITLES: { prefix: string; key: string; fallback: string }[] = [
  { prefix: '/mo-phong/ket-qua', key: 'nav.simulation.result', fallback: 'Kết quả mô phỏng' },
  { prefix: '/cong-dong', key: 'nav.community.title', fallback: 'Học tài chính' },
];

const BY_LENGTH = [...NAV].sort((a, b) => b.to.length - a.to.length);

/** Mục sidebar ứng với đường dẫn (mục dài nhất khớp tiền tố). */
export function navItemFor(pathname: string): NavItem | undefined {
  return BY_LENGTH.find((n) => (n.to === '/' ? pathname === '/' : pathname === n.to || pathname.startsWith(`${n.to}/`)));
}

/** Tiêu đề trang theo đường dẫn (route con như /mo-phong/ket-qua/:id có tiêu đề riêng). */
export function titleFor(pathname: string, t?: (key: string) => string): string {
  const extra = EXTRA_TITLES.find((x) => pathname.startsWith(x.prefix));
  if (extra) return t ? t(extra.key) : extra.fallback;
  const item = navItemFor(pathname);
  if (!item) return t ? t('app.name') : 'An Tâm AI';
  return t ? t(`nav.${item.key}.title`) : item.title;
}

/** Placeholder ô tìm kiếm theo trang (fallback chung khi route không có trên sidebar). */
export function searchPlaceholderFor(pathname: string, t: (key: string) => string): string {
  const item = navItemFor(pathname);
  return item ? t(`topbar.search.${item.key}`) : t('topbar.search_placeholder');
}
