# Kiểm tra code theo từng trang giao diện

> File này cho dev biết: app có bao nhiêu trang, mỗi trang đang làm được gì (đã đối chiếu code ngày 27/09/2026), còn thiếu gì so với [ba.md](specs/ba.md), phải sửa gì và hạn nào theo [project-timeline.md](project-timeline.md).
> Danh sách trang lấy từ `client/src/app/router.tsx`. Mọi tên hàm trong file này đều có thật trong repo.

## 0. Redesign mapping (kế hoạch duyệt 27/09/2026) 📐

Kế hoạch redesign theo 9 mockup thay phần "Cần làm / Hạn" của mục 1–2 ở những chỗ khác nhau. Mục 1–2 được giữ làm **hiện trạng code ngày 27/09** (phần "Đang có" vẫn đúng); dòng nào đã lỗi thời được ghi chú ⚠️. Đặc tả từng màn: [specs/redesign-ui.md](specs/redesign-ui.md), lịch: [project-timeline.md](project-timeline.md).

| Trang cũ | Route cũ | Trang mới / route mới | Việc | Wave · hạn | Trạng thái |
|---|---|---|---|:-:|:-:|
| Tổng quan | `/` | Tổng quan `/` | Dựng lại theo mockup 1; `GET /api/overview` mở rộng | 3 · 12/10 | 📐 |
| Sổ thu chi | `/thu-chi` | Sổ thu chi `/thu-chi` | Ngân sách, hóa đơn, chia đều + VietQR, combo chart, tab Thói quen | 1 · 03/10 | 📐 |
| Mục tiêu | `/muc-tieu` | **Quỹ an toàn** `/quy-an-toan` (redirect) | Mục tiêu tiết kiệm gộp vào Quỹ an toàn | 1 · 03/10 | 📐 |
| Kế hoạch an toàn | `/ke-hoach` | **Quỹ an toàn** `/quy-an-toan` (redirect) | SafetyPlanPage gộp; `safety.ts` | 1 · 03/10 | 📐 |
| Tăng thu nhập | `/tang-thu-nhap` | Tăng thu nhập `/tang-thu-nhap` | B2 `humanCapital.ts`, kế hoạch học tuần, cơ hội/việc làm | 1 · 03/10 | 📐 |
| Danh mục | `/danh-muc` | Danh mục `/danh-muc` | B4 `concentration.ts`, what-if, cổ phiếu công ty | 1 · 03/10 | 📐 |
| Thói quen | `/thoi-quen` | Tab trong Sổ thu chi `/thu-chi?tab=thoi-quen` (redirect) | Dời HabitsPage | 1 · 03/10 | 📐 |
| AI theo dõi | `/ai-theo-doi` | **Nhật ký AI** `/nhat-ky-ai` (redirect) | AiMonitorPage gộp; bảng audit, quyền riêng tư, tích hợp, tình trạng hệ thống | 3 · 12/10 | 📐 |
| Mô phỏng + Kết quả | `/mo-phong`, `/mo-phong/ket-qua/:runId` | giữ | Chỉ đổi shell + UI kit | 5 · 16/10 | 📐 |
| Cài đặt | `/cai-dat` | giữ | Chỉ đổi shell + UI kit | 5 · 16/10 | 📐 |
| Cộng đồng (Học tài chính) | `/cong-dong` | giữ route, bỏ khỏi sidebar | Lối vào từ thẻ promo cuối sidebar | 5 · 16/10 | 📐 |
| Đăng nhập / Đăng ký / Khởi đầu | `/dang-nhap`, `/dang-ky`, `/bat-dau` | giữ | Không thuộc phạm vi redesign | — | ✅ |
| *(Hỏi An Tâm — dự kiến cũ)* | `/hoi-an-tam` | **AI Workspace** `/ai-workspace` | Thay hoàn toàn: 5 agent, chat, timeline, phê duyệt | 3 · 12/10 | 📐 |

**Trang mới:** Quỹ an toàn `/quy-an-toan` · Lịch AI `/lich-ai` (Wave 2 · 07/10) · Mục tiêu & Lựa chọn `/lua-chon` (B1, Wave 2 · 07/10) · AI Workspace `/ai-workspace` (Wave 3 · 12/10) · Nhật ký AI `/nhat-ky-ai` (Wave 3 · 12/10). Shell mới (sidebar 11 mục, topbar, redirect) ở Wave 0 · 29/09.

**Phát hiện cũ đã lỗi thời hoặc đổi hướng:**
- Trang "Hỏi An Tâm" `/hoi-an-tam` và API `POST /api/agent/consult`, `/confirm` → thay bằng AI Workspace, `POST /api/agent/runs`, `/approve` ([specs/ba.md](specs/ba.md) §10).
- API `/api/life-options/*`, `/api/career-overlap/*` → `/api/life-choices/*`, `/api/portfolio/risk`, `/api/portfolio/what-if`.
- "Tab Nhật ký kiểm toán trong AI theo dõi" → trang riêng Nhật ký AI.
- "Ghi `audit_log` cho từng route thu chi/mục tiêu" (hạn 03/10) → nền `worker/lib/audit.ts` ở Wave 0; mỗi agent Wave 1–3 tự gắn cho route mình sở hữu.
- Số tháng an toàn (bản mới), B3, giới hạn số lần thử đăng nhập, bước "Công việc của bạn" ở Khởi đầu → **chưa xếp wave** (xem [project-timeline.md](project-timeline.md)).
- Kiểm tra 320 / 768 / 1280 → nay 1440 / 1024 / 768 / 390.

## 1. Bảng tổng

> ⚠️ Bảng này là kế hoạch trước redesign (27/09). Cột "Việc cần làm / Hạn" đã được thay bởi mục 0 ở những dòng có trang gộp hoặc trang mới.

**Hiện có 15 trang. Cần thêm 2 trang mới và 1 tab.**

| # | Trang | Route | Bậc | Việc cần làm | Hạn |
|:-:|---|---|:-:|---|:-:|
| 1 | Đăng nhập / Đăng ký | `/dang-nhap`, `/dang-ky` | — | Giới hạn số lần thử | 13/10 |
| 2 | Khởi đầu | `/bat-dau` | 1 | Thêm nghề (mã ISCO), ngành, năm sinh | 08/10 |
| 3 | Tổng quan | `/` | 1–5 | Thêm Số tháng an toàn (bản mới), thẻ "số lựa chọn đã mở khóa", ô "Hỏi An Tâm" | 10/10 |
| 4 | Sổ thu chi | `/thu-chi` | 1 | Ghi nhật ký kiểm toán | 03/10 |
| 5 | Tăng thu nhập | `/tang-thu-nhap` | 3 | **B2**: vốn con người, mức phơi nhiễm AI | 08/10 |
| 6 | Mục tiêu | `/muc-tieu` | 2, 5 | Ghi nhật ký; liên kết sang Lựa chọn cuộc đời | 10/10 |
| 7 | Mô phỏng | `/mo-phong` | 2 | Số tháng an toàn (bản mới); **B3** kịch bản khủng hoảng | 05/10, 13/10 |
| 8 | Kết quả mô phỏng | `/mo-phong/ket-qua/:runId` | 2 | P10/P50/P90, nút (i), **B3** khoảng cách hành vi | 12/10 |
| 9 | Thói quen | `/thoi-quen` | 4 | Nối kết quả sang mô phỏng (**B3**) | 12/10 |
| 10 | Danh mục | `/danh-muc` | 4 | **B4**: chỉ số tập trung, thử trước khi xuống tiền, cổ phiếu thưởng | 07/10 |
| 11 | Kế hoạch an toàn | `/ke-hoach` | 2 | Mã chống trùng + nhật ký khi áp dụng | 03/10 |
| 12 | AI theo dõi | `/ai-theo-doi` | — | Sửa giờ giá trị = 0; **tab mới "Nhật ký kiểm toán"** | 03/10 |
| 13 | Cộng đồng | `/cong-dong` | 5 | Giữ nguyên | — |
| 14 | Cài đặt | `/cai-dat` | — | Giữ nguyên | — |
| **15** | **Hỏi An Tâm (mới)** | `/hoi-an-tam` | 1–5 | Ô hỏi, các bước AI đã làm, màn xác nhận | 10/10 |
| **16** | **Lựa chọn cuộc đời (mới)** | `/lua-chon` | 5 | **B1**: 3–5 lựa chọn, kết luận, điều kiện mở khóa | 10/10 |

> Đăng nhập và Đăng ký là 2 route nhưng gộp 1 dòng; tổng cộng 15 route hiện có + 2 route mới.

## 2. Chi tiết từng trang

Mỗi trang theo cùng một khuôn: **Đang có** (đã kiểm với code) · **Thiếu so với BA** · **Cần làm** · **Hạn**.

### 1. Đăng nhập / Đăng ký — `/dang-nhap`, `/dang-ky`
- **File:** `features/auth/LoginPage.tsx`, `RegisterPage.tsx`, `worker/routes/auth.ts`, `worker/lib/password.ts`, `worker/lib/session.ts`
- **Đang có:** đăng ký, đăng nhập, đăng xuất; mật khẩu băm PBKDF2-SHA256 100.000 vòng; phiên lưu cookie `httpOnly`, `SameSite=Lax`.
- **Thiếu:** giới hạn số lần thử đăng nhập.
- **Cần làm:** Cloudflare Rate Limiting cho `/api/auth/login`; test trả 429.
- **Hạn:** 13/10.

### 2. Khởi đầu — `/bat-dau`
- **File:** `features/onboarding/OnboardingPage.tsx`, `worker/routes/onboarding.ts`
- **Đang có:** chọn 1 trong 4 giai đoạn (`starting`, `building`, `preparing`, `investing`, lưu vào `users.life_stage`); nhập hồ sơ tài chính, tài sản, mục tiêu — mỗi bước bỏ qua được; nhóm "mới bắt đầu" chỉ đi 2 bước. Không bắt nhập chứng khoán hay liên kết ngân hàng → phục vụ được người chưa có tài sản.
- **Thiếu:** chưa hỏi nghề theo danh sách chuẩn, ngành, năm sinh, tuổi nghỉ hưu — B2 và B4 cần.
- **Cần làm:** thêm 1 bước ngắn "Công việc của bạn": chọn nghề (→ `isco_code`), ngành (→ `sector`), năm sinh. Giữ khởi đầu ≤ 30 giây.
- **Hạn:** 08/10.

### 3. Tổng quan — `/`
- **File:** `features/overview/OverviewPage.tsx`, `NbaSection.tsx`, `shared/engine/overview.ts` (`buildOverview`), `peace.ts` (`peaceScore`), `nba.ts` (`nextBestActions`)
- **Đang có:** Điểm An Tâm 0–100 với 4 phần: quỹ dự phòng 30, khả năng đạt mục tiêu 30, mức rủi ro phù hợp 20, tỷ lệ để dành 20; mức Ổn định / Cần chú ý / Cần hành động; khối "Việc nên làm tiếp"; minh họa pixel art.
- **Thiếu:** Số tháng an toàn có trừ hao và khoảng dao động; con số bậc 5; lối vào "Hỏi An Tâm".
- **Cần làm:** thẻ "Nếu mất việc, bạn trụ được ~X tháng (xấu Y · thuận lợi Z)"; thẻ "Đã mở khóa x/5 lựa chọn cuộc đời" → `/lua-chon`; ô hỏi nhanh → `/hoi-an-tam`.
- **Hạn:** 10/10.

### 4. Sổ thu chi — `/thu-chi`
- **File:** `features/ledger/LedgerPage.tsx`, `shared/engine/ledger.ts`, `spending.ts` (`spendingSummary`), `worker/routes/transactions.ts`
- **Đang có:** thêm/sửa/xóa thu chi theo danh mục; gắn nhãn cảm nhận cho khoản chi (Thiết yếu, Hữu ích, Niềm vui, Phát triển, Không đáng); tóm tắt theo nhãn. Mỗi thay đổi chạy `afterChange` (`worker/lib/refresh.ts`) để cập nhật điểm và cảnh báo.
- **Thiếu:** nhật ký kiểm toán cho thay đổi.
- **Cần làm:** ghi `audit_log` trong POST/PATCH/DELETE `/api/transactions`. Không thêm nhập bằng giọng nói hay LLM ở trang này (ngoài phạm vi).
- **Hạn:** 03/10.

### 5. Tăng thu nhập — `/tang-thu-nhap`
- **File:** `features/earn/EarnPage.tsx`, `shared/engine/earn.ts`, `worker/routes/earn.ts`
- **Đang có:** hồ sơ thu nhập (thu nhập hiện tại, mục tiêu, số tháng, nghề dạng chữ tự do, giờ/tuần, kỹ năng muốn học); `incomeGrowthPlan` in **gợi ý mẫu** theo tổng số giờ; `financialConnection` (thu nhập tăng thì mục tiêu đến sớm bao lâu); giờ giá trị kế hoạch/thực tế (`valueHoursSummary`); phân bổ 168 giờ/tuần (`timeAllocationInsight`).
- **Thiếu:** chưa tính giá trị vốn con người; chưa đo rủi ro nghề; giờ học chưa quy ra giá trị. Tài liệu cũ ghi "tính giá trị 1 giờ, ROI học tập" — **code không có**.
- **Cần làm:** **B2** — thẻ "Giá trị nghề của bạn" (HC, mức phơi nhiễm AI theo ILO, ghi rõ ước tính); đổi `incomeGrowthPlan` thành phép tính "giờ học → giá trị tăng thêm". Chi tiết: [breakthroughs.md](specs/breakthroughs.md) §B2.
- **Hạn:** 08/10 (lõi), 13/10 (giờ học thành giá trị).

### 6. Mục tiêu — `/muc-tieu`
- **File:** `features/goals/GoalsPage.tsx`, `GoalFormModal.tsx`, `shared/engine/goals.ts`, `analysis.ts` (`goalsSummary`)
- **Đang có:** thẻ mục tiêu (nhà, học, nghỉ hưu, dự phòng, khác) với khả năng đạt đúng hạn (`goalProbability`, phân phối chuẩn), ngày dự kiến xong (`expectedCompletion`), số tiền cần để dành mỗi tháng (`requiredMonthly`), biểu đồ phân bổ.
- **Thiếu:** nhật ký kiểm toán; chưa nối với câu hỏi "kế hoạch lớn này có kham nổi không".
- **Cần làm:** ghi `audit_log`; trên mỗi mục tiêu lớn thêm nút "Thử như một lựa chọn cuộc đời" → `/lua-chon`.
- **Hạn:** 03/10 (nhật ký), 10/10 (liên kết).

### 7. Mô phỏng — `/mo-phong`
- **File:** `features/simulation/SimulationPage.tsx`, `shared/engine/simulate.ts` (`applyShock`, `simulate`), `worker/routes/simulations.ts`
- **Đang có:** 5 thanh trượt: thị trường giảm, lạm phát, mất thu nhập (tháng), lãi suất tăng, chi phí bất ngờ; kịch bản dựng sẵn từ `simulation_presets`; xem trước tức thì ở trình duyệt.
- **Thiếu:** hằng số ẩn `INCOME_PAUSE_COVERAGE = 0.5` (ngầm cho rằng gia đình gánh 50% chi tiêu khi mất việc); chưa có kịch bản khủng hoảng thật.
- **Cần làm:** thay bằng ô "Thu nhập còn lại khi mất việc" (mặc định 0); Số tháng an toàn có trừ hao ([ba.md](specs/ba.md) §5.1); **B3**: thêm 3 kịch bản 2008 / COVID 2020 / sa thải công nghệ 2022–23.
- **Hạn:** 05/10, 13/10 (kịch bản).

### 8. Kết quả mô phỏng — `/mo-phong/ket-qua/:runId`
- **File:** `features/simulation/SimulationResultPage.tsx`, `shared/engine/analysis.ts` (`simulationReport`)
- **Đang có:** trước và sau cú sốc: tài sản, quỹ dự phòng, mục tiêu bị lùi, điểm an tâm; lưu lượt chạy vào `simulation_runs`.
- **Thiếu:** khoảng dao động; nút "Cách tính"; khoảng cách hành vi.
- **Cần làm:** hiện P10/P50/P90 bằng lời (xấu / thường gặp / thuận lợi); nút (i) với công thức và giả định; **B3**: dòng "Nếu bạn bán tháo… mất thêm ¥X" khi điểm phản ứng < 6.
- **Hạn:** 10/10 (khoảng + nút i), 12/10 (B3).

### 9. Thói quen — `/thoi-quen`
- **File:** `features/habits/HabitsPage.tsx`, `shared/engine/analysis.ts` (`habitsProfile`), `worker/routes/habits.ts`
- **Đang có:** người dùng tự chấm khẩu vị rủi ro, rồi trả lời tình huống thực tế; so sánh tự đánh giá với phản ứng thực (`selfScore` vs `actualScore`); nhận xét về mức bình tĩnh và khoảng chênh.
- **Thiếu:** kết quả **không được dùng** ở mô phỏng hay kế hoạch.
- **Cần làm:** **B3** — chuyển `actualScore` sang mô phỏng; thêm gợi ý "đặt quy tắc tự bảo vệ" dưới dạng hành động chờ xác nhận.
- **Hạn:** 12/10.

### 10. Danh mục — `/danh-muc`
- **File:** `features/portfolio/PortfolioPage.tsx`, `HoldingFormModal.tsx`, `shared/engine/portfolio.ts`, `analysis.ts` (`portfolioAnalysis`)
- **Đang có:** phân bổ theo 5 loại tài sản (tiền mặt, quỹ, cổ phiếu, trái phiếu, khác); nhóm rủi ro do người dùng tự đặt (`risk_group`); tỷ trọng tài sản biến động so với mức khuyến nghị theo thời gian tới mục tiêu gần nhất; gợi ý điều chỉnh.
- **Thiếu:** chưa đối chiếu với nghề; chưa có "thử trước khi xuống tiền"; chưa đánh dấu cổ phiếu công ty mình làm.
- **Cần làm:** **B4** — thẻ "X% tổng tài sản (tính cả công việc) phụ thuộc ngành Y"; form "Nếu bỏ thêm … vào ngành …" hiện trước/sau; ô chọn ngành và ô "cổ phiếu công ty tôi làm" trong `HoldingFormModal`.
- **Hạn:** 07/10.

### 11. Kế hoạch an toàn — `/ke-hoach`
- **File:** `features/plan/SafetyPlanPage.tsx`, `shared/engine/plan.ts` (`proposePlan`, `applyPlan`), `worker/routes/plans.ts`
- **Đang có:** đề xuất tối đa 3 bước (`emergency` tăng quỹ dự phòng · `rebalance` chuyển một phần từ nhóm biến động cao sang quỹ an toàn hơn · `contribution` ưu tiên thêm tiền mỗi tháng cho mục tiêu lớn gần nhất); xem trước tác động; nút "Áp dụng kế hoạch" → danh sách việc để đánh dấu hoàn thành.
- **Thiếu:** bấm "Áp dụng" hai lần có thể ghi hai lần; không có nhật ký.
- **Cần làm:** gửi `Idempotency-Key` từ frontend; ghi `audit_log`. Đây là luồng xác nhận **chạy thật đầu tiên** để làm mẫu cho "Hỏi An Tâm".
- **Hạn:** 03/10.

### 12. AI theo dõi — `/ai-theo-doi`
- **File:** `features/ai/AiMonitorPage.tsx`, `worker/routes/ai.ts`, `shared/engine/alerts.ts` (`evaluateAlerts`), `digest.ts` (`weeklyDigest`), `worker/jobs/monitor.ts`
- **Đang có:** dòng thời gian sự kiện theo tuần/tháng; cảnh báo (mục tiêu bị trễ, tỷ trọng biến động cao, quỹ dự phòng thấp, chi tiêu vượt mức, tiết kiệm giảm), đánh dấu đã xử lý; tóm tắt tuần. Cảnh báo chạy tự động 8 giờ sáng.
- **Thiếu:** tóm tắt tuần đang truyền giờ giá trị = 0 cố định (`worker/routes/ai.ts`); chưa có nhật ký kiểm toán. "AI" ở đây là quy tắc, không phải LLM — không gọi là AI hiểu ngôn ngữ.
- **Cần làm:** đọc giờ thật từ `value_hours_log`; **tab mới "Nhật ký kiểm toán"** (`GET /api/audit`); sau 10/10 thêm danh sách các lượt "Hỏi An Tâm".
- **Hạn:** 03/10.

### 13. Cộng đồng — `/cong-dong`
- **File:** `features/community/CommunityPage.tsx`, `worker/routes/lessons.ts`
- **Đang có:** bài học ngắn, câu chuyện, bài học lịch sử; gợi ý bài phù hợp theo mức Điểm An Tâm.
- **Cần làm:** giữ nguyên. Không mở rộng trước 20/10.

### 14. Cài đặt — `/cai-dat`
- **File:** `features/settings/SettingsPage.tsx`, `AccountCards.tsx`, `worker/routes/settings.ts`, `shared/i18n/`, `shared/format/`
- **Đang có:** 3 ngôn ngữ (vi, zh, en); 3 loại tiền (VND, CNY, USD); đổi tên, xưng hô, mật khẩu; **xuất toàn bộ dữ liệu** (`GET /api/me/export`) và **xóa tài khoản** (`DELETE /api/me`).
- **Lưu ý:** dữ liệu trong D1 chưa mã hóa ở tầng ứng dụng; trường `dataEncrypted` (`client/src/lib/queries.ts`) **không được** giới thiệu là tính năng mã hóa.
- **Cần làm:** giữ nguyên. Dùng trong demo để chuyển sang tiếng Trung, đơn vị ¥.

### 15. Hỏi An Tâm — `/hoi-an-tam` (trang mới) ⚠️ lỗi thời — thay bằng AI Workspace `/ai-workspace` (mục 0)
- **Để làm gì:** người dùng hỏi bằng câu tự nhiên; xem AI đã hiểu gì, làm những bước nào; xác nhận hoặc từ chối hành động đề xuất.
- **Gồm:** ô hỏi + 3 câu mẫu; kết quả 3 tầng (kết luận → chi tiết → nút i); khối "Các bước An Tâm đã làm" (loại câu hỏi, kế hoạch, hàm đã gọi); màn xác nhận (trước/sau, rủi ro, trường hợp xấu nhất) gửi kèm `Idempotency-Key`.
- **Dùng:** `POST /api/agent/consult`, `GET /api/agent/runs/:id`, `POST /api/agent/actions/:id/confirm|reject` — [llm-strategy.md](specs/llm-strategy.md).
- **Hạn:** 10/10.

### 16. Lựa chọn cuộc đời — `/lua-chon` (trang mới)
- **Để làm gì:** tầng 5 — cho biết người dùng có kham nổi các quyết định lớn không.
- **Gồm:** số tháng tự do; danh sách lựa chọn (`study`, `care`, `startup`; sau đó `switch`, `sabbatical`) với kết luận xanh/vàng/đỏ; mỗi lựa chọn mở ra: điều kiện để kham nổi, trụ được bao lâu, mục tiêu bị lùi, giá trị nghề trước/sau; nút "Làm theo điều kiện này" → hành động chờ xác nhận.
- **Dùng:** ~~`/api/life-options/*`~~ → `/api/life-choices/*` (Wave 2 · 07/10) — [breakthroughs.md](specs/breakthroughs.md) §B1.
- **Hạn:** 10/10.

## 3. Việc chung cho mọi trang trong luồng demo

- Đủ 6 trạng thái: bình thường, đang tải, trống, thành công, lỗi (có nút thử lại), cảnh báo rủi ro (luôn kèm chữ và biểu tượng).
- Dùng được ở 320px; kiểm bằng Playwright `setViewportSize` ở 320 / 768 / 1280.
- ~~Luồng demo đi qua: Khởi đầu → Tổng quan → Hỏi An Tâm → Lựa chọn cuộc đời → xác nhận → AI theo dõi (nhật ký).~~ ⚠️ Luồng demo mới: Tổng quan → Danh mục → Lựa chọn cuộc đời → AI Workspace (duyệt) → Lịch AI → Nhật ký AI ([specs/ba.md](specs/ba.md) §8). Kiểm kỹ nhất các trang này trước 16/10.

## 4. Cách nói trên giao diện

Giao diện dùng lời đời thường; thuật ngữ chỉ nằm sau nút (i).

| Thay vì | Nói |
|---|---|
| Monte Carlo, phân phối xác suất | "Thử xem nếu thị trường giảm" · "trường hợp xấu / thường gặp / thuận lợi" |
| Số tháng an toàn | "Nếu mất việc, bạn trụ được bao lâu" |
| Human capital | "Giá trị nghề của bạn" |
| Correlated risk | "Tiền để dành đang phụ thuộc cùng ngành với công việc của bạn" |
| Real options | "Kế hoạch lớn này bạn có kham nổi không" |
| Loss aversion | "Mức lo lắng khi tiền bị hao hụt" |
| Behavior gap | "Số tiền có thể mất nếu bán vì hoảng" |

## 5. AI và dữ liệu — hiện trạng

| Việc | Hiện tại ✅ | Bổ sung 📐 |
|---|---|---|
| Hỏi đáp | — | LLM phân loại câu hỏi đã che số; code làm phần còn lại |
| Điểm, cảnh báo, gợi ý, tóm tắt | Quy tắc tính sẵn: `peace.ts`, `alerts.ts`, `nba.ts`, `digest.ts`, `narrate.ts` | — |
| Nơi lưu dữ liệu | D1 trên Cloudflare; mọi truy vấn lọc theo `user_id` | — |
| Gửi ra ngoài | Không gửi bên thứ ba nào | Câu hỏi đã che số → Workers AI (cùng nhà cung cấp, không huấn luyện); ghi vào Google/Notion của chính người dùng chỉ sau khi người dùng duyệt |
| Token tích hợp | — | Mã hóa bằng `TOKEN_ENC_KEY` (`worker/lib/crypto.ts`), không đưa vào bản xuất dữ liệu |

Giới hạn cần nói thật: D1 chưa mã hóa ở tầng ứng dụng (kế hoạch redesign chỉ mã hóa cột token OAuth).
