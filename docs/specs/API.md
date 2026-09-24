# API

Base: `/api` (cùng origin với SPA). Body/response JSON. Xác thực bằng cookie `at_session` (xem [AUTH.md](AUTH.md)).

## Envelope
```jsonc
{ "success": true,  "data": <T> }
{ "success": false, "error": { "code": "invalid_input", "message": "Email không hợp lệ" } }
```
| HTTP | code | Khi nào |
|---|---|---|
| 400 | `invalid_input` | body không qua zod (message = lỗi đầu tiên, tiếng Việt) |
| 401 | `unauthorized` / `invalid_credentials` | chưa đăng nhập / sai email-mật khẩu |
| 404 | `not_found` | không có tài nguyên hoặc không thuộc về người dùng |
| 409 | `email_taken` | email đã đăng ký |
| 500 | `internal` | lỗi không lường trước (đã log) |

Kiểu dữ liệu: `shared/types/api.ts`, `shared/engine/analysis.ts`, `shared/engine/plan.ts`, `client/src/lib/queries.ts`.

## Xác thực — không cần đăng nhập
| Method | Path | Body | Trả về |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password (≥8), fullName, salutation }` | `Me` (201) + cookie; nạp dữ liệu demo |
| POST | `/auth/login` | `{ email, password }` | `Me` + cookie |
| POST | `/auth/logout` | — | `null`, xóa cookie + session |
| GET | `/auth/me` | — | `Me` hoặc 401 |

## Theo màn — cần đăng nhập
| Màn | Method | Path | Mô tả |
|---|---|---|---|
| 01 | GET | `/overview?range=6\|12` | `OverviewData` — lời chào, điểm an tâm + breakdown, 4 KPI, chuỗi tài sản, phân bổ, gợi ý hôm nay, số cảnh báo mở. Đồng bộ cảnh báo trước khi trả |
| 02 | GET | `/goals/summary` | `GoalsSummary` — thẻ mục tiêu (xác suất, cần để dành/tháng, tháng dự kiến), cột mốc, gợi ý |
| 02 | POST | `/goals` | tạo mục tiêu `{kind,title,targetAmount,currentAmount,targetMonth,monthlyContribution,priority}` |
| 02 | PATCH / DELETE | `/goals/:id` | sửa (partial) / xóa |
| 03 | GET | `/simulations/presets` | `Preset[]` |
| 03 | POST | `/simulations/preview` | `SimulationParams` → `SimulationReport` (không lưu) |
| 03 | POST | `/simulations/run` | `SimulationParams` → `{ runId }`; lưu run + ghi `ai_events` |
| 04 | GET | `/simulations/runs` · `/simulations/runs/:id` | lịch sử · `SimulationReport & { createdAt }` |
| 05 | GET | `/habits` | `{ scenarios, answers, profile }` |
| 05 | POST | `/habits/answers` | `{ scenarioId, choice }` → như GET |
| 05 | PUT | `/habits/self-score` | `{ score 0..10 }` → như GET |
| 06 | GET | `/portfolio` | `PortfolioAnalysis` |
| 07 | GET | `/plans` | `{ proposal: PlanProposal, applied }` |
| 07 | POST | `/plans/apply` | tạo plan + tasks + `ai_events` → `applied` |
| 07 | PATCH | `/plans/tasks/:id` | `{ done }` |
| 08 | GET | `/ai?range=week\|month` | `{ events, alerts }` |
| 08 | PATCH | `/ai/alerts/:id` | `{ status: 'resolved' \| 'open' }` |
| 09 | GET | `/lessons` · `/lessons/:slug` | danh sách · chi tiết (có `bodyMd`) |
| 10 | GET / PUT | `/settings` | 6 cờ boolean (PUT nhận partial) |
| 10 | GET | `/me/export` | JSON toàn bộ dữ liệu cá nhân (attachment) |
| 10 | DELETE | `/me` | xóa tài khoản + mọi dữ liệu (cascade), xóa cookie |
| Chung | GET | `/notifications` | cảnh báo đang mở (chuông topbar) |
| Chung | GET | `/search?q=` | trang + mục tiêu + bài học, tìm không dấu |

## Validation
- zod ở mọi body (`worker/lib/validate.ts`). Tháng: `^\d{4}-(0[1-9]|1[0-2])$`.
- Slider mô phỏng: `marketDropPct` −50..50, `inflationPct` 0..10, `incomePauseMonths` 0..12, `interestRateDeltaPct` −3..3, `surpriseCost` 0..500 tr.
- Mọi truy vấn dữ liệu cá nhân đều lọc `user_id = ?` từ session — không nhận `userId` từ client.
