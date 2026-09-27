# An Tâm AI — Product Implementation Log

> Log chi tiết implementation cho mỗi feature, bao gồm trạng thái, AI role, privacy, và remaining gaps.

## Feature Implementation Matrix

| Feature | Route | Status | AI Role | Deterministic Role | Privacy | Mobile | Tests | Remaining Gaps |
|---|---|---|---|---|---|---|---|---|
| **Overview** | `/` | DEMO READY | Narrator (greeting, tip), Simulate (daily tip) | peaceScore, buildOverview, KPIs, allocation | Local/User DB | ✅ | engine.test.ts | — |
| **Ledger** | `/thu-chi` | DEMO READY | Explain (nguồn dữ liệu AI dùng) | effectiveProfile, transaction CRUD | Local/User DB | ✅ | ledger.test.ts | — |
| **Goals** | `/muc-tieu` | DEMO READY | Plan, Coach (xác suất, timeline) | goalProbability (Normal CDF), milestones | Local/User DB | ✅ | engine.test.ts | — |
| **Onboarding** | `/bat-dau` | DEMO READY | Evaluate (peace score + alerts đầu tiên) | Batch write, peaceScore, evaluateAlerts | Local/User DB | ✅ | — | — |
| **Simulation** | `/mo-phong` | POLISHED | Simulate (stress-test engine) | simulate(), MARKET_BETA, shock mechanics | Local/User DB | ✅ | engine.test.ts | — |
| **Sim Result** | `/mo-phong/ket-qua/:id` | POLISHED | Plan (suggestions after shock) | simulationReport(), before/after delta | Local/User DB | ✅ | analysis.test.ts | AI text hardcode |
| **Habits** | `/thoi-quen` | FUNCTIONAL | Coach (score gap analysis) | habitsProfile(), risk scoring | Local/User DB | ✅ | analysis.test.ts | Salutation bug |
| **Portfolio** | `/danh-muc` | POLISHED | Explain (AiExplainCard) | portfolioAnalysis(), allocation, concentration | Local/User DB | ✅ | analysis.test.ts | — |
| **Safety Plan** | `/ke-hoach` | FUNCTIONAL | Plan (3-step proposal) | proposePlan(), chart projection | Local/User DB | ✅ | analysis.test.ts | — |
| **AI Monitor** | `/ai-theo-doi` | FUNCTIONAL | Support (proactive alerts) | evaluateAlerts(), syncAlerts, runMonitor | Local/User DB | ✅ | engine.test.ts | More alert rules |
| **Community** | `/cong-dong` | FUNCTIONAL | — (static content) | Fetch lessons from DB | Local/User DB | ✅ | — | Personalized recs |
| **Settings** | `/cai-dat` | FUNCTIONAL | Transparency (data usage card) | CRUD settings, export, delete | Privacy controls | ✅ | — | Encryption placebo |
| **Auth** | `/dang-nhap` `/dang-ky` | FUNCTIONAL | — | PBKDF2-SHA256, session cookie | HttpOnly cookie | ✅ | — | Rate limiting |
| **EARN** | — | NOT STARTED | — | — | — | — | — | Entire module |

## Detailed Feature Records

### Overview (`/`)
- **Purpose:** Xem tổng thể bức tranh tài chính
- **User:** Tất cả personas
- **User problem:** Không biết tiền đang thế nào, có ổn không
- **Human need:** Giảm lo âu, biết tình trạng
- **Files:** `OverviewPage.tsx`, `overview.ts`, `peace.ts`, `narrate.ts`
- **AI responsibility:** Giải thích trạng thái (Narrator), Mô phỏng Tip hôm nay
- **Deterministic:** Tính cashflow, KPIs, networth, score, allocation
- **Data:** Snapshot, Holdings, Goals, Ledger
- **Error/empty/loading:** Có skeleton, error state, empty state (SetupCard)
- **Chinese localisation:** N/A
- **Status:** DEMO READY

### Ledger (`/thu-chi`)
- **Purpose:** Quản lý thu chi hàng ngày
- **User:** Tất cả personas
- **Human need:** Kiểm soát dòng tiền
- **Files:** `LedgerPage.tsx`, `ledger.ts`, `categoryIcons.ts`
- **AI responsibility:** Giải thích nguồn dữ liệu AI đang dùng (baseline vs ledger vs current_month)
- **Deterministic:** CRUD transactions, effectiveProfile, monthly totals
- **Status:** DEMO READY

### Goals (`/muc-tieu`)
- **Purpose:** Quản lý mục tiêu tương lai
- **User:** Building, Stabilizing
- **Human need:** Biết bao giờ đạt mục tiêu, cần bao nhiêu/tháng
- **Files:** `GoalsPage.tsx`, `GoalFormModal.tsx`, `goals.ts`
- **AI responsibility:** Cảnh báo chậm tiến độ, tính xác suất
- **Deterministic:** Expected return, Normal CDF, milestones
- **Status:** DEMO READY

### Simulation (`/mo-phong`)
- **Purpose:** Stress-test kế hoạch tài chính
- **User:** Building, Stabilizing, Growing
- **Human need:** Chuẩn bị cho biến cố
- **Files:** `SimulationPage.tsx`, `simulate.ts`, `analysis.ts`
- **AI responsibility:** Cỗ máy mô phỏng siêu tốc
- **Deterministic:** MARKET_BETA, shock mechanics, projection
- **Status:** POLISHED
- **Remaining:** AI text hardcode trong analysis.ts

### Habits (`/thoi-quen`)
- **Purpose:** Khám phá khẩu vị rủi ro thực sự
- **User:** Starting, Building
- **Human need:** Tự nhận thức (self-awareness)
- **Files:** `HabitsPage.tsx`, `analysis.ts`
- **AI responsibility:** Phân tích gap giữa tự đánh giá và hành vi thực
- **Deterministic:** Score calculation từ risk weights
- **Status:** FUNCTIONAL
- **Remaining:** Salutation bug (gọi "bạn" thay vì dùng anh/chị)

### Portfolio (`/danh-muc`)
- **Purpose:** Bức tranh tổng thể tài sản
- **User:** Building, Stabilizing
- **Human need:** Portfolio visibility, diversification check
- **Files:** `PortfolioPage.tsx`, `HoldingFormModal.tsx`, `portfolio.ts`
- **AI responsibility:** Dịch biểu đồ thành ngôn ngữ con người (AiExplainCard)
- **Status:** POLISHED

### Safety Plan (`/ke-hoach`)
- **Purpose:** Giảm rủi ro có phương pháp
- **User:** Tất cả personas có dữ liệu
- **Human need:** Biến lo âu thành hành động
- **Files:** `SafetyPlanPage.tsx`, `plan.ts`
- **AI responsibility:** Nhà hoạch định tài chính (3 bước đề xuất)
- **Deterministic:** Emergency gap, rebalance 10%, contribution increase
- **Status:** FUNCTIONAL

### AI Monitor (`/ai-theo-doi`)
- **Purpose:** Giám sát proactive
- **User:** Tất cả personas (passive)
- **Human need:** Không cần tự soi, có người gác cổng
- **Files:** `AiMonitorPage.tsx`, `alerts.ts`, `monitor.ts`
- **AI responsibility:** Người giám sát chạy ngầm
- **Deterministic:** 3 alert rules, cron job
- **Status:** FUNCTIONAL
- **Remaining:** Có thể thêm alert rules (chi vượt hạn mức)

### Community (`/cong-dong`)
- **Purpose:** Giáo dục tài chính
- **User:** Starting, Building
- **Human need:** Học hỏi, đồng cảm
- **Files:** `CommunityPage.tsx`, `lessons.ts`
- **AI responsibility:** Không trực tiếp phân tích cá nhân
- **Status:** FUNCTIONAL
- **Remaining:** Chưa cá nhân hóa recommend theo tình trạng tài chính

### Settings (`/cai-dat`)
- **Purpose:** Quản lý tài khoản, quyền riêng tư
- **User:** Tất cả
- **Human need:** Làm chủ dữ liệu
- **Files:** `SettingsPage.tsx`, `AccountCards.tsx`, `settings.ts`
- **Status:** FUNCTIONAL
- **Remaining:** Toggle "Mã hóa dữ liệu" là placebo
