# Đặc tả sản phẩm An Tâm (BA Spec — nguồn sự thật duy nhất)

> File này mô tả sản phẩm là gì, cho ai, chạy thế nào, cần những API và dữ liệu nào. Mọi file khác trong `.agents/` dẫn về đây.
> Phiên bản 2.3 — Cập nhật ngày 29/09/2026: Trích xuất và hệ thống hóa 10 Concept Boards từ hồ sơ dự thi WeBank FinTechathon thành 3 bộ BA Specs chuyên sâu:
> - 📘 [SPEC-01: Quản Trị Dòng Tiền, Quỹ An Toàn & Vốn Con Người](spec-01-core-finance-human-capital.md) (Boards 01, 02, 03, 04, 05, 06)
> - 📗 [SPEC-02: Động Cơ Mô Phỏng Quyết Định Cuộc Đời & Rủi Ro Danh Mục Tích Hợp](spec-02-life-simulation-portfolio-risk.md) (Boards 07, 08)
> - 📙 [SPEC-03: Không Gian Làm Việc AI Multi-Agent, Kiến Trúc CLI/Skills & Kiểm Toán Quyền Riêng Tư](spec-03-agent-skills-privacy.md) (Boards 09, 10)
> Đặc tả từng màn hình: [redesign-ui.md](redesign-ui.md).

---

## 1. Định vị

**Khẩu hiệu:** Trước mỗi quyết định lớn, biết chắc mình có kham nổi không.  
*Know if you can afford your next big life decision — before you make it.*

**Giải thích một câu:** An Tâm nhìn cùng lúc tiền bạn đang có, công việc đang nuôi bạn, và những kế hoạch lớn bạn muốn làm — rồi cho bạn biết kế hoạch nào an toàn, kế hoạch nào cần chuẩn bị thêm.

**Khác gì sản phẩm đang có:**
- App ngân hàng và app ghi chi tiêu nhìn **quá khứ**: đã tiêu bao nhiêu.
- Robo-advisor tối ưu **danh mục đầu tư**, bỏ qua công việc của người dùng.
- An Tâm tính cả **tiền** lẫn **nghề** (vốn con người — Human Capital) trong cùng một bảng, và cảnh báo khi hai thứ này **cùng rủi ro một lúc** (ví dụ: làm ngành công nghệ lại dồn tiền vào cổ phiếu công nghệ).

**Vấn đề:** người trẻ và gia đình thu nhập trung bình luôn lo về tiền, nhưng không biết mình trụ được bao lâu nếu mất việc, và không biết một quyết định lớn (đi học, nghỉ chăm con, khởi nghiệp) có làm mình kiệt quệ không.

**Vì sao là lúc này:** AI tạo sinh đang thay đổi thị trường lao động; khoảng 1/4 việc làm toàn cầu thuộc nhóm nghề có mức phơi nhiễm đo được (ILO, 2025). Rủi ro nghề nghiệp đã trở thành rủi ro tài chính.

---

## 2. Thang An Tâm 5 bậc

Lấy cảm hứng từ Tháp Maslow. Trong hồ sơ học thuật gọi là **Thang Chống Chịu Tài Chính** (Financial Resilience Ladder); mỗi bậc có một con số đo được.

| Bậc | Người dùng hỏi | Con số đo | Đã có | Bổ sung |
|:-:|---|---|---|---|
| 1. Dòng tiền | "Tiền về nhiều hơn tiền đi chưa?" | Tiền dư mỗi tháng | ✅ `ledger.ts`, `spending.ts` | — |
| 2. An toàn | "Mất việc thì trụ được bao lâu?" | Số tháng an toàn | ✅ `peace.ts`, `simulate.ts` | 📐 Số tháng an toàn (bản mới) (§5.1), B3 |
| 3. Năng lực kiếm tiền | "Làm gì để thu nhập tăng?" | Giá trị vốn con người | ✅ `earn.ts` (mới là gợi ý mẫu) | 📐 B2 |
| 4. Tích lũy | "Tiền để dành có đang cược cùng nghề mình không?" | Chỉ số tập trung rủi ro | ✅ `portfolio.ts` (theo lớp tài sản) | 📐 B4, B3 |
| 5. Tự do lựa chọn | "Kế hoạch lớn này mình có kham nổi không?" | Số tháng tự do · Số lựa chọn đã mở khóa | Chưa có | 📐 B1 |

Tầng 1 và 2 là nền móng; tầng 3–5 là nơi tạo khác biệt. Chi tiết 4 tính năng B1–B4: mục 6 và [breakthroughs.md](breakthroughs.md).

---

## 3. Người dùng

| Nhóm | Tuổi | Hoàn cảnh | Cần nhất |
|---|---|---|---|
| A. Mới bắt đầu | 18–24 | Ít tiền, nhiều thời gian | Tạo thói quen, học kỹ năng để tăng thu nhập (bậc 1, 3) |
| B. Đang xây dựng | 23–30 | Thu nhập đang tăng | Cân bằng dòng tiền, lập quỹ dự phòng (bậc 1, 2) |
| C. Ổn định | 30–40 | Gia đình, vay mua nhà | Thử tải rủi ro, giữ quỹ dự phòng (bậc 2, 4) |
| D. Có tài sản | 40+ | Không muốn lướt sóng | Tránh dồn rủi ro cùng nghề, tự do lựa chọn (bậc 4, 5) |

**Nhân vật demo:** Linh, 24 tuổi, kỹ sư phần mềm. 60% tiền để dành nằm ở cổ phiếu công nghệ và cổ phiếu thưởng của chính công ty. Đang cân nhắc nghỉ việc học thạc sĩ.

**Khoảnh khắc "à, ra thế":** trong 60 giây đầu, người dùng thấy *"Nếu mất việc, bạn trụ được khoảng X tháng"* và một việc cụ thể nên làm tiếp.

---

## 4. AI làm gì, không làm gì

Nguyên tắc: **AI hiểu câu hỏi, code tính con số.**

Hiện tại (✅): phần "AI" là các quy tắc tính sẵn — cảnh báo `alerts.ts`, gợi ý việc tiếp theo `nba.ts`, câu giải thích `narrate.ts`, tóm tắt tuần `digest.ts`, chạy tự động mỗi sáng `worker/jobs/monitor.ts`. Chưa có mô hình ngôn ngữ (LLM).

Bổ sung (📐, hạn 12/10 — Wave 3): một LLM mã nguồn mở (Workers AI, Qwen3-30B) chỉ phân loại ý định và lập kế hoạch trên câu đã che hết con số. Giao diện là **AI Workspace** (`/ai-workspace`) với 5 agent Planner / Calendar / Cashflow / Skill / Goal; mọi hành động ghi ra ngoài (Google Calendar, Gmail, Sheets, Notion) chỉ là đề xuất chờ người dùng duyệt. Cùng các tool này được mở cho Claude/ChatGPT/Gemini qua remote MCP server `/mcp` (Wave 4), tool ghi duy nhất là `propose_action`. Chi tiết: [llm-strategy.md](llm-strategy.md) §8.

```text
Câu hỏi → che số & thông tin cá nhân (code) → LLM phân loại câu hỏi
        → lập kế hoạch các bước (code) → chạy engine tính toán (code)
        → giải thích bằng lời (code) → người dùng xác nhận hành động → ghi nhật ký
```

| AI được làm | AI không được làm |
|---|---|
| Phân loại câu hỏi đã che số | Nhìn thấy số tiền, ghi chú giao dịch, hồ sơ cá nhân |
| Gọi các hàm tính toán chỉ-đọc | Tự tính toán tài chính |
| Đề xuất hành động (chờ người dùng duyệt) | Tự ghi dữ liệu, tự duyệt (trừ hành động nội bộ rủi ro thấp mà quy tắc tự động cho phép, ghi approver `auto`) |
| — | Gợi ý mã cổ phiếu cụ thể |
| — | Chuyển tiền (hệ thống không có chức năng này) |

Mỗi kết quả luôn kèm phần giải thích: dữ liệu đầu vào, công thức, giả định (ghi rõ là ƯỚC TÍNH hay SỐ THẬT), và khoảng dao động.

---

## 5. Mô hình tài chính cốt lõi

### 5.1. Số tháng an toàn 📐 — chưa xếp vào wave nào của kế hoạch redesign (xem [project-timeline.md](../project-timeline.md)); Quỹ an toàn và Lựa chọn cuộc đời dùng số tháng an toàn hiện có trong `peace.ts` ✅ cho tới khi công thức này được code
$$\text{Số tháng an toàn} = \frac{\text{Tài sản dễ rút sau khi trừ hao}}{\text{Chi tiêu thiết yếu} - \text{Thu nhập còn lại}}$$

| Loại tài sản | Trừ hao khi cần bán gấp (ƯỚC TÍNH) |
|---|:-:|
| Tiền mặt, tiền gửi | 0% |
| Trái phiếu | 5% |
| Quỹ mở | 10% |
| Cổ phiếu | 30% |
| Khác | 50% |

- "Thu nhập còn lại" do người dùng tự khai (trợ cấp, việc phụ, gia đình hỗ trợ), mặc định 0. Thay cho hằng số ẩn `INCOME_PAUSE_COVERAGE = 0.5` đang có trong `simulate.ts`.
- Nếu mẫu số ≤ 0: hiện "Dòng tiền vẫn dương khi mất việc", không chia.
- Kèm khoảng **xấu / thường gặp / thuận lợi** (P10 / P50 / P90) từ 1.000 lần mô phỏng có seed cố định — cùng dữ liệu luôn ra cùng kết quả.
- Hiển thị 3 tầng: câu kết luận → khoảng dao động → nút (i) "Cách tính".

### 5.2. Chỉ số tập trung rủi ro (tiền + nghề) 📐 — hạn 03/10 (Wave 1), `shared/engine/concentration.ts` (`sectorExposure`, `hhi`, `concentrationIndex`)
$$C_s = \frac{\beta_{nghề,s} \cdot HC + \text{Tài sản thuộc ngành } s}{HC + \text{Tổng tài sản tài chính}}$$
- $HC$: vốn con người (cách tính ở [breakthroughs.md](breakthroughs.md) §B2).
- $\beta_{nghề,s}$: mức nghề của người dùng nhạy với ngành $s$, từ 0 đến 1 (bảng tra, ƯỚC TÍNH, người dùng chỉnh được).
- Cảnh báo vàng khi $C_s > 40\%$, cam khi $> 60\%$.
- Ví dụ hiển thị: *"62% tổng tài sản của bạn — tính cả công việc — phụ thuộc ngành công nghệ."*
- 8 nhóm ngành: công nghệ, tài chính, bất động sản, sản xuất, tiêu dùng, y tế, giáo dục & công, khác.

Cơ sở học thuật: Bodie, Merton & Samuelson (1992); Campbell & Viceira (2002); Davis & Willen (2000). **Không dùng và không nhắc tới** Black–Litterman hay tối ưu Markowitz.

### 5.3. Điểm An Tâm ✅
`peaceScore()` trong `shared/engine/peace.ts`: quỹ dự phòng 30 · khả năng đạt mục tiêu 30 · mức rủi ro phù hợp 20 · tỷ lệ để dành 20 (tổng 100). Mức: Ổn định ≥ 80, Cần chú ý ≥ 60, Cần hành động < 60.

---

## 6. Bốn tính năng đột phá

| Mã | Tên | Bậc | Người dùng thấy | Hạn |
|---|---|:-:|---|:-:|
| **B1** | Lựa chọn cuộc đời (Life Choices) — màn `/lua-chon` | 5 | *"Nghỉ việc học thạc sĩ 18 tháng: kham nổi nếu để dành thêm ¥1.200/tháng trong 10 tháng."* · So sánh 2 phương án bằng điểm khả thi (vd 72 vs 68/100) | 07/10 (Wave 2) |
| **B2** | Vốn con người theo mức phơi nhiễm AI — màn `/tang-thu-nhap` | 3 | *"5 giờ/tuần học kỹ năng trong 12 tháng có thể làm giá trị nghề của bạn tăng khoảng 8% (ước tính)."* · Giá trị nghề nghiệp x/100 | 03/10 (Wave 1) |
| **B3** | Thử tải có tính phản ứng cảm xúc | 2, 4 | *"Nếu bán tháo khi thị trường giảm 30% như bạn trả lời ở bài test, bạn có thể mất thêm ¥18.000."* | Chưa xếp wave |
| **B4** | Thử trước khi xuống tiền + cổ phiếu thưởng — màn `/danh-muc` | 4 | *"Bỏ thêm 200 triệu vào cổ phiếu công nghệ: phụ thuộc ngành tăng từ 58% lên 71%, quỹ dự phòng còn 3,5 tháng."* | 03/10 (Wave 1) |

Công thức, API, test và thứ tự cắt giảm khi trễ: [breakthroughs.md](breakthroughs.md).

---

## 7. Hành động và bước phê duyệt của người dùng 📐 — hạn 12/10 (Wave 3; nền audit/idempotency ở Wave 0)

An Tâm **không di chuyển tiền thật**. "Hành động" là thay đổi kế hoạch (tạo/sửa mục tiêu, áp dụng kế hoạch an toàn, đổi mức để dành, đặt ngân sách) hoặc **ghi ra công cụ bên ngoài** của chính người dùng: tạo sự kiện trong lịch phụ "An Tâm" trên Google Calendar, cập nhật Sheet "An Tâm – Ngân sách", gửi email xác nhận qua Gmail, ghi trang Notion. Mọi hành động do agent, MCP client hay automation đề xuất đều đi qua bảng `agent_actions`:

```text
pending ──(người dùng xem preview trước/sau & rủi ro)──► approved ──► executing ──► done
   ├──► rejected                                                          └──► failed (hoàn tác phần ghi nội bộ, ghi nhật ký)
   ├──► changes_requested (chạy lại planner kèm ghi chú)
   └──► expired (sau 24 giờ)
```
- Nguồn đề xuất: AI Workspace (`POST /api/agent/runs`), MCP client (`propose_action`), hoặc cron automation.
- Duyệt phải gửi kèm `Idempotency-Key`; server dùng `UPDATE … WHERE id=? AND status='pending'` — duyệt hai lần trả 409, chỉ thực thi một lần.
- Mỗi lần đổi trạng thái ghi một dòng vào `audit_log`: append-only (trigger chặn UPDATE/DELETE), có chuỗi hash `prev_hash`/`row_hash`, đã ẩn danh. Nhật ký AI (`/nhat-ky-ai`) hiển thị các dòng này.
- Hành động nội bộ rủi ro thấp mà quy tắc có `requires_approval=0` được tự duyệt (approver = `auto`) và vẫn ghi nhật ký.
- Màn duyệt luôn hiện: trước và sau, rủi ro, công cụ bị ghi.
- Luồng tương tự đang có: `POST /api/plans/apply` ✅ — sẽ gộp vào Quỹ an toàn và gắn mã chống trùng + nhật ký.

---

## 8. Luồng demo chính (Golden Flow) và các ca sử dụng

```text
Đăng ký → Khởi đầu 3 bước ✅ (hoặc đăng nhập tài khoản demo seed 📐)
→ Tổng quan (/): Điểm An Tâm, Số tháng an toàn, dòng tiền, "Hôm nay AI đề xuất", lịch hôm nay, lựa chọn cuộc đời đang ghim ✅/📐
→ Danh mục (/danh-muc): rủi ro tập trung tiền + nghề, cổ phiếu công ty, "Thử trước khi đầu tư" 📐
→ Mục tiêu & Lựa chọn (/lua-chon): so sánh "Nghỉ việc học MBA" vs "Vừa học vừa làm", điểm khả thi, điều kiện tiên quyết 📐
→ AI Workspace (/ai-workspace): ra lệnh "lên kế hoạch tuần tới" → timeline các agent → Duyệt (Idempotency-Key) 📐
→ Sự kiện xuất hiện trên Google Calendar thật (Lịch AI /lich-ai) 📐
→ Nhật ký AI (/nhat-ky-ai): dòng audit mới, quyền riêng tư, tích hợp 📐
```

| Mã | Ca sử dụng | Nơi xử lý | Trạng thái |
|---|---|---|:-:|
| UC-01 | Đăng ký, khởi đầu, chọn giai đoạn cuộc đời | `routes/auth.ts`, `routes/onboarding.ts` | ✅ |
| UC-02 | Ghi thu chi, tài sản, mục tiêu, hồ sơ thu nhập | `transactions.ts`, `holdings.ts`, `goals.ts`, `earn.ts` | ✅ |
| UC-03 | Ra lệnh cho đội ngũ AI bằng câu tự nhiên, xem timeline các bước | `POST /api/agent/runs`, `GET /api/agent/runs/:id` | 📐 |
| UC-04 | Thử tải "nếu… thì…" | `routes/simulations.ts` | ✅ |
| UC-05 | Duyệt / từ chối / yêu cầu điều chỉnh hành động đề xuất | `POST /api/agent/actions/:id/{approve,reject,request-changes}` | 📐 |
| UC-06 | Áp dụng thay đổi, cập nhật điểm và cảnh báo | `plans.ts`, `lib/refresh.ts` (`afterChange`), `worker/agents/executor.ts` | ✅/📐 |
| UC-07 | Xem tổng quan và nhật ký kiểm toán | `GET /api/overview`, `GET /api/audit` | ✅/📐 |
| UC-08 | Đánh giá và so sánh lựa chọn cuộc đời | `POST /api/life-choices/evaluate`, `/compare` | 📐 |
| UC-09 | Thử trước khi đầu tư vào một ngành | `POST /api/portfolio/what-if` | 📐 |
| UC-10 | Ngân sách tháng, hóa đơn định kỳ, chia đều chi phí + VietQR | `/api/budgets/:month`, `/api/bills`, `POST /api/ledger/split` | 📐 |
| UC-11 | Kết nối Google/Notion/ngân hàng (SePay), đồng bộ, thu hồi | `/api/integrations`, `POST /api/webhooks/sepay` | 📐 |
| UC-12 | Tự sắp lịch và đồng bộ Google Calendar | `POST /api/calendar/auto-schedule`, `POST /api/calendar/sync` | 📐 |
| UC-13 | Dùng An Tâm từ Claude/ChatGPT/Gemini (đọc + đề xuất chờ duyệt) | `/mcp` | 📐 |
| UC-14 | Xuất / xóa dữ liệu | `GET /api/me/export` ✅, `DELETE /api/me` ✅ (+ tombstone `erasure_requests` 📐) | ✅/📐 |

---

## 9. Dữ liệu

**Đã có ✅** (`migrations/0001`–`0007`, 21 bảng): `users`, `sessions`, `financial_profiles`, `holdings`, `net_worth_snapshots`, `goals`, `simulation_presets`, `simulation_runs`, `habit_scenarios`, `habit_answers`, `safety_plans`, `plan_tasks`, `ai_events`, `ai_alerts`, `lessons`, `user_settings`, `transactions`, `income_profiles`, `value_activities`, `value_hours_log`, `time_allocations`.

**Bổ sung 📐** (mỗi domain một file migration, số `0008`–`0014` đặt trước từ Wave 0):

| Migration | Bảng / cột | Để làm gì | Wave |
|---|---|---|:-:|
| `0008_agent_audit` | `audit_log` | Nhật ký kiểm toán append-only: trigger chặn UPDATE; chặn DELETE trừ khi user có trong `erasure_requests`; chuỗi hash `prev_hash`/`row_hash`; `user_id` **không FK** để xóa tài khoản không cascade | 0 |
| | `erasure_requests` | Yêu cầu xóa dữ liệu (tombstone) | 0 |
| | `idempotency_keys` | PK `(user_id, key)`, hết hạn 24h — chống ghi trùng | 0 |
| | `agent_runs`, `agent_steps` | Từng lượt ra lệnh và từng bước agent đã làm | 0 |
| | `agent_actions` | Hành động đề xuất: `pending → approved → executing → done \| failed`, cùng `rejected \| changes_requested \| expired`; `payload_json`, `preview_json`, `integration`, `risk` | 0 |
| `0009_profile_career` | `holdings.sector`, `holdings.is_employer_stock` | Nhóm ngành, cổ phiếu công ty mình làm — B4 | 0 |
| | `income_profiles.sector`, `income_profiles.isco_code` | Ngành, mã nghề ISCO — B2, B4 | 0 |
| | `financial_profiles.birth_year`, `retirement_age` | Số năm còn đi làm — B2 | 0 |
| | `goals.icon`, `goals.horizon` | Mục tiêu ngắn/trung/dài hạn — Quỹ an toàn | 0 |
| | `net_worth_snapshots.cash`, `other`, `debt`; bảng `liabilities` | Tài sản ròng 4 loại, nợ — Tổng quan, Danh mục | 0 |
| `0010_ledger_budget` | `budgets(user_id, month, category='all', limit_amount)` UNIQUE | Ngân sách tháng, tự mang sang tháng sau | 1 |
| | `recurring_bills` | Hóa đơn định kỳ (trạng thái tính ra, không lưu) | 1 |
| | `transactions.source`, `external_id` (UNIQUE một phần), `bill_id` | Giao dịch từ SePay, chống trùng, khớp hóa đơn | 1 |
| | `split_bills`; `user_settings` + tài khoản nhận VietQR | Chia đều chi phí | 1 |
| `0011_skills_catalog` | `skill_plan_items`; `opportunities` (danh mục seed) | Kế hoạch học tuần, cơ hội/việc làm — B2 | 1 |
| `0012_integrations` | `integrations` (`(user_id, provider)` UNIQUE, `access_token_enc`/`refresh_token_enc`, `status`, `meta_json`) | Token OAuth đã mã hóa; calendarId, syncToken, spreadsheetId, Notion pageId | 1 |
| | `oauth_states`, `bank_accounts`, `bank_webhook_events` | PKCE; tài khoản ngân hàng liên kết; webhook SePay | 1 |
| `0013_calendar_automation` | `calendar_events` (`source` local/google/agent, `category` finance/skill/work/rest/personal, `google_event_id` UNIQUE một phần, `action_id`) | Lịch AI | 2 |
| | `automation_rules` (`weekly_review`, `bill_reminder`, `skill_block`, `freelance_followup`) | 4 toggle đề xuất tự động | 2 |
| `0014_life_choices` | `life_choices`, `life_choice_options`, `life_choice_prereqs`, `life_choice_tasks` | B1; kết quả đánh giá tính khi đọc, không lưu | 2 |

Nguồn thu nhập **không cần bảng mới**: lấy từ `transactions.category` (thêm `freelance`). Mọi bảng user mới được đưa vào `EXPORT_TABLES`, trừ cột token.

---

## 10. API

**Đã có ✅**

| Nhóm | Endpoint |
|---|---|
| Tài khoản | `POST /api/auth/register · login · logout` · `GET /api/auth/me` |
| Hệ thống | `GET /api/version` |
| Hồ sơ | `/api/profile` · `/api/onboarding` · `/api/settings` · `PATCH /api/me` · `POST /api/me/password` · `GET /api/me/export` · `DELETE /api/me` |
| Thu chi | `/api/transactions` (GET, POST, PATCH, DELETE) · `GET /api/transactions/categories` |
| Tài sản | `/api/holdings` · `/api/portfolio` |
| Mục tiêu | `GET /api/goals/summary` · `POST /api/goals` · `PATCH/DELETE /api/goals/:id` |
| Thử tải | `GET /api/simulations/presets` · `POST /api/simulations/preview` · `POST /api/simulations/run` · `GET /api/simulations/runs[/:id]` |
| Kiếm tiền | `/api/earn` · `/api/earn/activities` · `/api/earn/hours` · `/api/earn/time` · `GET /api/earn/summary` |
| Kế hoạch, thói quen | `/api/plans` · `POST /api/plans/apply` · `/api/habits` |
| AI theo dõi | `GET /api/ai` · `PATCH /api/ai/alerts/:id` · `GET /api/ai/digest` |
| Khác | `/api/overview` · `/api/lessons` · `/api/notifications` · `/api/search` |

**Bổ sung 📐** — mỗi màn một GET tổng hợp + các lệnh ghi chi tiết. Mọi lệnh approve/reject và mọi POST liên quan tới tiền bắt buộc header `Idempotency-Key`.

> Đổi tên so với bản 2.1: `/api/life-options/*` → `/api/life-choices/*`; `/api/career-overlap` + `/what-if` → `GET /api/portfolio/risk` + `POST /api/portfolio/what-if`; `POST /api/agent/consult` → `POST /api/agent/runs`; `/api/agent/actions/:id/confirm` → `/approve`. `GET /api/human-capital` giữ nguyên.

| Màn | Endpoint | Hạn |
|---|---|:-:|
| Hệ thống | `GET /api/health` | 29/09 (Wave 0) |
| Tổng quan | `GET /api/overview` mở rộng: `cashflow6m`, `savingsRateVsPeers`, `todaySuggestions`, `todayEvents`, `netWorthBreakdown`, `resourceRings`, `pinnedLifeChoice` | 12/10 |
| Sổ thu chi | `GET /api/ledger/dashboard?month` · `GET/PUT /api/budgets/:month` · CRUD `/api/bills` + `POST /api/bills/:id/paid` · `POST /api/ledger/split` → `{shares, qrUrls}` · `PUT /api/settings/payout-account` | 03/10 |
| Quỹ an toàn | `GET /api/safety` · `PUT /api/safety/target` · `PATCH /api/goals/:id` (thêm `icon`, `horizon`) | 03/10 |
| Tăng thu nhập | `GET /api/earn/dashboard` · `GET /api/human-capital` · CRUD `/api/skills` | 03/10 |
| Danh mục | `GET /api/portfolio/risk` · `POST /api/portfolio/what-if` | 03/10 |
| Lịch AI | `GET /api/calendar?week=` · CRUD `/api/calendar/events` · `POST /api/calendar/sync` · `POST /api/calendar/auto-schedule` · `GET` / `PUT /api/automation-rules/:key` | 07/10 |
| Lựa chọn | `/api/life-choices`: templates, list, CRUD, `POST /evaluate`, `POST /compare`, prereqs, tasks | 07/10 |
| AI Workspace | `GET /api/agents` · `POST /api/agent/runs` · `GET /api/agent/runs/:id` (poll timeline) · `GET /api/agent/actions?status=pending` · `POST /api/agent/actions/:id/{approve,reject,request-changes}` · `POST /api/agent/actions/approve-batch` | 12/10 |
| Nhật ký AI | `GET /api/audit?agent&status&from&to&cursor` · `/api/integrations` (list, connect 302, callback, delete, sync) · `POST /api/integrations/sepay/{link,verify}` · export/xóa dữ liệu có sẵn ✅ | 03/10 (backend tích hợp), 12/10 (màn) |
| Public | `POST /api/webhooks/sepay` (mount trước `requireAuth`) | 03/10 |
| Public | `GET /api/openapi.json` · `/mcp` · `/oauth/*` · `/.well-known/*` | 14/10 |

### 10.1. Tích hợp bên ngoài 📐 (backend Wave 1, dùng ở Wave 2–4)

Tích hợp đều là **thật**, chọn stack ít phải xác minh nhất; không dùng Composio/Pipedream để dữ liệu không đi qua bên thứ ba.

| Tích hợp | Cách làm | Scope / bảo mật |
|---|---|---|
| **Google Calendar, Gmail, Sheets** | OAuth trực tiếp có PKCE; app Google Cloud ở chế độ **Testing** (tối đa 100 test user, dùng được scope sensitive/restricted không cần Google xác minh; giám khảo và tài khoản demo được thêm làm test user) | `calendar.events.readonly` (đọc lịch chính, tìm khung trống) · `calendar.app.created` (sự kiện AI tạo nằm trong lịch phụ "An Tâm") · `gmail.readonly` (tìm email hóa đơn) · `gmail.send` (gửi email xác nhận, luôn qua phê duyệt) · `drive.file` (chỉ chạm Sheet "An Tâm – Ngân sách" do app tạo). Refresh token hết hạn sau 7 ngày ở chế độ Testing → UI có nút "Kết nối lại" |
| **Notion** | Public integration OAuth, không cần xác minh | Token mã hóa trong `integrations` |
| **SePay** | Bank Hub liên kết tài khoản cá nhân bằng OTP (MB, VCB, ACB, BIDV, TCB, VPBank…); webhook biến động số dư → `transactions` (`source='sepay'`), chống trùng theo `external_id` | Webhook xác thực bằng API key/HMAC; sai → 401 |
| **VietQR** | `img.vietqr.io` — mã QR chuyển tiền cho "Chia đều chi phí" | Không gọi API ghi |
| **An Tâm MCP server** | `/mcp` trên chính Worker: Cloudflare Agents SDK `createMcpHandler` + `@cloudflare/workers-oauth-provider`; cùng URL cho Claude (Custom Connector, plugin Claude Code), ChatGPT (developer mode), Gemini CLI | Tool đọc chạy trực tiếp; tool ghi duy nhất `propose_action` → pending, source `mcp`; không có tool approve |

Token OAuth mã hóa bằng `TOKEN_ENC_KEY` (`worker/lib/crypto.ts`); `worker/integrations/tokens.ts` tự refresh, `invalid_grant` → `status='error'`. Định hướng khi pitch: Open API theo Thông tư 64/2024/TT-NHNN (hiệu lực 01/03/2025) để làm việc trực tiếp với ngân hàng đối tác. Tài khoản Google Cloud, Notion, SePay do user tự đăng ký (việc thủ công, [project-timeline.md](../project-timeline.md)).

---

## 11. Giao diện

Theo 9 mockup mới 📐 — đặc tả từng màn: [redesign-ui.md](redesign-ui.md).

- **Phong cách:** nền trắng/xám rất nhạt; card bo 16px viền mảnh, shadow nhẹ; xanh lá đậm (khoảng `#0F5E3F`) cho CTA chính, xanh dương cho CTA phụ; badge pastel đỏ/cam/xanh/tím; hero banner ảnh minh họa thành phố + nhân vật; chữ sans (Be Vietnam Pro/Inter). Không dùng hiệu ứng kính mờ. *(Thay cho bảng màu navy/xanh ngọc của bản 2.1.)*
- **Sidebar 11 mục:** Tổng quan `/` · Sổ thu chi `/thu-chi` · Quỹ an toàn `/quy-an-toan` · Tăng thu nhập `/tang-thu-nhap` · Mục tiêu & Lựa chọn `/lua-chon` · Lịch AI `/lich-ai` · Mô phỏng `/mo-phong` · Danh mục `/danh-muc` · AI Workspace `/ai-workspace` · Nhật ký AI `/nhat-ky-ai` · Cài đặt `/cai-dat`; thẻ minh họa/promo Học tài chính cuối sidebar (→ `/cong-dong`).
- **Topbar:** tìm kiếm theo trang, nút "Kết nối Google Calendar", badge "Dữ liệu riêng tư & bảo mật", chuông, chọn ngôn ngữ, avatar + vai trò.
- **9 màn có mockup:** Tổng quan, Sổ thu chi, Quỹ an toàn & mục tiêu, Tăng thu nhập & kỹ năng, Lịch AI, Lựa chọn cuộc đời, Danh mục & rủi ro tập trung, AI Workspace · MCP · Agents, Nhật ký AI · kiểm toán · quyền riêng tư. Mô phỏng và Cài đặt không có mockup: chỉ đổi shell + UI kit.
- **Trang gộp và redirect:** `/muc-tieu`, `/ke-hoach` → `/quy-an-toan`; `/ai-theo-doi` → `/nhat-ky-ai`; `/thoi-quen` → `/thu-chi?tab=thoi-quen`; `/cong-dong` giữ route (link từ thẻ promo).
- Mỗi trang trong luồng demo đủ 6 trạng thái: bình thường, đang tải, trống, thành công, lỗi (có nút thử lại), cảnh báo rủi ro (vàng/cam, luôn kèm chữ và biểu tượng — không chỉ dựa vào màu).
- Responsive: kiểm bằng `playwright-cli` `setViewportSize` ở 1440 / 1024 / 768 / 390, không tràn ngang.
- 3 ngôn ngữ (vi, zh, en) và 3 loại tiền (VND, CNY, USD) ✅.
- Hiện trạng code từng trang và mapping trang cũ → mới: [codebase-audit.md](../codebase-audit.md).

---

## 12. Kinh doanh và tác động

- **Ai trả tiền:** ngân hàng số và công ty FinTech gắn An Tâm vào app của họ (B2B2C). Người dùng cuối dùng miễn phí bậc 1–3.
- **Ngân hàng được gì:** khách hàng có quỹ dự phòng ít rơi vào nợ xấu hơn và gắn bó lâu hơn; ngân hàng hiểu nhu cầu thật (mục tiêu, khoảng thiếu bảo vệ) để giới thiệu sản phẩm phù hợp qua quy trình tuân thủ của chính họ.
- **Chi phí:** hạ tầng tính theo lượt dùng; LLM chỉ phân loại câu hỏi, khoảng **$47 cho 1 triệu câu hỏi** ([llm-strategy.md](llm-strategy.md)); mọi phép tính là code.
- **Tác động:** phục vụ cả người chưa có tài sản; mọi con số có công thức công khai; không bao giờ gợi ý sản phẩm hay mã cổ phiếu cụ thể.

---

## 13. Kịch bản demo 3 phút

Cập nhật theo 9 màn mới 📐. Số liệu lấy từ dữ liệu demo khớp mockup (`seeds/demo-user.sql`, Wave 5).

| Thời gian | Nội dung | Trên màn hình |
|---|---|---|
| 0:00–0:20 | Nhân vật demo lương ổn (thu 28,5tr, chi 21tr/tháng) nhưng quỹ dự phòng mới 4,2 tháng | Tổng quan `/`: 4 KPI, "Hôm nay AI đề xuất", lịch Google hôm nay |
| 0:20–0:50 | 35% danh mục là cổ phiếu công ty mình làm; tiền và nghề cùng phụ thuộc ngành công nghệ. Thử "bỏ thêm tiền vào ETF toàn cầu" → rủi ro giảm, số tháng an toàn tăng | Danh mục `/danh-muc`: gauge rủi ro tập trung, bar theo ngành, "Thử trước khi đầu tư" (B4) |
| 0:50–1:40 | **Cao trào:** "Nghỉ việc học MBA (300tr)" vs "Vừa học vừa làm" — điểm khả thi 72 vs 68, tác động số tháng an toàn, điều kiện tiên quyết 5/6, kế hoạch 5 bước | Mục tiêu & Lựa chọn `/lua-chon` (B1, dùng B2 từ Tăng thu nhập) |
| 1:40–2:20 | Ra lệnh: *"Lên kế hoạch tuần tới để chuẩn bị cho MBA"* → timeline 5 agent → danh sách chờ phê duyệt → Duyệt (bấm đúp không thực thi 2 lần) → sự kiện xuất hiện trên Google Calendar thật | AI Workspace `/ai-workspace` → Lịch AI `/lich-ai` |
| 2:20–2:45 | Mở nhật ký: dòng audit mới, người phê duyệt, quyền riêng tư (xuất/xóa), tích hợp; mời giám khảo thử lừa AI | Nhật ký AI `/nhat-ky-ai` |
| 2:45–3:00 | Chốt: *"Trước mỗi quyết định lớn, biết chắc mình có kham nổi không."* (tuỳ thời gian: Claude qua connector `/mcp` hỏi "tóm tắt chi tiêu tháng này") | Slide kết |

Chuẩn bị: 1 tài khoản mới (khởi đầu ≤ 30 giây), 1 tài khoản demo có dữ liệu sẵn (`seeds/demo-user.sql` 📐), tài khoản Google là test user và đã "Kết nối lại" trong 7 ngày trước demo, video dự phòng 1080p.

---

## 14. Nguồn chính thức của cuộc thi

- [Chứng khoán Thời báo (STCN)](https://www.stcn.com/article/detail/4168818.html): nhánh quốc tế dùng chung bộ tiêu chuẩn năng lực và các chiều chấm điểm.
- [Peoplecen — WeBank](https://www.peoplecen.com/html/2026/jinr_0915/28806.html): định nghĩa "AI as a Financial Participant", yêu cầu kiểm soát quyền, chống ảo giác, chống tiêm lệnh; chấm máy + chấm ẩn danh; 48 giờ tại Thâm Quyến.
- [IEEE CIS Shenzhen](https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/): hạn nộp 20/10/2026, chung kết 21–23/11/2026.
- Tài liệu học thuật: [breakthroughs.md](breakthroughs.md) §Nguồn.
