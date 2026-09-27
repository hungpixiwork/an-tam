# An Tâm AI — Product Traceability Matrix

> Ma trận truy vết: User Need → Product Capability → Screen → Engine → Test → Status

## Full Traceability

| USER NEED | PRODUCT CAPABILITY | SCREEN | COMPONENT | ENGINE/API | TEST | STATUS |
|---|---|---|---|---|---|---|
| **JOB 01 KNOW** — "Tình hình đang ổn hay không" | Đo mức an tâm 100 điểm, 4 KPIs, biểu đồ tài sản | `/` Overview | `PeaceCard`, `StatCard`, `NetWorthChart` | `peaceScore`, `buildOverview` / `GET /api/overview` | `engine.test.ts` (peaceScore, buildOverview) | ✅ 5/5 |
| JOB 01 — Cảnh báo tự động | Quét 3 luật, cảnh báo proactive | `/ai-theo-doi` | `AiMonitorPage`, `AlertsCard` | `evaluateAlerts`, `syncAlerts` / `GET /api/ai` | `engine.test.ts` (evaluateAlerts) | ✅ 4/5 |
| JOB 01 — Tìm kiếm nhanh | Tìm trang, mục tiêu, bài học | Topbar | `SearchBox` | `GET /api/search` | — | ✅ |
| JOB 01 — Thông báo | Badge chuông + popover cảnh báo | Topbar | `NotificationBell` | `GET /api/notifications` | — | ✅ |
| **JOB 02 SPEND** — "Tiêu tiền không như kế toán" | Ghi thu chi, tổng kết tháng, chi theo danh mục | `/thu-chi` Ledger | `TransactionForm`, `MonthCard` | `effectiveProfile` / `GET/POST /api/transactions` | `ledger.test.ts` | ✅ 5/5 |
| **JOB 03 SAVE** — "Tạo khoảng cách thu-chi" | Dòng tiền tự do, tiến độ mục tiêu | `/` + `/muc-tieu` | `CashflowCard`, `GoalCardItem` | `freeCashflow`, `goalProbability` / `GET /api/goals/summary` | `engine.test.ts` (goalProbability) | ✅ 5/5 |
| JOB 03 — Quỹ dự phòng | Đo số tháng chi tiêu có thể trụ | `/` + `/ke-hoach` | `StatCard` (emergency), `SafetyPlanPage` | `emergencyAmount`, `emergencyMonths` | `engine.test.ts` (peaceScore) | ✅ |
| **JOB 04 EARN** — "Tăng khả năng kiếm tiền" | — | — | — | — | — | ❌ **MISSING** |
| **JOB 05 INVEST** — "Sau khi có tiền dư, phân bổ thế nào" | Phân bổ tài sản, rủi ro tập trung, cảnh báo | `/danh-muc` Portfolio | `PortfolioPage`, `HoldingFormModal`, `DonutChart` | `portfolioAnalysis`, `allocation` / `GET /api/portfolio` | `analysis.test.ts` | ✅ 4.5/5 |
| JOB 05 — Kiểm tra thói quen rủi ro | Trắc nghiệm behavioral, self vs actual score | `/thoi-quen` Habits | `HabitsPage`, `ScoreRing` | `habitsProfile` / `GET/POST /api/habits` | `analysis.test.ts` | ✅ 4/5 |
| **JOB 06 PREPARE** — "Nếu chuyện xấu xảy ra" | Mô phỏng stress-test, kế hoạch an toàn | `/mo-phong` + `/ke-hoach` | `SimulationPage`, `SafetyPlanPage` | `simulate`, `proposePlan` / `POST /api/simulations/run` | `engine.test.ts` (simulate) | ✅ 4.5/5 |
| JOB 06 — Kết quả mô phỏng | Phân tích before/after, gợi ý hành động | `/mo-phong/ket-qua/:id` | `SimulationResultPage` | `simulationReport` / `GET /api/simulations/runs/:id` | `analysis.test.ts` | ✅ 4.5/5 |
| **JOB 07 LIVE** — "Tất cả giúp cuộc sống tốt hơn" | Bài học cộng đồng, câu chuyện thực tế | `/cong-dong` Community | `CommunityPage` | `GET /api/lessons` | — | ⚠️ 4/5 (chưa cá nhân hóa) |
| **Cross-cutting: Onboarding** | Thu thập dữ liệu 3 bước, có skip, Aha moment | `/bat-dau` | `OnboardingPage` | `POST /api/onboarding` | — | ✅ 5/5 |
| **Cross-cutting: Auth** | Email + password, session, xưng hô | `/dang-nhap`, `/dang-ky` | `LoginPage`, `RegisterPage` | `POST /api/auth/*` | — | ✅ 4/5 |
| **Cross-cutting: Privacy** | Export, delete, settings, transparency | `/cai-dat` Settings | `SettingsPage`, `AccountCards` | `GET /me/export`, `DELETE /me` | — | ⚠️ 4/5 (privacy claim issue) |
| **Cross-cutting: AI Monitor** | Cron hàng ngày, reaction loop | `/ai-theo-doi` | `AiMonitorPage` | `runMonitor`, `afterChange` | — | ✅ 4/5 |

## Test Coverage

| Test File | Modules Covered | Assertions |
|---|---|---|
| `tests/engine.test.ts` | month, peaceScore, goalProbability, allocation, simulate, evaluateAlerts, buildOverview | ✅ Comprehensive |
| `tests/analysis.test.ts` | proposePlan, goalsSummary, simulationReport, habitsProfile, portfolioAnalysis | ✅ Comprehensive |
| `tests/ledger.test.ts` | effectiveProfile, holdingDefaults, setupStatus, empty state (no NaN) | ✅ Comprehensive |
| `tests/format.test.ts` | formatVnd, formatPct, formatMonth, formatDuration | ✅ Comprehensive |
