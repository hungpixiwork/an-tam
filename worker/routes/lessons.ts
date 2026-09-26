import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { notFound, ok } from '../lib/http';

interface LessonRow {
  id: string;
  slug: string;
  kind: string;
  title: string;
  excerpt: string;
  body_md: string;
  category: string;
  icon: string;
  read_time: string;
  is_featured: number;
}

const map = (l: LessonRow, withBody = false) => ({
  id: l.id,
  slug: l.slug,
  kind: l.kind,
  title: l.title,
  excerpt: l.excerpt,
  category: l.category,
  icon: l.icon,
  readTime: l.read_time,
  isFeatured: l.is_featured === 1,
  ...(withBody ? { bodyMd: l.body_md } : {}),
});

export const lessons = new Hono<AppEnv>()
  .get('/', async (c) => {
    const peaceLevel = c.req.query('peace_level');
    let query = 'SELECT * FROM lessons ORDER BY order_idx';
    if (peaceLevel) {
      query = 'SELECT * FROM lessons ORDER BY (recommended_for = ?) DESC, order_idx';
    }
    const stmt = peaceLevel ? c.env.DB.prepare(query).bind(peaceLevel) : c.env.DB.prepare(query);
    const { results } = await stmt.all<LessonRow>();
    return ok(c, results.map((l) => map(l)));
  })
  .get('/:slug', async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM lessons WHERE slug = ?').bind(c.req.param('slug')).first<LessonRow>();
    if (!row) throw notFound('Không tìm thấy bài học');
    return ok(c, map(row, true));
  });
