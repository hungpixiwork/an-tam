# Kiến trúc

## Tổng quan
```
┌──────────────────────────── Trình duyệt ────────────────────────────┐
│ React 19 SPA (Vite, TS, Tailwind 3, Recharts, lucide, React Router, │
│ TanStack Query) + pixel art SVG                                     │
└───────────────┬─────────────────────────────────────────────────────┘
                │ fetch /api/* (cookie at_session, cùng origin)
┌───────────────▼──────────── Cloudflare Worker (Hono) ───────────────┐
│ middleware: session → requireAuth                                   │
│ routes/: auth, overview, goals, portfolio, simulations, habits,     │
│          plans, ai, community, settings, search                     │
│ jobs/monitor.ts (Cron) ─ chạy engine, ghi ai_events / ai_alerts     │
│ ASSETS binding ─ phục vụ client/dist (SPA fallback)                 │
└───────────────┬─────────────────────────────────────────────────────┘
                │ D1 binding "DB"
┌───────────────▼───────┐        ┌──────────────── shared/ ───────────┐
│ Cloudflare D1 (SQLite)│        │ types/  engine/  format/            │
└───────────────────────┘        │ TS thuần, import bởi cả client và   │
                                 │ worker. Worker là nguồn chính thức; │
                                 │ client dùng để xem trước tức thì.   │
                                 └─────────────────────────────────────┘
```

## Cấu trúc thư mục
```
an-tam/
├─ docs/specs/                 # tài liệu này
├─ migrations/                 # D1 migrations (wrangler d1 migrations)
│  ├─ 0001_init.sql
│  └─ 0002_real_data.sql       # onboarded_at, bảng transactions
├─ seeds/catalog.sql           # danh mục dùng chung (preset, bài học, kịch bản thói quen) — không có dữ liệu cá nhân
├─ shared/
│  ├─ types/                   # kiểu dữ liệu API (request/response)
│  ├─ engine/                  # peaceScore, goals, simulate, alerts, ledger, narrate
│  └─ format/                  # formatVnd, formatPct, formatMonth...
├─ worker/
│  ├─ index.ts                 # app Hono, export { fetch, scheduled }
│  ├─ env.ts                   # kiểu Env / Variables
│  ├─ middleware/auth.ts
│  ├─ lib/                     # password, session, http, validate, state (load UserState từ D1), refresh (afterChange)
│  ├─ routes/*.ts
│  └─ jobs/monitor.ts
├─ tests/                      # vitest (engine, ledger, format); demo-data.ts = fixture số liệu mockup
├─ client/
│  ├─ index.html
│  ├─ vite.config.ts           # alias @shared, proxy /api → :8787
│  └─ src/
│     ├─ main.tsx
│     ├─ app/                  # router.tsx, providers.tsx, auth.tsx
│     ├─ layouts/              # AppShell, AuthLayout, OnboardingLayout
│     ├─ components/
│     │  ├─ ui/                # Card, StatCard, ScoreRing, DonutChart, Badge, Button...
│     │  ├─ layout/            # Sidebar, Topbar, UserMenu, NotificationBell, SearchBox
│     │  └─ pixel/             # engine + sprites + scenes
│     ├─ features/<page>/      # mỗi màn 1 thư mục
│     └─ lib/                  # api.ts, queryKeys.ts
├─ wrangler.jsonc
└─ package.json                # scripts gốc
```

## Nguyên tắc
1. **Một nguồn số liệu**: engine ở `shared/engine` là hàm thuần; worker gọi engine trên dữ liệu D1 và trả kết quả.
   Không lưu cứng chỉ số dẫn xuất (điểm an tâm, xác suất) trong DB.
2. **Một request cho mỗi màn** khi có thể (`/api/overview`, `/api/goals/summary`...) để giảm round-trip.
3. **Cùng origin**: Worker phục vụ cả SPA và API → không cần CORS, cookie `SameSite=Lax`.
4. **Tiền = số nguyên VND**. Chỉ định dạng ở tầng hiển thị (`shared/format`).
5. **Không fallback dữ liệu giả ở client**. Lỗi API → hiển thị trạng thái lỗi + nút thử lại. Chưa có dữ liệu → `EmptyState` + nút nhập.
6. **Không có dữ liệu demo**. Tài khoản mới trống; dữ liệu chỉ đến từ người dùng (màn Bắt đầu, Sổ thu chi, Danh mục, Mục tiêu, Cài đặt).
7. **AI phản ứng ngay khi dữ liệu đổi**: mọi route ghi dữ liệu tài chính gọi `afterChange()` (cảnh báo, snapshot, nhật ký).

## Luồng dev
```bash
npm install && npm --prefix client install
npm run db:migrate          # wrangler d1 migrations apply an-tam-db --local
npm run db:seed             # seeds/catalog.sql: preset + bài học + kịch bản thói quen
npm run worker:dev          # wrangler dev  → http://localhost:8787
npm run dev                 # vite          → http://localhost:5173 (proxy /api → 8787)
npm test                    # vitest
```
Build & deploy: `npm run worker:deploy` (build client → `wrangler deploy`). Production cần tạo D1 thật
(`wrangler d1 create an-tam-db`), thay `database_id`, rồi `wrangler d1 migrations apply an-tam-db --remote`.

## Cron
`wrangler.jsonc → triggers.crons = ["0 1 * * *"]` (08:00 giờ VN). `jobs/monitor.ts` duyệt mọi user,
chạy `evaluateAlerts`, mở/đóng cảnh báo và ghi `ai_events` (màn 08).
