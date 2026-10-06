# SPEC-01: Quản Trị Dòng Tiền, Quỹ An Toàn & Giá Trị Nghề Nghiệp (Vốn Con Người)

> **Mã tài liệu:** `SPEC-01-CORE-FINANCE`  
> **Phiên bản:** 2.3 (Cập nhật kiến trúc Weixin Mini Program + CloudBase + Taro/React)  
> **Cơ sở đối chiếu:** Concept Boards 01, 02, 03, 04, 05, 06 (`An_Tam_AI_Proposal.pdf`)  
> **Trạng thái:** Sẵn sàng triển khai (Ready for Dev)

---

## 1. TỔNG QUAN & TẦM NHÌN SẢN PHẨM (VISION & PERSONA)

### 1.1. Triết lý Sản phẩm (Human-Centered Philosophy)
An Tâm AI không phải là một ứng dụng lướt sóng trading hay sổ kế toán khô khan. Sản phẩm giải quyết nỗi bất an tài chính thông qua chuỗi giá trị cốt lõi:
$$\text{THỜI GIAN} \longrightarrow \text{KỸ NĂNG} \longrightarrow \text{THU NHẬP} \longrightarrow \text{TIẾT KIỆM} \longrightarrow \text{AN TOÀN} \longrightarrow \text{TÀI SẢN} \longrightarrow \text{TỰ DO LỰA CHỌN}$$

### 1.2. Chặng Hành trình Người dùng (7-Stage User Journey)
1. **Hiểu rõ (Understand):** Nắm bắt bức tranh tổng quan tài sản, dòng tiền và số tháng an toàn hiện tại trong 60 giây đầu tiên.
2. **Kiểm soát (Control):** Quản lý thu chi hàng ngày, phát hiện các khoản rò rỉ vô hình (*invisible leakage*) mà không tốn công ghi chép phức tạp.
3. **Bảo vệ (Protect):** Thiết lập quỹ an toàn tối thiểu (3–6 tháng) trước khi tính đến đầu tư rủi ro.
4. **Tăng trưởng (Grow):** Nâng cao giá trị nghề nghiệp (Vốn con người) bằng việc học kỹ năng mới, tăng thu nhập chủ động.
5. **Đầu tư (Invest):** Chỉ phân bổ tiền nhàn rỗi sau khi nền móng tài chính đã vững chắc, tập trung đa dạng hóa thay vì đầu cơ.
6. **Chuẩn bị (Prepare):** Thử tải tài chính trước các biến cố (sa thải, ốm đau, lạm phát).
7. **Tự do (Live):** Tự tin đưa ra các quyết định bước ngoặt cuộc đời (học lên thạc sĩ, chuyển việc, khởi nghiệp).

### 1.3. Nhân vật Trọng tâm (Demo Persona)
- **Linh / Xiao Lin (24 tuổi):** Mới đi làm năm thứ 2, thu nhập 12.000.000 đ (hoặc ¥12.000), có mong muốn học thêm kỹ năng Phân tích Dữ liệu / AI và phân vân liệu có thể nghỉ việc 6 tháng để đi học hay không.

---

## 2. QUẢN TRỊ DÒNG TIỀN THÔNG MINH (SMART CASH FLOW CONTROL)

### 2.1. Tiếp nhận Dữ liệu Thu Chi Bản địa hóa Weixin (Data Ingestion Architecture)
> **Quy định tuân thủ bảo mật WeChat Pay:** Weixin Mini Program **không có API đọc lịch sử giao dịch cá nhân**. An Tâm AI thiết kế phương thức nhập liệu nhẹ nhàng, không ma sát, không biến app thành phần mềm kế toán:

1. **Ghi nhanh bằng giọng nói (Voice Expense Entry):**
   - Người dùng bấm giữ nút micro và nói câu tự nhiên: *"Trưa nay ăn bún bò 45 nghìn"* hoặc *"Lunch 38 yuan"*.
   - Engine AI nhận diện: `{ amount: 45000, category: "food", date: "today" }`.
   - Phản hồi tức thì bằng ngữ cảnh ngân sách: *"Bạn đã ghi nhận 45.000đ ăn trưa. Ngân sách ăn uống tuần này vẫn còn an toàn."*
2. **Chạm nhanh (Quick Add Tap):**
   - Các nút chip gợi ý khoản chi thường gặp: Ăn uống, Tiền xe, Cà phê, Siêu thị. Nhập số tiền trong 2 chạm.
3. **Chụp biên lai / Chụp ảnh màn hình thanh toán (OCR Receipt / Screenshot):**
   - Tải ảnh chụp màn hình chuyển khoản hoặc hóa đơn ➔ Trích xuất số tiền, người nhận, thời gian.
4. **Nhập file sao kê (CSV / Excel Import):**
   - Cho phép tải file đối soát ngân hàng định kỳ.

### 2.2. Kiểm soát Dòng tiền Ròng & Ngân sách (Net Cash Flow & Budgeting)
- **Dòng tiền ròng tháng:**
  $$\text{Dòng tiền ròng} = \text{Tổng thu nhập thực nhận} - \text{Tổng chi tiêu thực tế}$$
- **Ngân sách động (Rolling Monthly Budget):**
  - Giám sát mức tiêu dùng theo thời gian thực (ví dụ: đã dùng 68% hạn mức chi tiêu tháng).
  - Tự động cảnh báo khi một danh mục chi vượt tốc độ trung bình tháng (> 15% so với tuần trước).
- **Hóa đơn lặp định kỳ (Recurring Bills):**
  - Theo dõi tiền nhà, tiền điện, internet, phí bảo hiểm hàng tháng; tự động đối chiếu khi có khoản chi tương ứng xuất hiện.

---

## 3. QUỸ AN TOÀN & ĐO LƯỜNG RUNWAY (EMERGENCY FUND & SAFETY PERIOD)

### 3.1. Công thức Tính Số Tháng An Toàn (Deterministic Safety Period)
Số tháng an toàn phản ánh người dùng có thể duy trì cuộc sống bao lâu nếu nguồn thu nhập chính biến mất đột ngột:

$$\text{Số tháng an toàn} = \frac{\sum (\text{Tài sản khả dụng}_i \times (1 - \text{Tỷ lệ trừ hao khi bán gấp}_i))}{\text{Chi tiêu thiết yếu hàng tháng} - \text{Thu nhập thụ động / Hỗ trợ tối thiểu}}$$

#### Bảng Trừ hao Thanh khoản (Liquidity Haircut Table):
| Lớp tài sản | Tỷ lệ trừ hao ($h_i$) | Ghi chú |
| :--- | :---: | :--- |
| **Tiền mặt, tiền gửi thanh toán, tiết kiệm không kỳ hạn** | **0%** | Rút được ngay không mất giá |
| **Tiền gửi có kỳ hạn, trái phiếu chuẩn** | **5%** | Mất một phần lãi suất nếu tất toán sớm |
| **Chứng chỉ quỹ mở (ETFs / Mutual Funds)** | **10%** | Tốn 2–3 ngày làm việc (T+2/T+3) và phí giao dịch |
| **Cổ phiếu niêm yết (Stocks)** | **30%** | Khả năng biến động giá và áp lực bán tháo |
| **Khác (Vàng, Đô la, Tài sản khác)** | **50%** | Chênh lệch giá mua bán và thanh khoản chậm |

### 3.2. Cột Mốc An Toàn & Chuẩn Đo Lường
- **Vùng Báo động (< 3 tháng):** Mọi quyết định chi tiêu lớn hoặc đầu tư rủi ro đều bị cảnh báo dừng lại.
- **Vùng Khuyến nghị (3 – 6 tháng):** Đảm bảo an tâm trước các biến cố ngắn hạn (sa thải, tìm việc mới).
- **Vùng Vững chắc (≥ 12 tháng):** Đủ điều kiện kích hoạt các bước ngoặt cuộc đời (Life Choices).

### 3.3. Phân Tầng Mục Tiêu Cuộc Sống (Hierarchical Goals)
Mọi mục tiêu được chia thành 3 chân trời:
1. **Ngắn hạn (< 1 năm):** Quỹ dự phòng khẩn cấp, mua sắm thiết bị làm việc, chuyến đi tái tạo năng lượng.
2. **Trung hạn (1 – 3 năm):** Quỹ học thạc sĩ, vốn khởi nghiệp ban đầu, tiền cưới hỏi.
3. **Dài hạn (> 3 năm):** Mua nhà, quỹ hưu trí tự do, giáo dục con cái.

---

## 4. TĂNG THU NHẬP QUA KỸ NĂNG — VỐN CON NGƯỜI (GROW INCOME THROUGH SKILLS)

### 4.1. Định Giá Vốn Con Người (Human Capital Valuation)
Vốn con người là giá trị hiện tại của toàn bộ dòng thu nhập từ lao động trong tương lai:
$$HC = \sum_{t=1}^{T} \frac{\text{Thu nhập năm dự phóng}_t}{(1 + r + g)^t}$$
Trong đó $T$ là số năm còn làm việc đến tuổi nghỉ hưu, $r$ là tỷ lệ chiết khấu, $g$ là tốc độ tăng lương tự nhiên.

### 4.2. Mối Liên Kết Giữa Học Kỹ Năng & Tăng Thu Nhập (Skill-to-Income Mapping)
AI phân tích nghề nghiệp hiện tại và mức độ ảnh hưởng của AI/Công nghệ để đề xuất lộ trình:
- **Lộ trình Kỹ năng Mũi nhọn:**
  - *Data Analysis (Excel, SQL, PowerBI, Python):* Thời gian 1–3 tháng ➔ Tiềm năng tăng thu nhập: **+40%**.
  - *Ứng dụng AI Nâng cao Năng suất (Prompting, Workflow Automation):* Thời gian 1–2 tháng ➔ Tiềm năng: **+35%**.
  - *Xây dựng Website No-code & Digital Marketing:* Thời gian 1–2 tháng ➔ Tiềm năng: **+30%**.
- **Gợi ý Cơ hội Gia tăng Thu nhập (Suggested Opportunities):**
  - Nhận dự án làm thêm (Freelance Data Analyst): Thu nhập ước tính 8–15 triệu/tháng (độ khớp hồ sơ 92%).
  - Dự án thiết kế Landing Page / No-code: 5–12 triệu/dự án (độ khớp 86%).

---

## 5. LỊCH TRÌNH AI & PHÂN BỔ THỜI GIAN (AI CALENDAR & TIME ALLOCATION)

### 5.1. Triết Lý 168 Giờ / Tuần
Muốn tăng thu nhập và đạt mục tiêu tài chính, người dùng phải **biến ý định thành hành động trên lịch**:
$$\text{Tổng quỹ thời gian 1 tuần} = 168 \text{ giờ} = \text{Công việc chính (40h)} + \text{Học kỹ năng (5–10h)} + \text{Tài chính (2h)} + \text{Sức khỏe & Gia đình (30h)} + \text{Nghỉ ngơi (80h)}$$

### 5.2. Luồng Lên Lịch Weixin-Native (Phone Calendar Integration)
> **Thay đổi kiến trúc quan trọng cho thị trường Weixin:** Thay vì phụ thuộc vào Google Calendar vốn bị hạn chế tại Trung Quốc, bản Weixin Mini Program sử dụng API hệ điều hành:
> 
> $$\text{AI đề xuất lịch} \longrightarrow \text{Người dùng xem trước (Preview)} \longrightarrow \text{Duyệt (Confirm)} \longrightarrow \text{Gọi } \texttt{wx.addPhoneCalendar}$$

- **Hỗ trợ quốc tế:** Vẫn duy trì tích hợp OAuth với Google Calendar cho phiên bản Web / Global.
- **Các khối thời gian mẫu (Smart Time Blocks):**
  - Thứ 2, 4, 6 (19:30 – 21:00): Tự học Phân tích Dữ liệu / AI.
  - Sáng Thứ 7 (09:00 – 10:00): Rà soát sổ thu chi tuần và kế hoạch tài chính.

---

## 6. LƯỢNG HÓA DỮ LIỆU & HỢP ĐỒNG API (DATA SCHEMA & APIS)

### 6.1. Bảng Dữ Liệu Cốt Lõi (D1 SQLite Schema)
```sql
-- Giao dịch thu chi
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'ocr', 'csv', 'sepay')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Ngân sách tháng
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Định dạng YYYY-MM
  category TEXT DEFAULT 'all',
  limit_amount REAL NOT NULL,
  UNIQUE(user_id, month, category)
);

-- Mục tiêu tài chính
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  deadline TEXT,
  horizon TEXT CHECK (horizon IN ('short', 'mid', 'long')),
  icon TEXT DEFAULT 'target',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sự kiện lịch học tập và tài chính
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  category TEXT CHECK (category IN ('finance', 'skill', 'work', 'health', 'personal')),
  source TEXT DEFAULT 'ai_suggested',
  is_synced INTEGER DEFAULT 0
);
```

### 6.2. Danh Sách Endpoints Cốt Lõi (Worker Routes)
- `GET /api/overview`: Trả về điểm An Tâm, số tháng an toàn, dòng tiền tháng, lịch trình hôm nay.
- `GET /api/ledger/dashboard?month=YYYY-MM`: Chi tiết thu chi, phân bổ nhóm, tiến độ ngân sách.
- `POST /api/ledger/quick-add`: Nhập nhanh giao dịch qua form hoặc kết quả bóc tách voice.
- `POST /api/ledger/parse-voice`: Gửi audio/text câu nói ➔ Nhận diện thực thể `{amount, category, date}`.
- `GET /api/safety`: Tính toán số tháng an toàn có trừ hao thanh khoản và 3 kịch bản xấu/bình thường/tốt.
- `GET /api/earn/dashboard`: Chỉ số giá trị nghề nghiệp, lộ trình học kỹ năng, cơ hội việc làm thêm.
- `POST /api/calendar/auto-schedule`: Lập lịch học và quản lý tài chính dựa trên mục tiêu đã đặt.
