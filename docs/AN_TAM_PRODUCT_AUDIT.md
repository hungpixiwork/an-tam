# An Tâm AI — Product Audit

> Audit thực hiện bởi 10 parallel agents phân tích toàn bộ codebase.
> Ngày: 2026-09-26

---

## 1. Executive Summary

**Product Thesis Hiện Tại:**
Xuyên suốt `README.md` và `docs/specs/README.md`, định vị cốt lõi của An Tâm AI là *"Hiểu tiền của bạn. Chuẩn bị cho tương lai."* Đây là ứng dụng tập trung đo lường **mức độ an tâm tài chính**, theo dõi mục tiêu cuộc sống, **mô phỏng rủi ro tương lai**, kiểm tra thói quen phản ứng rủi ro và đề xuất **kế hoạch an toàn**. "AI" trong sản phẩm là hệ thống *rule-based tất định* (không LLM), mọi con số đều giải thích được, và hệ thống tuyệt đối không tự động mua/bán thay người dùng.

**Mức Độ Thể Hiện Của Codebase:**
Codebase thực tế thể hiện được **hơn 90%** những gì đã hứa hẹn trong lộ trình (Milestone M1–M13 đều đã hoàn thành). Toàn bộ engine đánh giá an tâm, mục tiêu, mô phỏng rủi ro đã được viết trọn vẹn và nhất quán trong `shared/engine`.

**Các Điểm Mạnh Thực Tế:**
1. **Tách biệt Logic và Trình Bày Rất Tốt:** Hàm `peaceScore` (`shared/engine/peace.ts`) và mô phỏng (`shared/engine/simulate.ts`) là hàm thuần túy. Diễn đạt thành lời qua `Narrator` (`shared/engine/narrate.ts`) với khả năng mở rộng để cắm LLM mà không làm lệch số học.
2. **Trải Nghiệm "Không Dữ Liệu" Tuyệt Vời:** Engine xử lý trơn tru khi user chưa nhập gì (`overview.ts` với `empty`). Câu chào `greeting.empty` luôn mời gọi thân thiện.
3. **Khung Đánh Giá An Tâm Cụ Thể, Minh Bạch:** 100 điểm với 4 yếu tố: Quỹ dự phòng (30), Mục tiêu (30), Rủi ro phù hợp (20), Dòng tiền (20).

**Những Khoảng Trống Lớn Nhất:**
1. **JOB 04 EARN hoàn toàn vắng mặt** — Không có tính năng nào về earning capacity, skill building.
2. **Privacy claim vs reality** — UI nói "mã hóa dữ liệu" nhưng toggle là placebo.
3. **AI Wrapper Risk** — `analysis.ts` hardcode text thay vì dùng Narrator interface.

---

## 2. Product Thesis

**Thesis diễn đạt lại theo ngôn ngữ người bình thường:**

*"An tâm trong tài chính cá nhân không chỉ đến từ việc đầu tư tốt hơn. Nó đến từ một chuỗi vững chắc: Bắt đầu từ việc sử dụng THỜI GIAN (TIME) để trau dồi NĂNG LỰC (CAPABILITY), từ đó tạo ra THU NHẬP (INCOME). Thu nhập cần được giữ lại một phần làm TIẾT KIỆM (SAVINGS) để xây dựng lớp BẢO VỆ (SAFETY). Khi đã an toàn, phần dư thừa chuyển hóa thành TÀI SẢN (ASSETS) để sinh lời dài hạn, và cuối cùng mang lại TỰ DO (FREEDOM)."*

**Đối chiếu lý tưởng vs. Thực tế:**

| Thành tố | Thực tế trong Code | Đánh giá |
|---|---|---|
| **TIME → CAPABILITY** | Vắng mặt hoàn toàn | ❌ Khoảng trống lớn |
| **INCOME** | Có biến `monthlyIncome` nhưng không bóc tách hay tư vấn tăng thu | ⚠️ Rất cơ bản |
| **SAVINGS** | `savingsCapacity`, `freeCashflow` tính kỹ, chiếm 20/100 điểm | ✅ Hoàn thiện |
| **SAFETY** | Quỹ dự phòng ưu tiên cao nhất (30/100 điểm), kịch bản rủi ro đo lường cụ thể | ✅ Rất tốt |
| **ASSETS** | Đo lường `riskyShare` vs `recommendedRiskyShare`, cảnh báo `volatile_share` | ✅ Bài bản |
| **FREEDOM** | Đại diện qua "Mục tiêu cuộc sống" với `goalProbability` (30/100 điểm) | ✅ Hoàn thiện |

**Kết luận:** Sản phẩm tập trung cực kỳ tốt ở phần "đuôi" (SAVINGS → FREEDOM) — phù hợp persona **Stabilizing (30-40)** và **Growing Wealth (40+)**. Nhóm **Starting (18-24)** và **Building (23-30)** thiếu công cụ hỗ trợ trực tiếp.

---

## 3. Existing Product Map

### Routes & Screens
| Route | Screen | Engine | Completeness |
|---|---|---|---|
| `/` | Tổng quan | overview, peace, goals, simulate | 5/5 |
| `/thu-chi` | Sổ thu chi | ledger | 5/5 |
| `/muc-tieu` | Mục tiêu cuộc sống | goals, analysis | 5/5 |
| `/mo-phong` | Mô phỏng tương lai | simulate, analysis | 4.5/5 |
| `/mo-phong/ket-qua/:id` | Kết quả mô phỏng | simulate, analysis, plan | 4.5/5 |
| `/thoi-quen` | Kiểm tra thói quen | analysis (habits) | 4/5 |
| `/danh-muc` | Danh mục đầu tư | portfolio, analysis | 4.5/5 |
| `/ke-hoach` | Kế hoạch an toàn | plan | 4/5 |
| `/ai-theo-doi` | AI theo dõi | alerts, events | 4/5 |
| `/cong-dong` | Bài học cộng đồng | lessons (seed) | 4/5 |
| `/cai-dat` | Cài đặt | settings, profile | 4/5 |
| `/bat-dau` | Onboarding | onboarding, peace | 5/5 |

### Engines (shared/engine/)
`month.ts` · `portfolio.ts` · `goals.ts` · `peace.ts` · `simulate.ts` · `alerts.ts` · `narrate.ts` · `overview.ts` · `plan.ts` · `analysis.ts` · `ledger.ts`

### Storage (D1 — 18 tables)
`users` · `sessions` · `financial_profiles` · `holdings` · `net_worth_snapshots` · `goals` · `transactions` · `simulation_presets` · `simulation_runs` · `habit_scenarios` · `habit_answers` · `safety_plans` · `plan_tasks` · `ai_events` · `ai_alerts` · `lessons` · `user_settings`

---

## 4. User Need Map

| Feature | JOB | Need Fulfilled | Journey Phase |
|---|---|---|---|
| Tổng quan | JOB 01 (KNOW) | "Tình hình đang ổn hay không" qua Điểm An Tâm + KPIs | UNDERSTAND |
| Sổ thu chi | JOB 02 (SPEND), JOB 03 (SAVE) | "Tiêu tiền không như kế toán", khoảng cách Thu-Chi | CONTROL |
| Mục tiêu | JOB 03 (SAVE), JOB 07 (LIVE) | Biến tiền thành công cụ sống (mua nhà, nghỉ hưu) | CONTROL, LIVE |
| Kế hoạch an toàn | JOB 06 (PREPARE) | Biến lo âu thành hành động: checklist cụ thể | PROTECT |
| Mô phỏng | JOB 06 (PREPARE) | Stress-test tương lai (thất nghiệp, market crash) | PREPARE |
| Thói quen | JOB 05 (INVEST) | Trắc nghiệm risk tolerance thực tế | PROTECT, GROW |
| Danh mục | JOB 05 (INVEST) | "Phân bổ thế nào?" — theo dõi rủi ro tập trung | INVEST, GROW |
| AI Theo dõi | JOB 01, JOB 06 | "Quản gia" cảnh báo khi mục tiêu chậm/rủi ro cao | UNDERSTAND, PREPARE |
| Cộng đồng | JOB 07 (LIVE) | Học hỏi kiến thức, kinh nghiệm thực tế | GROW, LIVE |
| **❌ EARN** | **JOB 04** | **MISSING — Không có tính năng tăng thu nhập** | **—** |

---

## 5. Screen-by-Screen Audit

### 5.1 Tổng quan (`/`)
- **FILES:** `OverviewPage.tsx`, `overview.ts`, `peace.ts`, `narrate.ts`
- **COMPLETENESS:** 5/5 — Demo-ready
- **USER QUESTION:** "Tôi đang ở đâu? Tiền có ổn không?"
- **SO WHAT:** Biết mức an tâm, nhận gợi ý mô phỏng rủi ro, biết cần nhập thêm gì
- **HUMAN-CENTRIC:** ✅ Ngôn ngữ thân thiện, PeaceBreakdown minh bạch, SetupCard gợi ý nhập liệu
- **VALUE:** REDUCE UNCERTAINTY / MAKE BETTER DECISION
- **AI ROLE:** UNDERSTAND, SUMMARIZE, SIMULATE (tip hôm nay)

### 5.2 Sổ thu chi (`/thu-chi`)
- **FILES:** `LedgerPage.tsx`, `ledger.ts`, `categoryIcons.ts`
- **COMPLETENESS:** 5/5 — Demo-ready
- **USER QUESTION:** "Tháng này tiêu bao nhiêu? Ghi khoản mới nhanh nhất?"
- **SO WHAT:** Biết tiền đi đâu, hiểu AI lấy số liệu từ đâu
- **HUMAN-CENTRIC:** ✅ MoneyInput chips nhập nhanh, giải thích nguồn dữ liệu AI dùng
- **VALUE:** BUILD HABIT / REDUCE UNCERTAINTY

### 5.3 Mục tiêu (`/muc-tieu`)
- **FILES:** `GoalsPage.tsx`, `GoalFormModal.tsx`, `goals.ts`
- **COMPLETENESS:** 5/5 — Demo-ready
- **USER QUESTION:** "Bao giờ đạt mục tiêu? Cần để dành bao nhiêu/tháng?"
- **SO WHAT:** Biết kế hoạch có khả thi không, cần điều chỉnh gì
- **VALUE:** MAKE BETTER DECISION / REDUCE UNCERTAINTY
- **AI ROLE:** PLAN, SIMULATE, COACH (xác suất đạt mục tiêu tự động)

### 5.4 Onboarding (`/bat-dau`)
- **FILES:** `OnboardingPage.tsx`, `onboarding.ts`
- **COMPLETENESS:** 5/5 — Demo-ready
- **USER QUESTION:** "App cần gì của tôi? Mất bao lâu?"
- **SO WHAT:** Thấy giá trị ngay lập tức (Aha! moment = Điểm an tâm + cảnh báo đầu tiên)
- **HUMAN-CENTRIC:** ✅ 3 bước có thể skip, chips nhập nhanh, templates mục tiêu

### 5.5 Mô phỏng (`/mo-phong`)
- **FILES:** `SimulationPage.tsx`, `simulate.ts`
- **COMPLETENESS:** 4.5/5
- **USER QUESTION:** "Nếu thị trường sập 20%, tôi có mất nhà không?"
- **SO WHAT:** Hình dung rõ sự tàn phá của rủi ro, bỏ tâm lý chủ quan
- **HUMAN-CENTRIC:** ✅ 5 sliders + presets, biểu đồ cập nhật tức thời, NeedData fallback
- **VALUE:** REDUCE RISK / ANTICIPATION

### 5.6 Kết quả mô phỏng (`/mo-phong/ket-qua/:runId`)
- **FILES:** `SimulationResultPage.tsx`, `analysis.ts`
- **COMPLETENESS:** 4.5/5
- **USER QUESTION:** "Hậu quả xấu nhất là gì? Làm sao sửa?"
- **SO WHAT:** Biến sự lo lắng thành động lực hành động, không chỉ hù dọa mà đưa phao cứu sinh
- **VALUE:** MAKE BETTER DECISION

### 5.7 Kiểm tra thói quen (`/thoi-quen`)
- **FILES:** `HabitsPage.tsx`, `analysis.ts` (habitsProfile)
- **COMPLETENESS:** 4/5
- **USER QUESTION:** "Thật sự tôi có phải người thích rủi ro không?"
- **SO WHAT:** Dập tắt ảo tưởng về khả năng chịu đựng, xây danh mục chuẩn xác hơn
- **HUMAN-CENTRIC:** ✅ ScoreRing self vs actual, AI boundary card, Behavioral Finance unique
- **VALUE:** PSYCHOLOGICAL REFLECTION / SELF-AWARENESS

### 5.8 Danh mục đầu tư (`/danh-muc`)
- **FILES:** `PortfolioPage.tsx`, `HoldingFormModal.tsx`, `portfolio.ts`
- **COMPLETENESS:** 4.5/5
- **USER QUESTION:** "Tiền có an toàn không? Có dồn hết trứng vào một rổ?"
- **SO WHAT:** Hiểu bức tranh tổng thể tài sản mà không cần đọc nến/phân tích kỹ thuật
- **VALUE:** PORTFOLIO VISIBILITY / DIVERSIFICATION CHECK

### 5.9 Kế hoạch an toàn (`/ke-hoach`)
- **FILES:** `SafetyPlanPage.tsx`, `plan.ts`
- **COMPLETENESS:** 4/5
- **USER QUESTION:** "Nên ưu tiên làm gì để an toàn hơn?"
- **SO WHAT:** Hiểu rằng giảm rủi ro (dù giảm lợi nhuận) tăng xác suất đạt mục tiêu
- **VALUE:** REDUCE RISK / BUILD DISCIPLINE

### 5.10 AI theo dõi (`/ai-theo-doi`)
- **FILES:** `AiMonitorPage.tsx`, `alerts.ts`, `monitor.ts`
- **COMPLETENESS:** 4/5
- **USER QUESTION:** "Có vấn đề gì tôi chưa nhận ra không?"
- **SO WHAT:** Không cần tự soi — app đóng vai "gác cổng" tự động
- **HUMAN-CENTRIC:** ✅ "AI sẽ không làm gì" (không mua bán, không bán data), rules minh bạch

### 5.11 Cộng đồng (`/cong-dong`)
- **FILES:** `CommunityPage.tsx`, `lessons.ts`
- **COMPLETENESS:** 4/5
- **USER QUESTION:** "Người khác quản lý tài chính thế nào?"
- **SO WHAT:** Nội dung chắt lọc, bite-sized, gần gũi
- **REQUIRED ACTION:** REFINE — Cần recommend bài học theo tình trạng tài chính cá nhân

### 5.12 Cài đặt (`/cai-dat`)
- **FILES:** `SettingsPage.tsx`, `AccountCards.tsx`
- **COMPLETENESS:** 4/5
- **HUMAN-CENTRIC:** ✅ "Tiền của bạn là chuyện riêng của bạn", export/delete hoàn chỉnh
- **⚠️ ISSUE:** Toggle "Mã hóa dữ liệu" là placebo

### 5.13 Auth (`/dang-nhap`, `/dang-ky`)
- **FILES:** `LoginPage.tsx`, `RegisterPage.tsx`, `fields.tsx`
- **COMPLETENESS:** 4/5
- **HUMAN-CENTRIC:** ✅ Hỏi xưng hô (anh/chị/bạn) ngay từ đầu → cá nhân hóa toàn bộ app

---

## 6. Human-Centric Audit

**Kết quả: 10/10 tiêu chí ĐẠT** cho toàn bộ sản phẩm.

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Bắt đầu từ nhu cầu con người | ✅ "Kế hoạch có ổn không?" thay vì "Risk tolerance?" |
| 2 | Ngôn ngữ tự nhiên | ✅ "Tiền đang nằm ở đâu?", "Rủi ro tập trung ở đâu?" |
| 3 | Không phán xét | ✅ "Bạn không cần đoán tương lai. Hãy thử trước..." |
| 4 | Không quá tải số liệu | ✅ Tối đa 4 KPIs, DonutChart, ProgressBar |
| 5 | Giải thích tại sao | ✅ PeaceBreakdown, AiExplainCard |
| 6 | Next action rõ ràng | ✅ Mọi gợi ý có nút Action |
| 7 | Phù hợp người không biết tài chính | ✅ Monte Carlo → "Khả năng đạt đúng hạn" |
| 8 | Phù hợp màn hình nhỏ | ✅ Responsive grid, drawer sidebar |
| 9 | Cognitive load thấp | ✅ Card-based, icon + màu báo hiệu |
| 10 | HEADLINE/INSIGHT/WHY/ACTION/IMPACT | ✅ PageHero + widget pattern |

---

## 7. AI Role Audit

### AI Role Map

| Use Case | Deterministic Engine | AI Task | Wrapper Risk |
|---|---|---|---|
| Dashboard + Điểm an tâm | `peaceScore` (4 trọng số) | PERSONALIZE / EXPLAIN (Narrator) | Thấp ✅ |
| Cảnh báo | `evaluateAlerts` (3 luật) | SUPPORT (notification chủ động) | Thấp ✅ |
| Phân tích Mục tiêu | Normal CDF, điểm hòa vốn | EXPLAIN / PLAN | **Cao ⚠️** — hardcode text trong `analysis.ts` |
| Mô phỏng rủi ro | `simulate` + `MARKET_BETA` | SIMULATE / PLAN | **Cao ⚠️** — hardcode text trong `analysis.ts` |
| Thói quen | Score gap calculation | COACH / COMPARE | **Cao ⚠️** — dùng "bạn" thay vì salutation |
| Danh mục | Tỷ trọng, concentration risk | EXPLAIN | **Cao ⚠️** — hardcode text |

**Kết luận:** Engine làm đúng tôn chỉ "Code handles truth". Tuy nhiên `analysis.ts` **không sử dụng Narrator interface**, hardcode tiếng Việt trực tiếp — cần refactor.

---

## 8. Financial Engine Audit

| Module | Đánh giá | Chi tiết |
|---|---|---|
| `peace.ts` | ✅ Logic, human-centric | 100 điểm, 4 yếu tố hợp lý. savings rate 50% là max 20 điểm |
| `goals.ts` | ✅ Chuẩn xác | Normal CDF + `BASE_UNCERTAINTY` (0.02) + `CONTRIBUTION_DAMPING` (0.4) |
| `simulate.ts` | ✅ Hợp lý | `MARKET_BETA` (stock 1, fund 0.8, bond 0.1), `BOND_DURATION = 4` |
| `plan.ts` | ✅ Actionable | `SHIFT_SHARE = 0.1` nhẹ nhàng, không gây sợ. Extra cap 3 triệu/tháng |
| `portfolio.ts` | ✅ Chuẩn VN | Stock 11%/22%, Fund 9%/14%, Bond 6.5%/4%. Diversification 0.85 |
| `alerts.ts` | ✅ Không spam | Trễ 6 tháng mới báo, lệch 5% mới cảnh báo |
| `ledger.ts` | ✅ Thông minh | TB 3 tháng sổ → nền → tháng hiện tại → 0. Cân bằng tự động vs tay |
| `overview.ts` | ✅ Hook tốt | `TIP_SHOCK` (-20%) tạo hook actionable ngay dashboard |

**Investment Flow:** ✅ Đúng trật tự: Thu nhập → Chi tiêu → Safety buffer → Available capital → Risk capacity → Scenario → Plan.

---

## 9. Privacy Audit

| Khía cạnh | Thực tế | Đánh giá |
|---|---|---|
| Dữ liệu local | Không lưu client-side, session ở cookie HttpOnly | ✅ |
| Dữ liệu server | D1: `financial_profiles`, `holdings`, `goals`, `transactions` | ✅ |
| Gửi AI Provider | Không gọi LLM bên ngoài, 100% rule-based | ✅ Tuyệt đối an toàn |
| Delete/Export | `GET /me/export` (11 bảng), `DELETE /me` (cascade) | ✅ Hoàn thiện |
| **⚠️ Privacy claim** | "Mã hóa dữ liệu" toggle là **placebo** — D1 không encrypt at-rest | ❌ Cần sửa |

---

## 10. Content & Language Audit

**Nhìn chung: Completeness 4-5/5** — Sự phức tạp đã được "nhốt" bên trong.

**Thuật ngữ cần làm mềm:**
| Hiện tại | Đề xuất |
|---|---|
| "Mức biến động" (Volatility) | "Mức độ lên xuống giá" |
| "Lãi suất thay đổi" | "Ngân hàng thay đổi lãi suất" |
| "Tỷ trọng tài sản biến động cao" | "Tài sản có rủi ro cao đang chiếm phần quá lớn" |

**Narrate.ts:** Ngôn ngữ gần gũi, hỗ trợ `{em:...}` highlight, xưng hô cá nhân hóa.
**Format:** `formatVnd` cực kỳ thân thiện (1,24 tỷ / 850 nghìn / +18 triệu).

---

## 11. China/Shenzhen Readiness

| Tiêu chí | Đánh giá |
|---|---|
| Mobile-first | ✅ Responsive Tailwind, touch-friendly |
| Fast onboarding | ✅ 3 bước, có skip |
| Low typing | ✅ MoneyInput chips, Select, Segmented |
| High visual feedback | ✅ Pixel Art, ScoreRing, badges |
| Action-oriented | ✅ CTA rõ ràng mỗi màn |
| **Hardcode VND** | ❌ `formatVnd` cố định đ/nghìn/triệu/tỷ |
| **Hardcode tiếng Việt** | ❌ Mọi label, lỗi, template hardcode |

**Kết luận:** UX đạt tầm quốc tế nhưng codebase bị "khóa chặt" vào thị trường Việt Nam.

---

## 12. Five User Journeys

### Journey 1 — Sinh viên 21 tuổi
- ✅ Onboarding skip tài sản, ghi thu chi part-time
- ❌ **ĐỨT** ở EARN — không có skill tracking, tăng thu nhập

### Journey 2 — Nhân viên 25 tuổi
- ✅ Onboarding có template "Quỹ dự phòng", cảnh báo `emergency_low` hoạt động

### Journey 3 — Người 29 tuổi mua nhà
- ✅ Template "Mua nhà" 5 năm, `TIP_SHOCK` mô phỏng rủi ro ngay dashboard

### Journey 4 — Người 35 tuổi có gia đình
- ✅ Phân bổ tài sản + cảnh báo `volatile_share` hoàn thiện

### Journey 5 — Người bận rộn có tiền
- ✅ Cron job `runMonitor` + `afterChange` tự động phân tích không cần user chủ động

---

## 13. Daily Use Loop

**Loops đã có (hoạt động):**
- ✅ **Thu chi:** Ghi khoản → `afterChange` → cập nhật dòng tiền + peaceScore + ai_events → toast phản hồi
- ✅ **Đầu tư & Rủi ro:** Đổi danh mục → engine chạy → `syncAlerts` → badge cảnh báo

**Loops thiếu:**
- ❌ **Earning Capacity:** Không có "giờ học → tiến độ nghề nghiệp → earning capacity"
- ❌ **Gamification vô nghĩa:** KHÔNG — ScoreRing 100 điểm gắn với engine tất định, có diễn giải minh bạch

---

## 14. Missing Pieces

### P0 — BROKEN FLOW / MISSING USER VALUE
1. **Module EARN hoàn toàn vắng mặt** — Journey sinh viên/người mới đi làm đứt gãy
2. **AI Wrapper Risk** — `analysis.ts` hardcode text, không dùng Narrator interface
3. **Privacy claim placebo** — Toggle "Mã hóa dữ liệu" không có logic underlying

### P1 — UNCLEAR CONTENT / BAD UX
4. **Thuật ngữ khô cứng** — "Biến động cao", "Lãi suất thay đổi" cần làm mềm
5. **Lỗi Salutation** — `analysis.ts` gọi "bạn" bất kể user chọn "anh"/"chị"
6. **Community chưa cá nhân hóa** — Hiển thị chung, không recommend theo tình trạng

### P2 — NEW FEATURE / VISUAL POLISH
7. **Onboarding cho người mới bắt đầu** — Thiếu path "Tôi mới bắt đầu" bypass tài sản
8. **Hành trình LIVE chưa rõ** — Chưa thấy tiêu tiền để "sống tốt hơn"
9. **Hardcode VND** — Khó mở rộng quốc tế
10. **Pixel art 13/18 scene chưa xong** — Ảnh hưởng polish

---

## 15. Demo Flow (3-5 phút)

**Kịch bản: "Linh, 24 tuổi, vừa bắt đầu đi làm"**

1. **Khởi đầu** — Nhập thu nhập, chọn "Quỹ dự phòng" → Peace Score hiện ngay *(✅ Chạy mượt)*
2. **Theo dõi dòng tiền** — Ghi vài khoản chi → AI cập nhật mức an tâm tức thời *(✅ afterChange)*
3. **Phát triển bản thân** — Muốn học thêm kỹ năng để tăng lương *(❌ BỊ ĐỨT — thiếu EARN)*
4. **Vượt qua biến cố** — Thử "Năm khó khăn" → thấy quỹ dự phòng vẫn an toàn *(✅ TipCard + preset)*

**Demo khả thi 80%.** Tránh demo sâu vào EARN, tập trung vào tiết kiệm + vượt khủng hoảng.

---

## 16-17. Recommended Top 10 Changes

| # | Vấn đề | Impact | Effort | File(s) | Thay đổi |
|---|---|---|---|---|---|
| 1 | AI Wrapper Risk — hardcode text | High | M | `analysis.ts`, `narrate.ts` | Đưa strings vào TEMPLATES, gọi `narrate()` |
| 2 | Lỗi xưng hô (Salutation) | Medium | S | `analysis.ts` | Truyền `state.salutation`, thay "bạn" → `{s}` |
| 3 | Privacy claim placebo | High | L | `SettingsPage.tsx`, API/DB | Triển khai encryption hoặc gỡ claim sai |
| 4 | Bổ sung Module EARN | High | L | `router.tsx`, `features/earn/*` | Thêm skill tracking, lộ trình tăng thu nhập |
| 5 | Làm mềm thuật ngữ | Medium | S | `PortfolioPage.tsx`, `narrate.ts` | "Biến động" → "Dễ thay đổi giá" |
| 6 | Cá nhân hóa Community | Medium | M | `CommunityPage.tsx` | Map Peace Score → recommend bài |
| 7 | Onboarding cho Starting persona | High | S | `OnboardingPage.tsx` | Thêm "Tôi mới bắt đầu" bypass tài sản |
| 8 | Tách hardcode VND | Low | S | `shared/format.ts` | Locale formatting + config currency |
| 9 | Hành trình LIVE | Medium | M | `LedgerPage.tsx` | Tag "Chi tiêu niềm vui" sau đạt mục tiêu |
| 10 | Sửa UI cho Starting/Building | High | M | `OverviewPage.tsx` | Net worth thấp → focus "Xây thói quen" |
