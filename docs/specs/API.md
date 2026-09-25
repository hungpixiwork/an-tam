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
| 400 | `wrong_password` | đổi mật khẩu: mật khẩu hiện tại sai |
| 409 | `email_taken` / `already_onboarded` | email đã đăng ký / đã hoàn tất màn Bắt đầu |
| 500 | `internal` | lỗi không lường trước (đã log) |

Kiểu dữ liệu: `shared/types/api.ts`, `shared/engine/analysis.ts`, `shared/engine/plan.ts`, `client/src/lib/queries.ts`.

## Xác thực — không cần đăng nhập
| Method | Path | Body | Trả về |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password (≥8), fullName, salutation }` | `Me` (201, `onboarded: false`) + cookie; tài khoản trống |
| POST | `/auth/login` | `{ email, password }` | `Me` + cookie |
| POST | `/auth/logout` | — | `null`, xóa cookie + session |
| GET | `/auth/me` | — | `Me` hoặc 401 |

## Theo màn — cần đăng nhập
| Màn | Method | Path | Mô tả |
|---|---|---|---|
| 00 | POST | `/onboarding` | `{ profile?: {monthlyIncome, monthlyExpense, emergencyTargetMonths}, holdings: [{name,category,value,volatility?}], goals: GoalInput[] }` → `OnboardingResult` (`me`, điểm an tâm, cảnh báo đầu tiên, `setup`). Ghi nguyên khối; mảng rỗng = bỏ qua bước. 409 nếu đã hoàn tất |
| 11 | GET | `/transactions?month=YYYY-MM` | `LedgerData` — giao dịch của tháng, tổng thu/chi/còn lại, chi theo danh mục, 6 tháng gần nhất, `used` (thu/chi AI đang dùng + nguồn) |
| 11 | POST | `/transactions` | `{ kind, amount > 0, category, note?, occurredOn: YYYY-MM-DD }` → `{ id }` (201). Danh mục phải khớp loại; ngày 2000-01-01..ngày mai |
| 11 | PATCH / DELETE | `/transactions/:id` | sửa (body đầy đủ như POST) / xóa |
| 11 | GET | `/transactions/categories` | `TRANSACTION_CATEGORIES` |
| 06 | GET | `/holdings` | `Holding[]` |
| 06 | POST | `/holdings` | `{ name, category, value, volatility? }` — `role`, `riskGroup` (và `volatility` nếu bỏ trống) suy ra từ loại |
| 06 | PATCH / DELETE | `/holdings/:id` | sửa (partial; đổi loại → cập nhật vai trò / nhóm rủi ro) / xóa |
| 10 | GET / PUT | `/profile` | `ProfileData` — số nền thu/chi, số tháng dự phòng + `used`. PUT nhận partial |
| 10 | PATCH | `/me` | `{ fullName?, salutation? }` → `Me` |
| 10 | POST | `/me/password` | `{ currentPassword, newPassword (≥8) }` → đăng xuất các thiết bị khác |
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

**Sau mỗi lần ghi dữ liệu tài chính** (goals, holdings, transactions, profile, onboarding) Worker gọi `afterChange()`:
chạy lại engine, đồng bộ cảnh báo, chụp snapshot tháng hiện tại, ghi nhật ký AI (xem DATABASE.md › Luồng ghi dữ liệu).

## Validation
- zod ở mọi body (`worker/lib/validate.ts`: `money`, `monthString`, `dateString`). Tiền: số nguyên 0..10 nghìn tỷ.
- Slider mô phỏng: `marketDropPct` −50..50, `inflationPct` 0..10, `incomePauseMonths` 0..12, `interestRateDeltaPct` −3..3, `surpriseCost` 0..500 tr.
- Mọi truy vấn dữ liệu cá nhân đều lọc `user_id = ?` từ session — không nhận `userId` từ client.
