# SPEC-02: Động Cơ Mô Phỏng Quyết Định Cuộc Đời & Rủi Ro Danh Mục Tích Hợp

> **Mã tài liệu:** `SPEC-02-SIMULATION-RISK`  
> **Phiên bản:** 2.3 (Cập nhật tuân thủ định vị Weixin Mini Program & FinTechathon WeBank)  
> **Cơ sở đối chiếu:** Concept Boards 07, 08 (`An_Tam_AI_Proposal.pdf`)  
> **Trạng thái:** Sẵn sàng triển khai (Ready for Dev)

---

## 1. TỔNG QUAN TÍNH NĂNG MŨI NHỌN (HERO FEATURE OVERVIEW)

### 1.1. Triết Lý & Vị Trí Cốt Lõi
Hầu hết các công cụ tài chính dừng lại ở các biểu đồ thống kê quá khứ. An Tâm AI tiến xa hơn một bước: **Giúp người dùng đánh giá các quyết định rẽ hướng cuộc đời (Life Choices) trước khi quyết định thực hiện**.

Khẩu hiệu cốt lõi:
> **"Trước mỗi quyết định lớn, biết chắc mình có kham nổi không."**  
> *(Know if you can afford your next big life decision — before you make it.)*

### 1.2. Định Vị Tuân Thủ Pháp Lý Thị Trường (Compliance & Positioning)
> **Quy định nghiêm ngặt về tư vấn tài chính trên Weixin Mini Program & FinTech Regulation:**
> - ❌ **TUYỆT ĐỐI KHÔNG:** Gợi ý mua/bán mã cổ phiếu cụ thể (*"Mua mã này"*, *"Bán mã kia"*, *"Khuyến nghị danh mục 60/40"*). Mini Program tư vấn chứng khoán trái phép sẽ bị đình chỉ hoạt động.
> - ✅ **TẬP TRUNG VÀO:** Giáo dục tài chính, nhận thức rủi ro (Risk Literacy), phân tích mức độ tập trung tài sản (Concentration Risk), thử tải kịch bản (Scenario Stress-Testing), và mô phỏng cân bằng giữa Tiền bạc & Cuộc sống.
> - **Nguyên tắc phân tầng:** Đầu tư chỉ xuất hiện **sau khi** hoàn thành: *Quỹ an toàn khẩn cấp ➔ Cam kết tài chính ngắn hạn ➔ Xử lý nợ xấu ➔ Thặng dư có thể đầu tư ➔ Mục tiêu cụ thể ➔ Khả năng chịu đựng rủi ro*.

---

## 2. ĐỘNG CƠ MÔ PHỎNG QUYẾT ĐỊNH CUỘC ĐỜI (LIFE OPTION SIMULATION)

### 2.1. Các Tình Huống Cuộc Đời Điển Hình (Typical Life Questions)
Người dùng thường đối mặt với các câu hỏi lớn:
1. *"Tôi có thể nghỉ việc 2 năm để học Thạc sĩ toàn thời gian không?"*
2. *"Tôi có đủ khả năng tài chính để bắt đầu kinh doanh riêng / mở studio lúc này không?"*
3. *"Tôi có kham nổi chi phí chuyển nơi sinh sống sang thành phố mới hoặc xuất ngoại không?"*
4. *"Liệu tôi có thể nghỉ hưu sớm hoặc làm việc bán thời gian từ năm 40 tuổi?"*

### 2.2. So Sánh Đa Phương Án Đặt Cạnh Nhau (Side-by-Side 3-Year Comparison)
Động cơ tính toán dự phóng kết quả tài chính và đời sống sau 3 năm giữa các lựa chọn:

| Tiêu chí đánh giá | Phương án A: Giữ việc & Tích lũy | Phương án B: Nghỉ việc học Thạc sĩ | Phương án C: Làm thêm / Khởi nghiệp |
| :--- | :---: | :---: | :---: |
| **Thu nhập hàng tháng** | 25.000.000 đ | 8.000.000 đ *(trợ cấp/part-time)* | 28.000.000 đ |
| **Tổng thu nhập sau 3 năm** | 900.000.000 đ | 420.000.000 đ | 820.000.000 đ |
| **Tổng tích lũy sau 3 năm** | 420.000.000 đ | 180.000.000 đ | 380.000.000 đ |
| **Áp lực tài chính (Pressure)** | 🟢 **Thấp (Low)** | 🟡 **Trung bình (Medium)** | 🟡 **Trung bình (Medium)** |
| **Cơ hội bứt phá nghề nghiệp** | Ổn định (Stable) | 🚀 **Rất cao (High)** | 🚀 **Rất cao (High)** |
| **Độ linh hoạt tương lai** | Thấp | Trung bình | Rất cao |

### 2.3. Ba Cấp Độ Đánh Giá Khả Thi & Điều Kiện Mở Khóa
Mỗi lựa chọn được gán một trạng thái rõ ràng do thuật toán tất định chấm điểm:
1. 🟢 **Kham nổi (Affordable):** Quỹ dự phòng sau khi trừ chi phí vẫn duy trì $\ge 6$ tháng chi tiêu thiết yếu.
2. 🟡 **Kham nổi có điều kiện (Conditionally Affordable):** Cần tích lũy thêm một khoản cụ thể trước khi kích hoạt.
   - *Ví dụ:* "Nghỉ việc học Thạc sĩ: Kham nổi nếu bạn để dành thêm 1.500.000 đ/tháng trong vòng 8 tháng tới để nâng quỹ dự phòng từ 4.2 tháng lên 6 tháng."
3. 🔴 **Chưa kham nổi (Not Yet Feasible):** Tiềm ẩn nguy cơ cạn kiệt thanh khoản giữa chừng.

---

## 3. RỦI RO TẬP TRUNG TỔNG TÀI SẢN & VỐN CON NGƯỜI (PORTFOLIO & CAREER OVERLAP RISK)

### 3.1. Vấn Đề Lớn: Mối Nguy Hiểm Kép (Double Fragility)
Đa số mọi người đầu tư vào ngành mình am hiểu nhất. Một kỹ sư công nghệ thường mua cổ phiếu công nghệ và giữ cổ phiếu thưởng (ESOP) của công ty mình làm việc. Khi ngành công nghệ suy thoái:
- Công ty cắt giảm thưởng / sa thải ➔ **Mất thu nhập từ việc làm**.
- Cổ phiếu công nghệ lao dốc ➔ **Mất luôn giá trị tài sản tích lũy**.

### 3.2. Công Thức Đo Mức Độ Tập Trung Rủi Ro Tích Hợp
Cơ sở học thuật: Bodie, Merton & Samuelson (1992); Campbell & Viceira (2002); Davis & Willen (2000).

$$C_s = \frac{\beta_{\text{nghề}, s} \cdot HC + \text{Tài sản tài chính thuộc ngành } s}{HC + \text{Tổng tài sản tài chính}}$$

- $HC$: Vốn con người (giá trị hiện tại thu nhập tương lai).
- $\beta_{\text{nghề}, s}$: Hệ số tương quan giữa nghề nghiệp của người dùng với ngành $s$ ($0 \le \beta \le 1$).
- Ngưỡng cảnh báo:
  - Vàng (Cần lưu ý): $C_s > 40\%$.
  - Đỏ (Báo động tập trung cao): $C_s > 60\%$.
  - *Ví dụ hiển thị:* **"70/100 Điểm rủi ro tập trung — 45% tài sản và 80% thu nhập của bạn đang phụ thuộc hoàn toàn vào ngành Công nghệ."**

---

## 4. BỘ MÔ PHỎNG TRƯỚC KHI XUỐNG TIỀN (WHAT-IF SIMULATOR)

### 4.1. Luồng Trải Nghiệm Người Dùng (Interactive What-If Flow)
Trước khi người dùng quyết định bỏ một khoản tiền lớn vào một kênh đầu tư:
1. **Người dùng chọn:**
   - Kênh/Ngành dự kiến rót vốn (ví dụ: Cổ phiếu công nghệ, Bất động sản, Vàng).
   - Số tiền dự kiến đầu tư (ví dụ: 50.000.000 đ).
2. **Hệ thống tính toán ngay lập tức (Local / Deterministic):**
   - Tỷ trọng ngành công nghệ tăng từ **45% ➔ 56%**.
   - Điểm rủi ro tập trung nhảy từ **70/100 ➔ 82/100 (Báo động)**.
   - Quỹ an toàn thanh khoản giảm từ **4.2 tháng ➔ 2.8 tháng (Dưới mức chuẩn)**.
3. **Kết luận khách quan:** Cảnh báo người dùng cần cân nhắc đa dạng hóa sang lớp tài sản phòng thủ trước khi tiếp tục gia tăng tỷ trọng rủi ro.

---

## 5. THỬ TẢI BIẾN CỐ THỊ TRƯỜNG (MARKET STRESS-TEST)

### 5.1. Mô Phỏng 5 Cú Sốc Tài Chính Thực Tế
1. **Thị trường chứng khoán giảm mạnh (-30%):** Tác động tới danh mục cổ phiếu và tâm lý bán tháo.
2. **Mất nguồn thu nhập chủ động trong 6 tháng:** Kiểm tra khả năng sinh tồn của quỹ dự phòng.
3. **Lạm phát chi phí sinh hoạt tăng đột biến (+15%):** Sức ép lên dòng tiền ròng hàng tháng.
4. **Lãi suất vay mua nhà tăng (+3%):** Đo lường áp lực nợ gốc và lãi.
5. **Chi phí y tế / gia đình bất ngờ:** Đo lường sức chống chịu của cấu trúc tài sản.

---

## 6. LƯỢNG HÓA DỮ LIỆU & HỢP ĐỒNG API (DATA SCHEMA & APIS)

### 6.1. Bảng Dữ Liệu D1 SQLite
```sql
-- Lựa chọn cuộc đời
CREATE TABLE life_choices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'education', 'career_change', 'business', 'relocation', 'retirement'
  status TEXT DEFAULT 'evaluating', -- 'evaluating', 'active', 'archived'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Các phương án so sánh trong một lựa chọn
CREATE TABLE life_choice_options (
  id TEXT PRIMARY KEY,
  choice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  monthly_income REAL NOT NULL,
  monthly_expense REAL NOT NULL,
  duration_months INTEGER DEFAULT 36,
  one_time_cost REAL DEFAULT 0,
  feasibility_score REAL,
  status_label TEXT -- 'affordable', 'conditional', 'not_feasible'
);

-- Danh mục tài sản đầu tư
CREATE TABLE holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stock', 'fund_etf', 'bond', 'cash', 'crypto', 'other'
  symbol TEXT,
  name TEXT NOT NULL,
  sector TEXT NOT NULL, -- 'tech', 'finance', 'consumer', 'real_estate', 'healthcare', 'other'
  amount REAL NOT NULL,
  is_employer_stock INTEGER DEFAULT 0, -- Cờ cổ phiếu công ty mình làm
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2. Danh Sách Endpoints Cốt Lõi
- `GET /api/life-choices`: Lấy danh sách các lựa chọn cuộc đời đang theo dõi và kịch bản mẫu.
- `POST /api/life-choices/evaluate`: Chạy engine đánh giá tính khả thi và điều kiện mở khóa cho một phương án.
- `POST /api/life-choices/compare`: So sánh 2–3 phương án cạnh nhau sau 3 năm.
- `GET /api/portfolio/risk`: Lấy cơ cấu tài sản, chỉ số rủi ro tập trung $C_s$, và phơi nhiễm cổ phiếu công ty.
- `POST /api/portfolio/what-if`: Thử trước tác động lên cơ cấu danh mục và điểm rủi ro khi đầu tư thêm khoản tiền mới.
