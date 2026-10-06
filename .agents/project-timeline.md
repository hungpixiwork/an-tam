# Lịch dự án đến ngày nộp 20/10/2026

> File này là lịch làm việc theo wave và các mốc khóa. Mỗi việc ghi rõ trang giao diện liên quan — xem chi tiết từng màn ở [specs/redesign-ui.md](specs/redesign-ui.md) và hiện trạng code ở [codebase-audit.md](codebase-audit.md).
> Hạn nộp: **20/10/2026, 23:59 giờ Bắc Kinh**. Nhánh quốc tế, WeBank FinTechathon 2026.

## Điểm xuất phát (27/09)

Code đã có 15 trang, 15 nhóm API, 21 bảng dữ liệu, 15 module tính toán, **95/95 test chạy qua**. Ngày 27/09 team duyệt kế hoạch redesign theo 9 mockup: **tái cấu trúc giao diện, giữ engine/API đang chạy và mở rộng thêm**, không viết lại từ đầu. Thời gian còn lại dành cho: (1) dựng lại giao diện theo mockup, (2) 3 tính năng đột phá B1, B2, B4, (3) tích hợp thật (Google, Notion, SePay) + AI Workspace đa agent có phê duyệt và nhật ký, (4) MCP server, (5) làm chắc luồng demo.

Phân vai: xem [README.md](README.md) mục "Team & phân vai". Code được chia theo wave cho các subagent, dev chính điều phối, review và tích hợp.

## Các mốc khóa

| Mốc | Ngày | Xong khi |
|---|:-:|---|
| Khóa đặc tả + nền móng | 29/09 | Cả team đọc và đồng ý [ba.md](specs/ba.md), [redesign-ui.md](specs/redesign-ui.md), [breakthroughs.md](specs/breakthroughs.md), [llm-strategy.md](specs/llm-strategy.md); Wave 0 xanh (shell mới, UI kit, migration 0008–0009, `/api/health`, audit, idempotency) |
| Màn tài chính lõi + tích hợp | 03/10 | Wave 1 xanh: Sổ thu chi, Quỹ an toàn, Tăng thu nhập (B2), Danh mục (B4), backend tích hợp Google/Notion/SePay |
| Quyết định + lịch | 07/10 | Wave 2 xanh: Lựa chọn cuộc đời (B1), Lịch AI |
| Khóa AI | 12/10 | Wave 3 xanh: AI Workspace chạy thật có phê duyệt; Nhật ký AI; Tổng quan mới |
| MCP server | 14/10 | Wave 4 xanh: `/mcp` dùng được từ Claude; `GET /api/openapi.json` |
| Khóa tính năng | 16/10 | Wave 5 xanh: luồng demo chạy thật từ đầu đến cuối; không thêm tính năng sau mốc này |
| Khóa phát hành | 19/10 | Gắn tag `v1.0.0-rc`, dữ liệu demo, video dự phòng, README, slide |
| **Nộp bài** | **20/10** | Nộp trên cổng nhánh quốc tế |

## Cách chạy mỗi wave

- Dev chính chỉ điều phối, review và tích hợp. Mỗi gói việc giao cho một subagent chạy trong worktree riêng, kèm: danh sách file được sở hữu, hợp đồng API/types đã chốt, ảnh mockup liên quan, tiêu chí xong (typecheck, test, build xanh, có test mới).
- Sau mỗi wave, theo thứ tự: merge → `npm run typecheck && npm test && npm run build` → `/code-review` trên diff và sửa lỗi → verify UI bằng `agent-browser` (responsive bằng `playwright-cli` `setViewportSize`) → commit.
- Wave sau chỉ bắt đầu khi wave trước xanh. File dùng chung (tokens, shell, router, i18n, types, queries, `worker/index.ts`, `wrangler.jsonc`) chỉ sửa ở Wave 0.

## Tuần 0 — Khóa đặc tả (27/09)

- [x] Đối chiếu tuyên bố với code — [judge-review.md](judge-review.md)
- [x] Chốt khẩu hiệu, Thang 5 bậc, 4 tính năng đột phá
- [x] Chốt cách dùng LLM: mô hình mã nguồn mở trên Cloudflare, AI không thấy con số, có chế độ chạy tại chỗ
- [x] Duyệt kế hoạch redesign theo 9 mockup: tích hợp thật, MCP server, route slug tiếng Việt, gộp trang cũ
- [ ] Cả team đọc và đồng ý spec; hỏi ý kiến mentor để kiểm chứng các kết luận ở [judge-review.md](judge-review.md)
- [ ] Việc thủ công (mục dưới) — phải xong trước Wave 1

## Việc thủ công của user (trước 30/09 — không phải code)

- [ ] **Google Cloud project:** bật Calendar, Gmail, Sheets, Drive API; OAuth consent ở chế độ **Testing**, thêm test user (giám khảo + tài khoản demo, tối đa 100); tạo `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, redirect `https://<domain>/api/integrations/google/callback`
- [ ] **Notion:** tạo public integration, lấy `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`
- [ ] **SePay:** tạo tài khoản, liên kết một tài khoản ngân hàng thật, lấy API key webhook + API token
- [ ] **Cloudflare:** tạo KV `OAUTH_KV`; bật Workers AI; `wrangler secret put` cho `TOKEN_ENC_KEY`, `GOOGLE_*`, `NOTION_*`, `SEPAY_WEBHOOK_KEY`, `SEPAY_API_TOKEN`, `AUDIT_HASH_SALT`
- [ ] Cung cấp ảnh minh họa gốc (nếu có) cho các hero banner → `client/public/illustrations/`

## Wave 0 — Nền móng (28/09 – 29/09, 1 agent, tuần tự)

| Việc | Trang liên quan |
|---|---|
| Design tokens trong `client/tailwind.config.js` (xanh lá đậm CTA chính, xanh dương CTA phụ, badge pastel, card bo 16px, shadow nhẹ) | Mọi trang |
| UI kit bổ sung: `KpiCard`, `SectionCard`, `StackedBar`, `Gauge`, `Stepper`, `Timeline`, `Tabs`, `ListRow`, `ApprovalBar`, `QuoteCard`, `HeroBanner`, `WeekGrid`; mở rộng `PageHero` | Mọi trang |
| Shell: `nav.ts` 11 mục, thẻ minh họa sidebar, Topbar (search theo trang, nút Google Calendar, badge riêng tư → `/nhat-ky-ai#privacy`), `router.tsx` thêm route mới (placeholder) + redirect | Mọi trang |
| Tách file dùng chung: `shared/i18n/<lang>/<ns>.ts`, `shared/types/api/<domain>.ts`, `client/src/lib/queries/<domain>.ts` (index re-export, giữ API cũ) | — |
| `migrations/0008_agent_audit.sql` + `0009_profile_career.sql`; `worker/lib/{audit,idempotency,crypto}.ts`; `env.ts` + `wrangler.jsonc` (bindings `AI`, `OAUTH_KV`); stub router cho mọi route mới, mount sẵn trong `worker/index.ts`; chữ ký stub `humanCapital`, `concentration`; `GET /api/health` | — |
| Test: i18n parity, audit append-only, idempotency | — |

## Wave 1 — Màn tài chính lõi + tích hợp (30/09 – 03/10, 5 agent song song)

| Agent | Phạm vi | Trang |
|:-:|---|---|
| A | `0010_ledger_budget`, `budget.ts`, `bills.ts`, `split.ts` + VietQR, tab Thói quen (dời HabitsPage vào) | Sổ thu chi |
| B | `safety.ts`, gộp SafetyPlanPage + các mục tiêu từ GoalsPage | Quỹ an toàn |
| C | **B2:** `0011_skills_catalog`, `humanCapital.ts`, dữ liệu ILO, seed cơ hội/việc làm | Tăng thu nhập |
| D | **B4:** `concentration.ts`, what-if, holdings `sector` / `is_employer_stock` | Danh mục |
| E | Tích hợp (chỉ backend): `0012_integrations`, mã hóa token, Google OAuth + Calendar/Gmail/Sheets client, Notion, SePay webhook + Bank Hub link | — |

## Wave 2 — Quyết định + lịch (04/10 – 07/10, 2 agent)

| Agent | Phạm vi | Trang |
|:-:|---|---|
| F | **B1:** `0014_life_choices`, `lifeChoice.ts` (dùng kết quả C và D), UI so sánh phương án, điều kiện tiên quyết, kế hoạch hành động | Lựa chọn cuộc đời |
| G | `0013_calendar_automation`, `scheduler.ts`, `automation.ts`, đồng bộ Google 2 chiều (dùng client của E), `WeekGrid`, toggle rules, đề xuất tuần | Lịch AI |

## Wave 3 — AI và tổng hợp (08/10 – 12/10, 3 agent)

| Agent | Phạm vi | Trang |
|:-:|---|---|
| H | `shared/agent/*`, `worker/agents/*` (Workers AI + fallback, runner, executor cho Google Calendar/Sheets/Gmail/Notion/nội bộ); 5 agent card, chat, timeline (poll), kế hoạch tuần, công cụ MCP, phê duyệt | AI Workspace |
| I | Bảng audit có lọc/cursor, "Ứng dụng & tích hợp", xuất/xóa dữ liệu (tombstone), tình trạng hệ thống; gộp AiMonitorPage | Nhật ký AI |
| J | Mở rộng `buildOverview` (`resources.ts`, gom dữ liệu A, B, F, G), dựng lại OverviewPage đúng mockup | Tổng quan |

## Wave 4 — An Tâm MCP server (13/10 – 14/10, 1 agent)

- `worker/mcp/*`: `createMcpHandler` + `OAuthProvider`, đăng nhập bằng phiên An Tâm; tool đọc + `propose_action` (chỉ tạo đề xuất chờ duyệt, không có tool approve).
- Cấu hình kết nối: Claude (Custom Connector; plugin Claude Code `.claude-plugin/plugin.json` + `.mcp.json`), ChatGPT (developer mode connector), Gemini CLI (`settings.json` mcpServers).
- `GET /api/openapi.json`.

## Wave 5 — Hoàn thiện (15/10 – 16/10, tuần tự) → khóa tính năng

- Restyle Mô phỏng và Cài đặt; xóa trang đã gộp; dời Học tài chính vào thẻ promo.
- `seeds/demo-user.sql` khớp số liệu mockup: thu 28,5tr, chi 21tr, quỹ dự phòng 84tr / 4,2 tháng, tài sản ròng 520tr, cổ phiếu công ty 35%, MBA 300tr.
- Dịch đủ vi, en, zh. Audit responsive 1440 / 1024 / 768 / 390.
- `/security-review` cho OAuth, webhook, MCP và mã hóa token.

## Nếu trễ — thứ tự cắt (từ dưới lên)

1. Notion
2. Gửi Gmail
3. MCP cho Gemini/ChatGPT (giữ Claude)
4. Quy tắc automation (giữ nút "Tạo lịch tự động")

Việc từ lịch cũ **chưa được xếp vào wave nào** — chỉ làm nếu còn chỗ trước 16/10, nếu không thì chỉ kể trong pitch hoặc ghi 📐: B3 (khoảng cách hành vi, kịch bản khủng hoảng + Student-t), Số tháng an toàn có trừ hao + P10/P50/P90 ([ba.md](specs/ba.md) §5.1), CI GitHub Actions, `.dev.vars.example`, `LICENSE`, giới hạn số lần gọi, test hợp đồng/đầu vào xấu cho route cũ, benchmark Qwen3-30B vs DeepSeek V4 Flash trên 50 câu mẫu.

## Sau khóa tính năng (17/10 – 20/10)

| Ngày | Việc |
|:-:|---|
| 17–18/10 | Chạy thật luồng demo end-to-end: kết nối Google (test user) → Lịch AI "Đồng bộ ngay"; AI Workspace ra lệnh → Duyệt → sự kiện trên Google Calendar thật + dòng mới ở Nhật ký AI; chuyển khoản nhỏ qua SePay → Sổ thu chi; thêm connector `/mcp` vào Claude. `npm run setup`, README cuối, đo độ trễ |
| 19/10 | Gắn tag `v1.0.0-rc`, triển khai, quay video 1080p, hoàn thiện slide → **khóa phát hành** |
| **20/10** | **Nộp bài** |

## Sau khi nộp

| Thời gian | Việc |
|---|---|
| 21–22/10 | Rà soát tuân thủ — giữ hệ thống chạy 24/7, theo dõi `/api/health` |
| 23–28/10 | Chấm online — ôn Q&A theo [judge-review.md](judge-review.md) §5 |
| 31/10 | Công bố danh sách vào chung kết, thư mời visa |
| 01–19/11 | Nếu vào chung kết: thử với 10–20 người dùng thật; hiệu chỉnh bảng nghề–ngành; tăng cường bảo vệ AI; giữ test user Google (refresh token Testing hết hạn sau 7 ngày — kết nối lại trước khi demo) |
| 20/11 | Có mặt tại Thâm Quyến |
| 21–23/11 | **Chung kết: 48 giờ tối ưu sản phẩm và thuyết trình** |

Nguồn lịch chính thức: [IEEE CIS Shenzhen](https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/).
