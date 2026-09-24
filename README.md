# An Tâm AI — Hiểu tiền của bạn. Chuẩn bị cho tương lai.

Ứng dụng tài chính cá nhân: đo **mức an tâm tài chính**, theo dõi mục tiêu cuộc sống, **mô phỏng rủi ro tương lai**,
kiểm tra thói quen phản ứng rủi ro và đề xuất **kế hoạch an toàn**. "AI" là engine rule-based tất định —
mọi con số đều giải thích được, AI không bao giờ mua bán thay người dùng.

## Công nghệ
- **Frontend:** React 19 SPA · Vite · TypeScript · Tailwind 3 · Recharts · lucide · React Router · TanStack Query · minh họa pixel art tự vẽ bằng code
- **Backend:** Cloudflare Worker (Hono, zod) · Cron Trigger
- **Database:** Cloudflare D1
- **Dùng chung:** `shared/` — engine, kiểu dữ liệu, định dạng tiền VN (chạy cả ở Worker lẫn trình duyệt)

## Chạy local
```bash
npm install && npm --prefix client install
npm run db:migrate && npm run db:seed
npm run worker:dev          # API  → http://localhost:8787
npm run dev                 # Web  → http://localhost:5173  (proxy /api → 8787)
```
Mở http://localhost:5173/dang-ky, tạo tài khoản — tài khoản mới có sẵn dữ liệu demo.

```bash
npm test                    # vitest: engine, định dạng
npm run typecheck           # worker + shared
npm --prefix client run build
```

## Tài liệu
Toàn bộ đặc tả kiến trúc, dữ liệu, API, engine và 10 màn hình: [`docs/specs/`](docs/specs/README.md).
