// Endpoint dùng chung cho topbar: chuông thông báo và ô tìm kiếm.

import { Hono } from 'hono';
import type { AppEnv } from '../env';
import type { NotificationItem, SearchResult } from '../../shared/types/api';
import { ok } from '../lib/http';

/** Các trang có thể tìm tới — đồng bộ với router phía client. */
const PAGES: SearchResult[] = [
  { type: 'page', title: 'Tổng quan', subtitle: 'Mức an tâm, tài sản, gợi ý hôm nay', to: '/' },
  { type: 'page', title: 'Sổ thu chi', subtitle: 'Ghi thu nhập, chi tiêu hằng ngày', to: '/thu-chi' },
  { type: 'page', title: 'Mục tiêu', subtitle: 'Mua nhà, học cho con, nghỉ hưu, dự phòng', to: '/muc-tieu' },
  { type: 'page', title: 'Mô phỏng tương lai', subtitle: 'Thử kịch bản thị trường, lạm phát, thu nhập', to: '/mo-phong' },
  { type: 'page', title: 'Kiểm tra thói quen', subtitle: 'Hồ sơ phản ứng rủi ro', to: '/thoi-quen' },
  { type: 'page', title: 'Danh mục đầu tư', subtitle: 'Phân bổ và rủi ro tập trung', to: '/danh-muc' },
  { type: 'page', title: 'Kế hoạch an toàn', subtitle: '3 bước AI đề xuất', to: '/ke-hoach' },
  { type: 'page', title: 'AI theo dõi', subtitle: 'Cảnh báo và nhật ký AI', to: '/ai-theo-doi' },
  { type: 'page', title: 'Bài học cộng đồng', subtitle: 'Kiến thức tài chính dễ hiểu', to: '/cong-dong' },
  { type: 'page', title: 'Cài đặt & quyền riêng tư', subtitle: 'Dữ liệu, thông báo, bảo mật', to: '/cai-dat' },
];

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const common = new Hono<AppEnv>()
  .get('/notifications', async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, severity, title, created_at FROM ai_alerts WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 10",
    )
      .bind(c.get('userId'))
      .all<{ id: string; severity: NotificationItem['severity']; title: string; created_at: string }>();
    return ok<NotificationItem[]>(c, results.map((r) => ({ id: r.id, severity: r.severity, title: r.title, createdAt: r.created_at })));
  })
  .get('/search', async (c) => {
    const q = fold((c.req.query('q') ?? '').trim());
    if (q.length < 1) return ok<SearchResult[]>(c, []);
    const [goals, lessons] = await c.env.DB.batch<{ title: string; extra: string }>([
      c.env.DB.prepare('SELECT title, target_month AS extra FROM goals WHERE user_id = ?').bind(c.get('userId')),
      c.env.DB.prepare('SELECT title, category AS extra FROM lessons'),
    ]);
    const results: SearchResult[] = [
      ...PAGES,
      ...goals.results.map((g) => ({ type: 'goal' as const, title: g.title, subtitle: `Mục tiêu · ${g.extra}`, to: '/muc-tieu' })),
      ...lessons.results.map((l) => ({ type: 'lesson' as const, title: l.title, subtitle: `Bài học · ${l.extra}`, to: '/cong-dong' })),
    ].filter((r) => fold(`${r.title} ${r.subtitle}`).includes(q));
    return ok(c, results.slice(0, 8));
  });
