# 🔍 BÁO CÁO KIỂM TOÁN TRẢI NGHIỆM LẦN ĐẦU & TRẠNG THÁI RỖNG (0 BYTE DATA)
**Hệ thống:** An Tâm AI — Nền tảng Tài chính Cá nhân & Khả năng Chống chịu AI
**Tài liệu SSOT:** `docs/audit/04-FIRST-RUN.md`
**Đối tượng kiểm toán:** Người dùng lần đầu (Fresh browser, 0 byte dữ liệu, vừa đăng ký tài khoản / mới tạo hồ sơ rỗng).

---

## 📌 MỤC TIÊU & PHƯƠNG PHÁP KIỂM TOÁN

Kiểm toán toàn diện 100% mã nguồn Frontend (`client/src/features/*`), Backend Engine (`shared/engine/*`, `worker/routes/*`) và Local Storage Reactive Store (`client/src/state/*`) trong kịch bản tài khoản hoàn toàn mới:
1. **Runtime Crashes & Null Pointer Exceptions:** Rà soát các phép chia cho 0, `undefined.length`, `null.map`, `NaN%` khi data rỗng.
2. **Hallucinated Data & Fake Fallbacks (Số ma / Số bịa):** Rà soát các điểm số, tỷ lệ, biểu đồ tự động fallback về số giả định (ví dụ 35/100, 112 triệu, 4.2 tháng, v.v.) thay vì thông báo trung thực chưa có dữ liệu.
3. **Hiển thị Biểu đồ (Visuals/Charts/Gauges):** Kiểm tra Recharts, DonutChart, SVG Meter, Stepper, KPI Progress Bars khi không có dữ liệu.
4. **Thiết kế Luồng Onboarding Tối Thiểu (Minimum Onboarding - 30 Giây):** Đơn giản hóa luồng khởi tạo ban đầu, không bắt người dùng nhập 30 trường phức tạp.
5. **Chuẩn hóa Ma trận Empty States:** Thiết kế thông điệp trung thực + 1 CTA hành động trực tiếp cho từng màn hình.

---

## 🚨 PHẦN 1: BẢNG TỔNG HỢP KIỂM TOÁN TỪNG MÀN HÌNH

| Màn hình | Route | Trạng thái Crash (0-Data) | Bị ảo số / Hallucination | Biểu đồ khi rỗng | Đánh giá Empty State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Tổng quan (Overview)** | `/` | 🟢 An toàn (Fallback `—`) | ⚠️ Điểm An Tâm tính ra **35/100** dù chưa nhập gì | MiniBars ẩn an toàn, Ring hiện `—` | 🟡 Khá: Hiện CTA dẫn về cài đặt thu chi |
| **2. Sổ thu chi (Ledger)** | `/thu-chi` | 🟢 An toàn | 🟢 Không bịa số | DonutChart & Recharts hiện `EmptyState` chuẩn | 🟢 Tốt: Có CTA "Thêm giao dịch", "Đặt ngân sách" |
| **3. Thói quen rủi ro (Habits)** | `/thu-chi?tab=thoi-quen` | 🟢 An toàn | ⚠️ Tự đánh giá mặc định 5/10 | ScoreRing hiện `–` cho phần thực tế | 🟡 Trung bình: Thiếu hướng dẫn làm bài test |
| **4. Quỹ an toàn & Mục tiêu** | `/quy-an-toan` | 🟢 An toàn | ⚠️ Mặc định mục tiêu 6 tháng nếu chưa chọn | Vòng ScoreRing ẩn khi `!data.ready` | 🟢 Tốt: Phân biệt rõ `data.ready` |
| **5. Danh mục & Rủi ro** | `/danh-muc` | 🟡 Layout trống cục bộ | ⚠️ Gauge hiện **0/100** (nhầm thành cực kỳ rủi ro) | Bảng HoldingsCard bị trống trơn (không báo rỗng) | 🔴 Cần sửa: `HoldingsCard` mất `EmptyState` |
| **6. Thu nhập & Kỹ năng (Earn)**| `/tang-thu-nhap` | 🟢 An toàn | ⚠️ Nghề nghiệp ISCO fallback '2512' (IT) | AiMeter & ScoreRing tính điểm nghề dù chưa nhập việc | 🟡 Trung bình: Cần rỗng hoá điểm nghề nghiệp |
| **7. Lựa chọn cuộc đời (Choices)**| `/lua-chon` | 🟢 An toàn | 🟢 Không bịa số | Hiện `EmptyState` với nút "Tạo tình huống" | 🟢 Tốt: Có CTA tạo mới |
| **8. Mô phỏng cú sốc (Simulation)**| `/mo-phong` | 🟡 Nguy cơ `NaN%` ở kết quả | ⚠️ `SimulationResultPage` chia cho `before.netWorth = 0` | Fallback qua `NeedData` khi 404 | 🟡 Khá: Cần bọc chặn chia cho 0 ở kết quả |
| **9. Không gian AI (Workspace)** | `/khong-gian-ai` | 🟢 An toàn | 🟢 Không bịa số | Cột phải ActivityLog trống rỗng khi chưa chạy Run | 🟡 Cần sửa layout cột phải khi `run = null` |
| **10. Cài đặt (Settings)** | `/cai-dat` | 🟢 An toàn | 🟢 Dữ liệu trung thực | Bảng thống kê hiện "chưa có" | 🟢 Tốt |

---

## 🔎 PHẦN 2: CHI TIẾT CÁC LỖI PHÁT HIỆN ĐƯỢC

### 1. Lỗi "Điểm An Tâm Ảo 35/100" trên Tài khoản Mới Tinh
- **Vị trí file:** [`shared/engine/peace.ts`](file:///D:/07-Competitions-Hackathons/an-tam/shared/engine/peace.ts#L83-L115) & [`client/src/state/chon.ts`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/state/chon.ts#L160-L176)
- **Cơ chế lỗi:**
  ```typescript
  // Trong peaceScore(state):
  // 1. Trọng số mục tiêu (30 điểm):
  let weightSum = 0;
  let probSum = 0;
  for (const goal of state.goals) { ... }
  const avgProb = weightSum > 0 ? probSum / weightSum : 0.5; // <-- Khi 0 mục tiêu, fallback 0.5 (50%)!
  const goals = WEIGHTS.goals * avgProb; // 30 * 0.5 = 15 ĐIỂM ẢO!

  // 2. Trọng số rủi ro phù hợp (20 điểm):
  const { riskyShare } = portfolioStats(state.holdings); // = 0
  const excess = Math.max(0, riskyShare - recommended); // = 0
  const riskFit = WEIGHTS.riskFit * (1 - clamp01(excess / RISK_EXCESS_TOLERANCE)); // 20 * (1 - 0) = 20 ĐIỂM ẢO!

  // => TỔNG ĐIỂM KHI KHÔNG CÓ DỮ LIỆU: 15 + 20 = 35/100 (Cần hành động)
  ```
- **Hậu quả:** Người dùng mới mở app chưa nhập gì đã thấy hệ thống phán "35/100 điểm - Cần hành động", tạo cảm giác tiêu cực và gây nghi ngờ tính chính xác của AI.
- **Giải pháp khắc phục:** 
  Khi `state.goals.length === 0 && state.holdings.length === 0 && state.profile.monthlyIncome === 0`, trả về `score: null` hoặc trạng thái `uncalibrated: true`, hiển thị nhãn `"Chưa chấm điểm"` / `"Cần tối thiểu 3 chỉ số"`.

---

### 2. Lỗi Nguy Cơ `NaN%` trong Màn Hình Kết Quả Mô Phỏng
- **Vị trí file:** [`client/src/features/simulation/SimulationResultPage.tsx`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/features/simulation/SimulationResultPage.tsx#L60-L64)
- **Cơ chế lỗi:**
  ```tsx
  <CompareCard
    icon={Coins}
    tone="violet"
    title="Tổng tài sản"
    before={formatVnd(before.netWorth)}
    after={formatVnd(after.netWorth)}
    pill={nwDiff < 0 ? `↓ ${formatPct(-nwDiff / before.netWorth)}` : 'Không đổi'} // <-- Khi before.netWorth = 0 => 0/0 = NaN!
    note={nwDiff < 0 ? `giảm ${formatVnd(-nwDiff)}` : ''}
    worse={nwDiff < 0}
  />
  ```
- **Hậu quả:** Hiển thị nhãn `↓ NaN%` làm hỏng giao diện thẻ so sánh.
- **Giải pháp:** Bổ sung điều kiện kiểm tra `before.netWorth > 0 ? formatPct(...) : '0%'`.

---

### 3. Lỗi Trống Khung (Empty Void) tại `HoldingsCard`
- **Vị trí file:** [`client/src/features/portfolio/HoldingsCard.tsx`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/features/portfolio/HoldingsCard.tsx#L14-L46)
- **Cơ chế lỗi:**
  ```tsx
  const groups = [
    { key: 'invest', label: t('portfolio.holdings.invest'), items: holdings.filter(isInvestment) },
    { key: 'other', label: t('portfolio.holdings.other'), items: holdings.filter((h) => !isInvestment(h)) },
  ].filter((g) => g.items.length > 0);
  
  return (
    <SectionCard title={t('portfolio.holdings.title')} extra={<Button ...>Thêm</Button>}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map(...)} {/* Khi holdings = [], groups = [], div này TRẮNG TINH */}
      </div>
    </SectionCard>
  );
  ```
- **Hậu quả:** Khung "Các khoản tài sản & phân bổ" hiện lên một ô card màu trắng rỗng, không có dòng chữ giải thích hay hướng dẫn bấm "Thêm khoản đầu tiên".
- **Giải pháp:** Render `<EmptyState compact title="Chưa có khoản tài sản nào" body="Thêm tiền gửi, cổ phiếu, vàng hoặc quỹ để AI bắt đầu theo dõi rủi ro tập trung." action={<Button ...>Thêm tài sản</Button>} />` khi `holdings.length === 0`.

---

### 4. Lỗi Lệch Cột (Unbalanced Layout) tại `WorkspacePage`
- **Vị trí file:** [`client/src/features/workspace/WorkspacePage.tsx`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/features/workspace/WorkspacePage.tsx#L84-L90)
- **Cơ chế lỗi:**
  Khi `run === null` (chưa từng chạy Agent prompt):
  - Cột trái (`xl:col-span-8`) hiển thị `CommandCard` + `<EmptyState>`.
  - Cột phải (`xl:col-span-4`) có code `{run && <ActivityLog run={run} />}`, dẫn đến cột phải bị bỏ trống 100%, tạo khoảng trắng cụt bên tay phải màn hình rộng.
- **Giải pháp:** Khi `!run`, cho cột trái chiếm trọn `xl:col-span-12` hoặc render `<Card>` giới thiệu khả năng tự động hóa của 5 AI Agents ở cột phải.

---

### 5. Khởi Tạo Ban Đầu trong Store Đang Bị Gán Sẵn Hồ Sơ Mẫu C
- **Vị trí file:** [`client/src/state/mau.ts`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/state/mau.ts#L376) & [`client/src/state/store.tsx`](file:///D:/07-Competitions-Hackathons/an-tam/client/src/state/store.tsx#L21-L40)
- **Hiện trạng:**
  ```typescript
  export const TRANG_THAI_BAN_DAU: AppState = HO_SO_MAU_C; // Lê Hoàng Long, 35tr/tháng, 112tr FPT
  ```
- **Đánh giá:**
  - Giúp việc demo nhanh chóng có dữ liệu đẹp ngay lần đầu mở web.
  - Tuy nhiên đối với người dùng thật đăng ký tài khoản mới (hoặc bấm nút "Đặt lại về trạng thái rỗng"), hệ thống cần hỗ trợ chuyển đổi mượt mà giữa chế độ `HO_SO_TRONG` và các `FIXTURE` mẫu mà không bị crash.

---

## 🚀 PHẦN 3: THIẾT KẾ LUỒNG "MINIMUM ONBOARDING" (30 GIÂY)

### 🎯 Triết lý: Không khảo sát 30 trường — Chỉ lấy 4 hạt nhân kích hoạt toàn bộ AI

Hiện tại luồng Onboarding hỏi: Chọn Persona -> Thu nhập -> Chi tiêu -> Số tháng quỹ -> 5 loại tài sản -> 4 mẫu mục tiêu (10+ trường con).

### 💡 Đề xuất Luồng Tối Giản 1 Màn Hình Duy Nhất (Single-Screen Minimal Onboarding):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THIẾT LẬP NHANH TRONG 30 GIÂY                   │
│         Chỉ 4 con số ước lượng để AI kích hoạt lá chắn tài chính       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. Tên gọi & Cách xưng hô                                             │
│     [ Họ và tên: Hoàng Long_________ ]   [ Anh (•) | Chị ( ) | Bạn ( ) ]│
│                                                                        │
│  2. Thu nhập & Chi tiêu thiết yếu mỗi tháng (Ước lượng)                 │
│     [ Thu nhập hàng tháng: 30.000.000 đ ] (Ví dụ: lương, kinh doanh)    │
│     [ Chi phí thiết yếu:   15.000.000 đ ] (Tiền nhà, ăn uống, hóa đơn) │
│                                                                        │
│  3. Số tiền dự phòng / Tiền mặt sẵn sàng hiện có                       │
│     [ Tiền mặt / Tiền gửi: 50.000.000 đ ] (Đủ sống ~3.3 tháng)         │
│                                                                        │
│  4. Mục tiêu ưu tiên lớn nhất hiện nay của bạn:                        │
│     (•) Xây dựng Quỹ an toàn 6 tháng chi tiêu                          │
│     ( ) Mua nhà / Mua xe trong 3 - 5 năm tới                           │
│     ( ) Đầu tư tích sản & Độc lập tài chính                            │
│                                                                        │
│             [ Bỏ qua & Khám phá App ]      [ BẮT ĐẦU NGAY (30s) → ]    │
└────────────────────────────────────────────────────────────────────────┘
```

### ⚡ Giá trị kích hoạt tức thì (Instant Value):
1. **Tổng quan (Overview):** Tính được ngay Khả năng để dành = $30tr - 15tr = 15tr/tháng; Số tháng an toàn = $50tr / 15tr = 3.3 tháng.
2. **Quỹ an toàn (Safety):** Vẽ ngay đồng hồ Quỹ dự phòng (3.3 / 6 tháng), tự sinh 1 mục tiêu tương ứng với lựa chọn ở bước 4.
3. **Sổ thu chi (Ledger):** Tự động gợi ý ngân sách chi tiêu tháng đầu tiên dựa trên mức thiết yếu 15 triệu.
4. **Danh mục (Portfolio):** Khởi tạo 1 khoản tiền mặt 50 triệu và mời bổ sung các khoản đầu tư khác nếu có.

---

## 🎨 PHẦN 4: MA TRẬN CHUẨN HOÁ TRẠNG THÁI RỖNG (EMPTY STATES SSOT)

Toàn bộ các màn hình khi dữ liệu = 0 PHẢI tuân thủ nguyên tắc:
1. **Không bịa số:** Không hiện các con số ngẫu nhiên hoặc tính điểm giả định.
2. **Thông điệp trung thực:** Nói rõ cần thêm gì để tính năng này hoạt động.
3. **Một CTA duy nhất:** Dẫn thẳng vào modal / hành động tạo dữ liệu nhanh (< 15 giây).

| Màn hình / Khối | Biểu tượng | Tiêu đề Empty State | Nội dung giải thích | Nút hành động (CTA) |
| :--- | :---: | :--- | :--- | :--- |
| **Overview - Điểm An Tâm** | `ShieldCheck` | Chưa đủ dữ liệu chấm điểm | Nhập thu nhập và chi phí thiết yếu để AI đo lường độ bền tài chính. | `[ Nhập thu chi cơ bản ]` → Mở modal thu chi |
| **Overview - Dòng tiền 6M** | `BarChart3` | Chưa có lịch sử thu chi | Ghi chép giao dịch đầu tiên để AI theo dõi biến động dòng tiền. | `[ Ghi giao dịch đầu tiên ]` → Mở modal thêm GD |
| **Ledger - Biểu đồ dòng tiền** | `BarChart3` | Chưa có số liệu tháng này | Bạn chưa ghi nhận khoản thu hoặc chi nào trong tháng. | `[ + Ghi thu chi ]` |
| **Ledger - Cơ cấu chi tiêu** | `PieChart` | Chưa có khoản chi | Ghi nhận chi tiêu để xem cơ cấu theo nhóm thiết yếu, phát triển và trả nợ. | `[ + Thêm khoản chi ]` |
| **Safety - Quỹ an toàn** | `ShieldCheck` | Chưa thiết lập chi phí thiết yếu | Cần biết mức chi tiêu thiết yếu hàng tháng để tính số tháng dự phòng. | `[ Thiết lập mức chi ]` |
| **Safety - Danh sách mục tiêu**| `Target` | Chưa có mục tiêu tài chính | Đặt mục tiêu mua nhà, quỹ học con hoặc nghỉ hưu để AI tính xác suất đạt. | `[ + Thêm mục tiêu ]` |
| **Portfolio - Danh mục** | `PieChart` | Chưa có tài sản trong danh mục | Thêm cổ phiếu, chứng chỉ quỹ, vàng hoặc tiền gửi để AI rà soát rủi ro tập trung. | `[ + Thêm tài sản đầu tiên ]` |
| **Portfolio - Cổ phiếu cty** | `Briefcase` | Không có cổ phiếu nơi làm việc | Bạn chưa khai báo cổ phiếu ESOP từ công ty đang làm (rủi ro kép = 0). | `[ Khai báo nếu có ]` |
| **Earn - Thu nhập hiện tại** | `Wallet` | Chưa ghi nhận nguồn thu | Ghi nhận lương hoặc việc làm thêm để AI phân tích cơ cấu thu nhập. | `[ + Thêm nguồn thu ]` |
| **Earn - Lộ trình kỹ năng** | `Sprout` | Chưa chọn kỹ năng trọng tâm | Chọn mục tiêu nghề nghiệp để AI lập lộ trình học tập và kết nối việc làm thêm. | `[ Chọn kỹ năng học ]` |
| **Choices - Tình huống** | `Compass` | Chưa có lựa chọn cuộc đời | Tạo tình huống nghỉ việc, học nâng cao, mua nhà hoặc khởi nghiệp để mô phỏng. | `[ + Tạo tình huống đầu tiên ]` |
| **Workspace - Kế hoạch tuần** | `Bot` | Chưa có kế hoạch điều hành | Nhập yêu cầu để Đội ngũ AI Agent lập lịch phân bổ thời gian và tài chính tuần này. | `[ Nhập lệnh cho Agent ]` |

---

## 🛠️ PHẦN 5: DANH MỤC HÀNH ĐỘNG CẦN SỬA CODE (ACTION ITEMS)

1. **Fix `shared/engine/peace.ts`:**
   - Kiểm tra `state.goals.length === 0`: Không gán `avgProb = 0.5`, chuyển điểm mục tiêu về 0 hoặc đánh dấu `uncalibrated`.
   - Kiểm tra `state.holdings.length === 0`: Không tự động cho 20 điểm rủi ro.
2. **Fix `client/src/features/simulation/SimulationResultPage.tsx`:**
   - Chặn chia cho 0: `before.netWorth > 0 ? -nwDiff / before.netWorth : 0`.
3. **Fix `client/src/features/portfolio/HoldingsCard.tsx`:**
   - Bổ sung `<EmptyState>` khi `holdings.length === 0`.
4. **Fix `client/src/features/workspace/WorkspacePage.tsx`:**
   - Khi `run === null`, render thẻ hướng dẫn / giới thiệu đội ngũ AI Agent bên cột phải thay vì để trống.
5. **Cải tiến Luồng Onboarding:**
   - Tinh gọn các bước khởi tạo thành modal/form 4 trường siêu tốc, hỗ trợ nạp dữ liệu mẫu bằng 1 click.

---
*Báo cáo được lập tự động bởi Subagent 04 — First Time / Empty State Auditor.*
