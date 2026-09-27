# Đặc tả sản phẩm An Tâm (BA Spec — nguồn sự thật duy nhất)

> File này mô tả sản phẩm là gì, cho ai, chạy thế nào, cần những API và dữ liệu nào. Mọi file khác trong `.agents/` dẫn về đây.
> Phiên bản 2.1 — khóa đặc tả ngày 29/09/2026. ✅ = đã có trong code · 📐 = đã chốt, chưa code (kèm hạn).

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
| 2. An toàn | "Mất việc thì trụ được bao lâu?" | Số tháng trụ được (Runway) | ✅ `peace.ts`, `simulate.ts` | 📐 Runway mới (§5.1), B3 |
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

Bổ sung (📐, hạn 10/10): một LLM mã nguồn mở chỉ làm đúng một việc — đọc câu hỏi tự nhiên (đã che hết con số) và trả về loại câu hỏi. Chi tiết: [llm-strategy.md](llm-strategy.md).

```text
Câu hỏi → che số & thông tin cá nhân (code) → LLM phân loại câu hỏi
        → lập kế hoạch các bước (code) → chạy engine tính toán (code)
        → giải thích bằng lời (code) → người dùng xác nhận hành động → ghi nhật ký
```

| AI được làm | AI không được làm |
|---|---|
| Phân loại câu hỏi đã che số | Nhìn thấy số tiền, ghi chú giao dịch, hồ sơ cá nhân |
| Gọi các hàm tính toán chỉ-đọc | Tự tính toán tài chính |
| Đề xuất hành động (chờ người dùng duyệt) | Tự ghi dữ liệu, tự duyệt |
| — | Gợi ý mã cổ phiếu cụ thể |
| — | Chuyển tiền (hệ thống không có chức năng này) |

Mỗi kết quả luôn kèm phần giải thích: dữ liệu đầu vào, công thức, giả định (ghi rõ là ƯỚC TÍNH hay SỐ THẬT), và khoảng dao động.

---

## 5. Mô hình tài chính cốt lõi

### 5.1. Số tháng trụ được (Runway) 📐 — hạn 10/10
$$\text{Runway} = \frac{\text{Tài sản dễ rút sau khi trừ hao}}{\text{Chi tiêu thiết yếu} - \text{Thu nhập còn lại}}$$

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

### 5.2. Chỉ số tập trung rủi ro (tiền + nghề) 📐 — hạn 07/10
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
| **B1** | Lựa chọn cuộc đời (Life Options) | 5 | *"Nghỉ việc học thạc sĩ 18 tháng: kham nổi nếu để dành thêm ¥1.200/tháng trong 10 tháng."* · *"Bạn đã mở khóa 2/5 lựa chọn."* | 10/10 |
| **B2** | Vốn con người theo mức phơi nhiễm AI | 3 | *"5 giờ/tuần học kỹ năng trong 12 tháng có thể làm giá trị nghề của bạn tăng khoảng 8% (ước tính)."* | 08/10 |
| **B3** | Thử tải có tính phản ứng cảm xúc | 2, 4 | *"Nếu bán tháo khi thị trường giảm 30% như bạn trả lời ở bài test, bạn có thể mất thêm ¥18.000."* | 12–13/10 |
| **B4** | Thử trước khi xuống tiền + cổ phiếu thưởng | 4 | *"Bỏ thêm 200 triệu vào cổ phiếu công nghệ: phụ thuộc ngành tăng từ 58% lên 71%, quỹ dự phòng còn 3,5 tháng."* | 07/10 |

Công thức, API, test và thứ tự cắt giảm khi trễ: [breakthroughs.md](breakthroughs.md).

---

## 7. Hành động và bước xác nhận của người dùng 📐 — hạn 10/10

An Tâm **không di chuyển tiền thật**. "Hành động" là thay đổi kế hoạch: tạo/sửa mục tiêu, áp dụng kế hoạch an toàn, đổi mức để dành hằng tháng, đặt tỷ trọng mục tiêu cho danh mục.

```text
đề xuất ──(người dùng xem giải thích & rủi ro)──► đã xác nhận ──► đã áp dụng
   └──► từ chối / hết hạn sau 24 giờ                   └──► lỗi (hoàn tác, ghi nhật ký)
```
- Xác nhận phải gửi kèm mã chống bấm trùng (`Idempotency-Key`): bấm hai lần chỉ ghi một lần.
- Mỗi lần đổi trạng thái ghi một dòng vào nhật ký kiểm toán không sửa được (`audit_log`).
- Màn xác nhận luôn hiện: trước và sau, rủi ro, trường hợp xấu nhất.
- Luồng tương tự đang có: `POST /api/plans/apply` ✅ — sẽ gắn thêm mã chống trùng và nhật ký.

---

## 8. Luồng demo chính (Golden Flow) và các ca sử dụng

```text
Đăng ký → Khởi đầu 3 bước ✅
→ Tổng quan: Điểm An Tâm, số tháng trụ được, số lựa chọn đã mở khóa ✅/📐
→ Hỏi: "Có nên nghỉ việc học thạc sĩ?" 📐
→ Engine tính: vốn con người, mức phụ thuộc ngành, số tháng trụ được, lựa chọn cuộc đời 📐
→ Giải thích 3 tầng + nút (i) ✅/📐
→ Xác nhận hành động đề xuất 📐
→ Tổng quan cập nhật → nhật ký kiểm toán 📐
```

| Mã | Ca sử dụng | Nơi xử lý | Trạng thái |
|---|---|---|:-:|
| UC-01 | Đăng ký, khởi đầu, chọn giai đoạn cuộc đời | `routes/auth.ts`, `routes/onboarding.ts` | ✅ |
| UC-02 | Ghi thu chi, tài sản, mục tiêu, hồ sơ thu nhập | `transactions.ts`, `holdings.ts`, `goals.ts`, `earn.ts` | ✅ |
| UC-03 | Hỏi An Tâm bằng câu tự nhiên, xem các bước AI đã làm | `POST /api/agent/consult` | 📐 |
| UC-04 | Thử tải "nếu… thì…" | `routes/simulations.ts` + Runway mới | ✅/📐 |
| UC-05 | Xác nhận hoặc từ chối hành động đề xuất | `/api/agent/actions/:id/confirm` | 📐 |
| UC-06 | Áp dụng thay đổi, cập nhật điểm và cảnh báo | `plans.ts`, `lib/refresh.ts` | ✅/📐 |
| UC-07 | Xem tổng quan và nhật ký kiểm toán | `overview.ts`, `GET /api/audit` | ✅/📐 |
| UC-08 | Đánh giá một lựa chọn cuộc đời | `POST /api/life-options/evaluate` | 📐 |
| UC-09 | Thử trước khi xuống tiền vào một ngành | `POST /api/career-overlap/what-if` | 📐 |

---

## 9. Dữ liệu

**Đã có ✅** (`migrations/0001`–`0007`, 21 bảng): `users`, `sessions`, `financial_profiles`, `holdings`, `net_worth_snapshots`, `goals`, `simulation_presets`, `simulation_runs`, `habit_scenarios`, `habit_answers`, `safety_plans`, `plan_tasks`, `ai_events`, `ai_alerts`, `lessons`, `user_settings`, `transactions`, `income_profiles`, `value_activities`, `value_hours_log`, `time_allocations`.

**Bổ sung 📐** (`migrations/0008_agent_audit.sql`, hạn 03/10 và 08/10):

| Bảng / cột | Để làm gì |
|---|---|
| `agent_runs`, `agent_steps` | Lưu từng lượt hỏi và từng bước AI đã làm |
| `agent_actions` | Hành động đề xuất và trạng thái |
| `idempotency_keys` | Chống ghi trùng khi bấm hai lần |
| `audit_log` | Nhật ký kiểm toán, không cho sửa/xóa |
| `income_profiles.sector`, `holdings.sector` | Nhóm ngành — cho B4 |
| `income_profiles.isco_code` | Mã nghề chuẩn quốc tế — cho B2 |
| `holdings.is_employer_stock` | Đánh dấu cổ phiếu công ty mình làm — cho B4 |
| `financial_profiles.birth_year`, `retirement_age` | Số năm còn đi làm — cho B2 |

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

**Bổ sung 📐**

| Endpoint | Để làm gì | Hạn |
|---|---|:-:|
| `GET /api/health` | Kiểm tra hệ thống và database còn sống | 03/10 |
| `GET /api/openapi.json` | Mô tả API cho máy chấm đọc | 03/10 |
| `GET /api/audit` | Nhật ký kiểm toán | 03/10 |
| `GET /api/career-overlap` · `POST /api/career-overlap/what-if` | B4 | 07/10 |
| `GET /api/human-capital` | B2 | 08/10 |
| `POST /api/agent/consult` · `GET /api/agent/runs/:id` | Hỏi An Tâm, xem các bước | 10/10 |
| `POST /api/agent/actions/:id/confirm` · `/reject` | Xác nhận / từ chối (bắt buộc mã chống trùng) | 10/10 |
| `GET /api/life-options/templates` · `POST /api/life-options/evaluate` · `GET /api/life-options/summary` | B1 | 10/10 |

---

## 11. Giao diện

- Nền sáng, tối giản; màu xanh navy, xanh ngọc, trắng, xám nhạt. Không dùng hiệu ứng kính mờ.
- Mỗi trang trong luồng demo đủ 6 trạng thái: bình thường, đang tải, trống, thành công, lỗi (có nút thử lại), cảnh báo rủi ro (vàng/cam, luôn kèm chữ và biểu tượng — không chỉ dựa vào màu).
- Dùng được ở màn hình rộng 320px; kiểm tra bằng Playwright ở 320 / 768 / 1280.
- 3 ngôn ngữ (vi, zh, en) và 3 loại tiền (VND, CNY, USD) ✅.
- Danh sách trang và việc cần làm cho từng trang: [codebase-audit.md](../codebase-audit.md).

---

## 12. Kinh doanh và tác động

- **Ai trả tiền:** ngân hàng số và công ty FinTech gắn An Tâm vào app của họ (B2B2C). Người dùng cuối dùng miễn phí bậc 1–3.
- **Ngân hàng được gì:** khách hàng có quỹ dự phòng ít rơi vào nợ xấu hơn và gắn bó lâu hơn; ngân hàng hiểu nhu cầu thật (mục tiêu, khoảng thiếu bảo vệ) để giới thiệu sản phẩm phù hợp qua quy trình tuân thủ của chính họ.
- **Chi phí:** hạ tầng tính theo lượt dùng; LLM chỉ phân loại câu hỏi, khoảng **$47 cho 1 triệu câu hỏi** ([llm-strategy.md](llm-strategy.md)); mọi phép tính là code.
- **Tác động:** phục vụ cả người chưa có tài sản; mọi con số có công thức công khai; không bao giờ gợi ý sản phẩm hay mã cổ phiếu cụ thể.

---

## 13. Kịch bản demo 3 phút

| Thời gian | Nội dung | Trên màn hình |
|---|---|---|
| 0:00–0:25 | Linh lương ổn, nhưng tiền để dành đặt gần hết vào ngành mình đang làm | Tổng quan: "Đã mở khóa 1/5 lựa chọn" |
| 0:25–1:00 | Linh hỏi: *"Mình có nên nghỉ việc học thạc sĩ 18 tháng không?"* | Các bước AI đã làm: loại câu hỏi, kế hoạch, hàm đã gọi |
| 1:00–1:45 | **Cao trào:** *"Kham nổi nếu để dành thêm ¥1.200/tháng trong 10 tháng. Nhưng 62% tổng tài sản của bạn phụ thuộc ngành công nghệ — nếu lặp lại đợt sa thải 2022, bạn chỉ trụ được 3 tháng."* | Kết luận lựa chọn + chỉ số tập trung + nút (i) |
| 1:45–2:15 | Linh xác nhận 2 hành động; bấm đúp không bị ghi trùng; kết quả chuyển xanh | Màn xác nhận, "2/5 lựa chọn" |
| 2:15–2:40 | Mở nhật ký kiểm toán; mời giám khảo thử lừa AI | Nhật ký, AI trả lời "ngoài phạm vi" |
| 2:40–3:00 | Chốt: *"Trước mỗi quyết định lớn, biết chắc mình có kham nổi không."* | Slide kết |

Chuẩn bị: 1 tài khoản mới (khởi đầu ≤ 30 giây), 1 tài khoản demo có dữ liệu sẵn (`seeds/demo-user.sql` 📐), video dự phòng 1080p.

---

## 14. Nguồn chính thức của cuộc thi

- [Chứng khoán Thời báo (STCN)](https://www.stcn.com/article/detail/4168818.html): nhánh quốc tế dùng chung bộ tiêu chuẩn năng lực và các chiều chấm điểm.
- [Peoplecen — WeBank](https://www.peoplecen.com/html/2026/jinr_0915/28806.html): định nghĩa "AI as a Financial Participant", yêu cầu kiểm soát quyền, chống ảo giác, chống tiêm lệnh; chấm máy + chấm ẩn danh; 48 giờ tại Thâm Quyến.
- [IEEE CIS Shenzhen](https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/): hạn nộp 20/10/2026, chung kết 21–23/11/2026.
- Tài liệu học thuật: [breakthroughs.md](breakthroughs.md) §Nguồn.
