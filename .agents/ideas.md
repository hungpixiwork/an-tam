# Ý tưởng của team và quyết định sử dụng

> File này lưu ý tưởng gốc của 4 thành viên (Uyên, Linh, Quỳnh Anh, Hưng) và ghi rõ ý nào được đưa vào bản nộp, ý nào không, vì sao. Cả team đọc để biết ý của mình nằm ở đâu trong sản phẩm.
> Gộp từ `ideas.md` và `ideas-synthesis.md` ngày 27/09/2026. Nguyên văn ý kiến được giữ đúng chữ ở mục 3.

## 1. Mỗi người đóng góp gì

| Thành viên | Hướng đề xuất | Phần trở thành cốt lõi của An Tâm |
|---|---|---|
| **Uyên** | Quản lý tài sản tính cả nghề nghiệp; cảnh báo tiền và nghề cùng rủi ro | Ý tưởng khác biệt nhất → khái niệm "tiền + nghề trong một bảng", B2, B4 |
| **Linh** | Terminal cá nhân: thử tải định lượng, bảo mật tại thiết bị, tài chính hành vi | Chiều sâu kỹ thuật → thử tải, Monte Carlo, B3 |
| **Quỳnh Anh** | Trợ lý chi tiêu cá nhân (Track A); trợ lý tài chính cho doanh nghiệp nhỏ (Track E) | Tư duy hành động: hiểu → chẩn đoán → mô phỏng → hành động; giọng văn không phán xét |
| **Hưng** | Nền tảng An Tâm đã chạy thật; triết lý an tâm; 7 việc người dùng cần; 4 giai đoạn cuộc đời | Toàn bộ code nền; Thang 5 bậc; B1 |

## 2. Ý nào được dùng

| Ý tưởng | Của | Quyết định | Lý do | Nằm ở đâu |
|---|---|:-:|---|---|
| Tính cả "tiền hiện có" và "nguồn tạo ra tiền trong tương lai" | Uyên | ✅ Dùng | Định vị trung tâm | [ba.md](specs/ba.md) §1 |
| Hồ sơ rủi ro nghề — nhạy với AI, tự động hóa (#1) | Uyên | ✅ Dùng | Dữ liệu ILO 2025 trả lời "vì sao là lúc này" | B2 |
| Phát hiện tiền và nghề cùng rủi ro (#2) | Uyên | ✅ Dùng | Điểm khác biệt chính | B4, [ba.md](specs/ba.md) §5.2 |
| Mô phỏng nhiều cú sốc cùng lúc (#3) | Uyên | ✅ Dùng | Kịch bản khủng hoảng áp theo ngành | B3 |
| Danh mục cân bằng với nghề (#4) | Uyên | ✅ Dùng, có giới hạn | Chỉ gợi ý ở mức loại tài sản / nhóm ngành, không mã cụ thể | B4 |
| Mô phỏng trước khi xuống tiền (#5) | Uyên | ✅ Dùng | "Nếu bỏ thêm X vào ngành Y thì sao" | B4 |
| Theo dõi đổi việc, cổ phiếu thưởng (#6) | Uyên | ✅ Dùng (ưu tiên thấp) | Tự tính lại khi hồ sơ nghề đổi | B4 |
| Thử tải tương tác | Linh | ✅ Dùng | Đã có 5 thanh trượt; thêm Runway có trừ hao | [ba.md](specs/ba.md) §5.1 |
| Monte Carlo + phân phối đuôi dày Student-t | Linh | ✅ Bản gọn | 1.000 lần, seed cố định, vẫn tất định | B3 |
| Prospect Theory, đo nỗi sợ thua lỗ | Linh | ✅ Nâng cấp | Đã có bài test; nay nối vào mô phỏng | B3 |
| Bảo mật tại thiết bị | Linh | 🟡 Đổi cách nói | Engine chạy được ở trình duyệt, nhưng dữ liệu lưu D1. Nói đúng: "không gửi bên thứ ba; AI không thấy con số" | [llm-strategy.md](specs/llm-strategy.md) |
| AI tự thu thập dữ liệu vĩ mô thời gian thực | Linh | 🟡 Thay thế | Dùng kịch bản khủng hoảng lịch sử từ dữ liệu công khai | B3 |
| Markowitz + Black-Litterman | Linh | ❌ Không dùng | Cần cân bằng thị trường và quan điểm nhà đầu tư — An Tâm không có; nhắc mà không làm sẽ bị giám khảo bác | — |
| WebAssembly | Linh | ❌ Để sau chung kết | TypeScript đủ nhanh cho 1.000 lần mô phỏng | — |
| Ghi chi tiêu, gợi ý hành động cụ thể, không phán xét | Quỳnh Anh | ✅ Dùng | Đã có: `spending.ts`, `nba.ts`, `narrate.ts` | Sổ thu chi, Tổng quan |
| Chu trình hiểu → chẩn đoán → mô phỏng → hành động | Quỳnh Anh | ✅ Dùng | Thành luồng demo chính | [ba.md](specs/ba.md) §8 |
| Nhập sao kê CSV, phân loại tự động | Quỳnh Anh | ❌ Ngoài phạm vi | Không đổi kết quả luồng demo trong 3 tuần | — |
| Track E — trợ lý tài chính doanh nghiệp nhỏ | Quỳnh Anh | ❌ Ngoài phạm vi | Khác đối tượng; khối lượng gấp 3–4 lần cho 1 dev | — |
| Nền tảng code, Điểm An Tâm, kế hoạch an toàn | Hưng | ✅ Giữ toàn bộ | Đã chạy thật, 95 test | [codebase-audit.md](codebase-audit.md) |
| 4 giai đoạn cuộc đời, 7 việc người dùng cần | Hưng | ✅ Dùng | Thành persona và Thang 5 bậc | [ba.md](specs/ba.md) §2–3 |
| "Quyền tự do lựa chọn trong cuộc sống" (JOB 07) | Hưng | ✅ Dùng | Đo bằng số tháng tự do và số lựa chọn đã mở khóa | B1 |
| "Phức tạp bên trong, rõ ràng bên ngoài" | Hưng | ✅ Nguyên tắc chung | Thuật ngữ chỉ nằm sau nút (i) | [codebase-audit.md](codebase-audit.md) §4 |

B1–B4: chi tiết ở [specs/breakthroughs.md](specs/breakthroughs.md).

## 3. Nguyên văn ý kiến các thành viên

<details>
<summary>Bấm để mở — giữ đúng chữ như lúc ghi lại</summary>

### 1. Ý KIẾN CỦA UYÊN: Quản trị Tài sản tích hợp Vốn con người & Rủi ro Nghề nghiệp

**Ý tưởng đề xuất:**
Cái này để lạ hơn chút thì em/chị đề xuất như này nhé: sẽ thành là app/web quản lý tài sản consider cả **“tiền hiện có”** và **“nguồn tạo ra tiền trong tương lai”**, tức là thay vì chỉ phân tích cổ phiếu, ETF, cash ctct như robo-advisor thông thường thì hệ thống còn xem nghề nghiệp của user, thu nhập, mức phụ thuộc của thu nhập vào một ngành, bonus/ESOP và các mục tiêu tài chính ngắn & dài hạn để phát hiện những rủi ro chồng lấp mà người ta thường không nhận ra.

**Các tính năng đề xuất gồm:**
1. **Hồ sơ rủi ro nghề nghiệp:** Đánh giá thu nhập của người dùng nhạy với ngành, chu kỳ kinh tế hay AI/tự động hóa đến đâu...
2. **Phát hiện rủi ro trùng lặp/chồng chéo:** Ví dụ vừa làm công nghệ, nhận cổ phiếu công ty công nghệ, lại đầu tư nhiều vào FPT chẳng hạn.
3. **Mô phỏng tài sản đa chiều:** Cùng lúc giả lập thị trường giảm, bonus giảm hoặc thu nhập gián đoạn để xem tài sản và mục tiêu mua nhà/nghỉ hưu bị ảnh hưởng thế nào.
4. **Danh mục cân bằng với nghề nghiệp:** Đề xuất cơ cấu tài sản giúp tránh việc cả thu nhập và danh mục cùng phụ thuộc vào một nguồn rủi ro (Hedging career risk).
5. **Mô phỏng quyết định trước khi đầu tư:** "Nếu bỏ thêm 200 triệu vào FPT thì mức tập trung và khả năng đạt mục tiêu thay đổi ra sao".
6. **Theo dõi biến động nghề nghiệp:** Theo dõi khi người dùng đổi job, nhận ESOP mới hoặc thu nhập thay đổi để cập nhật lại... kiểu kiểu thế.

---

### 2. Ý KIẾN CỦA LINH: Financial Terminal Cá Nhân Hóa & Quantitative Engine

#### 2.1. USP (Unique Selling Proposition)
*"Financial Terminal cá nhân hóa dành cho chuyên gia bận rộn: Kiểm thử rủi ro thông minh – Bảo mật dữ liệu tuyệt đối – Tích lũy tài sản tự động."*
- **Khác biệt với App Chứng khoán/Brokerage:** Không khuyến khích lướt sóng hay giao dịch liên tục; tập trung hoàn toàn vào quản trị rủi ro và tích lũy dài hạn.
- **Khác biệt với Robo-Advisor truyền thống:** Không dùng bảng hỏi tĩnh khô khan; cho phép người dùng chủ động kiểm thử kịch bản tâm lý và rủi ro trước khi ra quyết định xuống tiền.
- **Khác biệt với ChatGPT/Mạng xã hội:** Cung cấp mô hình tính toán định lượng có cấu trúc (Quantitative & Deterministic Engine), loại bỏ hoàn toàn thông tin nhiễu và tư vấn cảm tính.

#### 2.2. Đột phá Công nghệ (Tech Innovations & Architecture)
- **Edge Computing & Privacy-Preserving (Bảo mật tại thiết bị):** Toàn bộ dữ liệu thu nhập, tài sản và thuật toán mô phỏng được xử lý trực tiếp trên thiết bị của người dùng (Client-side). Server không lưu trữ thông tin nhạy cảm, giải quyết triệt để rào cản bảo mật dữ liệu riêng tư của nhóm Mass Affluent.
- **Multi-Factor Agentic Simulation Engine:** Tích hợp AI Agent tự động thu thập và cấu trúc hóa các dữ liệu vĩ mô (Macroeconomic Alternative Data) như chỉ số chuỗi cung ứng, biến động chính sách lãi suất, dữ liệu tiêu dùng để tạo kịch bản Stress-Test thời gian thực.
- **Lightweight WebAssembly (Wasm) Integration:** Đóng gói các thuật toán tài chính phức tạp bằng C++/Rust và chạy qua Wasm ngay trên trình duyệt web/mobile, đảm bảo tốc độ tính toán hàng nghìn kịch bản trong vài mili-giây mà không tốn chi phí Server GPU.

#### 2.3. Cơ sở Học thuật & Lý thuyết Tài chính
- **Extended Markowitz Modern Portfolio Theory (MPT):** Ứng dụng Lý thuyết Danh mục Hiện đại kết hợp mô hình Black-Litterman để tối ưu hóa tỷ lệ Risk/Return, cho phép lồng ghép quan điểm thị trường của nhà đầu tư vào mô hình toán học.
- **Monte Carlo Simulation & Heavy-Tailed Distribution:** Sử dụng mô phỏng Monte Carlo kết hợp phân phối đuôi dày (Student's t-distribution) thay cho phân phối chuẩn thông thường, giúp dự báo chính xác hơn xác suất xảy ra các sự kiện khủng hoảng hiếm gặp (Black Swan events).
- **Behavioral Finance Framework (Tài chính hành vi):** Áp dụng Prospect Theory (Lý thuyết Triển vọng) để đo lường mức độ lệch lạc hành vi và nỗi sợ thua lỗ (Loss Aversion) của khách hàng thông qua tương tác Stress-test, từ đó tinh chỉnh khẩu vị rủi ro thực tế thay vì dựa trên câu trả lời lý thuyết.

#### 2.4. Phân tích Các nhóm sản phẩm hiện có trên thị trường
- **Group A: Robo-Advisor thuần túy (Wealthfront, Betterment, Stash, Nutmeg)**
  - *Cách họ làm:* Dựa vào bảng hỏi tĩnh (3–5 câu) => Đưa ra danh mục ETF cố định => Tự động rebalance.
  - *Điểm yếu đối với tệp Mass Affluent:* Quá đơn giản, giống "hộp đen" (Black-box) làm người dùng không hiểu tại sao lại phân bổ như vậy. Thiếu công cụ Stress-test tương tác để họ thử tải danh mục.
- **Group B: Công cụ Phân tích & Stress-Test chuyên nghiệp (Portfolio Visualizer, Morningstar Direct, Riskalyze/Nitrogen)**
  - *Cách họ làm:* Cung cấp mô phỏng Monte Carlo, Backtest lịch sử và đo lường chỉ số rủi ro rất sâu.
  - *Điểm yếu đối với tệp Mass Affluent:* Giao diện cực kỳ phức tạp, thiết kế cho cố vấn tài chính (Financial Advisor/B2B) chứ không phải người dùng cuối. Yêu cầu người dùng phải có kiến thức chuyên sâu để đọc hiểu số liệu.
- **Group C: Nền tảng Quản lý tài sản số & Báo cáo (Empower/Personal Capital, Kubera)**
  - *Cách họ làm:* Kết nối API ngân hàng để theo dõi tổng tài sản (Net Worth Tracker) và dòng tiền.
  - *Điểm yếu đối với tệp Mass Affluent:* Tập trung vào quá khứ và hiện tại (đã tiêu bao nhiêu, đang có bao nhiêu), thiếu năng lực dự báo và kiểm thử kịch bản tương lai (Predictive Stress-Testing). Rất ngại vấn đề bảo mật khi phải sync tài khoản ngân hàng lên Server của bên thứ ba.

---

### 3. Ý KIẾN CỦA QUỲNH ANH: Track A (Personal Coach) & Track E (SME Copilot)

#### 3.1. TRACK A: Personal Finance Assistant

**1. Track này làm gì:**
Personal Finance Assistant là một trợ lý AI dành cho cá nhân, tập trung vào việc hiểu, quản lý và tối ưu dòng tiền hằng ngày dựa trên thu nhập và chi tiêu của người dùng.
- *Ba chức năng cốt lõi:*
  - Smart budgeting: tự động phân loại thu nhập/chi tiêu và xây dựng ngân sách cá nhân.
  - Bill analysis: phân tích hóa đơn, khoản thanh toán định kỳ, subscription và phát hiện các khoản bất thường.
  - Spending insights: nhận diện thói quen chi tiêu và nguyên nhân khiến người dùng vượt ngân sách.
  - Actionable recommendations: đưa ra hành động cụ thể, ví dụ cắt giảm một nhóm chi tiêu, điều chỉnh ngân sách hoặc thay đổi kế hoạch tiết kiệm.
- *Có thể mở rộng thành:*
  - Cash-flow forecasting
  - Savings goal planning
  - Debt repayment planning
  - Subscription detection
  - “What-if” financial simulation
- *Bản chất:* Đây là một AI financial coach: không chỉ hiển thị dữ liệu tài chính mà diễn giải dữ liệu và chuyển nó thành hành động.

**2. Trải nghiệm người dùng:**
- *Onboarding:* Người dùng cung cấp Monthly income, Fixed expenses, Variable expenses, Existing savings, Debt, Financial goals (nhập tay hoặc upload bank statement/CSV). AI tự động xây dựng financial profile.
- *Smart budgeting:* Thay vì tự đặt "Food: $300/mo", AI phân tích: "Based on your spending over the last 3 months, a realistic food budget would be $350/month."
- *Spending insights:* Dashboard hiển thị Income, Total spending, Savings rate, Spending by category, MoM changes kèm lớp AI interpretation: "Your transportation spending increased 28% this month, mainly because of ride-hailing expenses."
- *Actionable recommendations:* Không chỉ nói "bạn tiêu nhiều", mà đưa ra hành động: "Reducing food-delivery orders from 12 to 8 per month could save approximately $60."
- *What-if simulation:* "What happens if I save another $200 every month?" -> AI mô phỏng thời gian đạt goal, cumulative savings, monthly cash flow.
- *Chu trình UX:* Understand → Diagnose → Recommend → Simulate → Track.

**3. Đối tượng hướng đến:**
- Individual consumers: Gen Z, Millennials, Young professionals, College students, First-time salary earners ("Kiếm tiền nhưng không biết tiền đi đâu").
- Mở rộng B2B2C: Financial-wellness tool cho ngân hàng, fintech, employers.

**4. Thị trường:**
- Global PFM market: ~$1.32B (2026) → ~$1.79B (2030), CAGR ~8%.
- Tham khảo: YNAB, Monarch Money, Rocket Money, Cleo, Copilot Money.
- Cơ hội AI: Biến dữ liệu giao dịch thành personalized financial decisions.

**5. Mức độ khả thi:**
- Rất cao cho prototype. Không cần sàn giao dịch hay real-time stock data. Dùng synthetic transaction data / mock CSV.

**6. Yêu cầu bảo mật & pháp lý:**
- Cần encryption, secure auth, consent, data minimization. Định vị là financial education/coaching, tránh tư vấn tài chính có điều kiện (regulated financial advice).

**7. Điểm khó nhất của Track A:**
- Là tính khác biệt (Differentiation). Cần tránh bẫy generic AI wrapper/chatbot. Giá trị nằm ở chu trình phân tích và hành động thực tế.

---

#### 3.2. TRACK E: SME Finance Copilot

**1. Track này làm gì:**
SME Finance Copilot là một trợ lý tài chính AI dành cho small-business owners, đóng vai trò giống một AI CFO / financial copilot.
- *Ba chức năng chính:*
  - Financing-option matching: Phân tích revenue, cash flow, debt, repayment capacity để matching các gói: business loans, working-capital loans, credit lines, invoice financing.
  - Cash-flow management & alerts: Theo dõi inflow, outflow, AR/AP, payroll, debt payments. Forecast cash position in 30 / 60 / 90 days (VD: cảnh báo hụt thanh khoản ở tuần 7 do công nợ khách trả chậm hơn hạn trả nhà cung cấp).
  - Business financial analysis: Phân tích revenue, gross margin, burn rate, cash runway.

**2. Trải nghiệm người dùng:**
- Step 1: Business onboarding (nhập/upload CSV/Excel báo cáo tài chính, AR/AP, payroll).
- Step 2: AI xây dựng business financial health overview.
- Step 3: Cash-flow dashboard & liquidity warning.
- Step 4: Conversational AI CFO trả lời câu hỏi lớn: "Can I afford to open another location?", "What if I finance 50% of the expansion?".

**3. Đối tượng hướng đến:**
- SME owners, small-business founders, entrepreneurs, family businesses không có đủ ngân sách thuê CFO/FP&A riêng.
- Value proposition: "An AI financial copilot for businesses that cannot afford a full-time CFO."

**4. Thị trường:**
- APAC MSME financing ~$6.32T (2026); global MSME financing gap ~$5.7T.
- Nghiên cứu ADB/CCAF trên 819 MSME users: ~80% báo cáo tăng revenue, profit sau khi dùng digital finance.

**5. Mức độ khả thi:**
- Khá cao nếu giới hạn scope (phân tích báo cáo, dự báo dòng tiền, alert). Khó nếu làm realtime bank integration hay credit scoring thật.

**6. Yêu cầu dữ liệu & Bảo mật:**
- Cần nhiều dữ liệu: Doanh thu, chi phí, công nợ phải thu/phải trả, bảng lương, báo cáo tài chính. Cần định vị là AI Decision-Support, không được tự ý quyết định phê duyệt vay.

**7. Điểm khó nhất & Core Product Loop của Track E:**
- Financial reasoning: Hiểu quan hệ giữa Doanh thu tăng nhưng tiền mặt giảm (do kẹt công nợ AR).
- Core Loop: CONNECT DATA → UNDERSTAND BUSINESS → DETECT FINANCIAL RISKS → FORECAST CASH FLOW → SIMULATE SCENARIOS → RECOMMEND ACTIONS / FINANCING.

---

### 4. NỀN TẢNG & THESIS CỐT LÕI CỦA HƯNG (An Tâm AI)

#### A. THESIS CỐT LÕI:
> *“An tâm trong tài chính cá nhân không chỉ đến từ việc đầu tư tốt hơn.*  
> *Nó đến từ việc hiểu mình đang có gì, kiểm soát cách mình tiêu tiền, tạo được khoản tiết kiệm, chuẩn bị cho những biến cố có thể xảy ra, sử dụng thời gian cho những việc thực sự tạo giá trị, nâng cao năng lực kiếm tiền, và sau đó mới chuyển phần giá trị tích lũy đó thành tài sản cho tương lai.*  
> *An Tâm AI giúp người dùng từng bước biến:*  
> **THỜI GIAN → NĂNG LỰC → THU NHẬP → TIẾT KIỆM → TÀI SẢN → QUYỀN TỰ DO LỰA CHỌN TRONG CUỘC SỐNG.”**

Đây phải là **logic xuyên suốt toàn bộ sản phẩm**.  
Một người mở An Tâm AI không nhất thiết phải là “nhà đầu tư”. Họ có thể chỉ đang nghĩ những câu hỏi đời thường:
- *Tháng này tiền của mình đi đâu?*
- *Tại sao mình kiếm được nhưng vẫn không dư?*
- *Nếu nghỉ việc 3 tháng thì mình sống được bao lâu?*
- *Có nên mua món đồ này không?*
- *Mình nên tiết kiệm bao nhiêu?*
- *Mình đang dành quá nhiều thời gian cho thứ không tạo giá trị không?*
- *Làm gì để thu nhập tăng lên?*
- *Nếu mỗi tháng dư thêm ¥1.000 thì tương lai thay đổi thế nào?*
- *Nên trả nợ, giữ tiền mặt hay đầu tư?*
- *Nếu thị trường giảm mạnh thì kế hoạch cuộc sống của mình có bị phá vỡ không?*
- *Mục tiêu mua nhà / học tiếp / kết hôn / khởi nghiệp còn bao xa?*
- *Khi có tiền dư thì nên bắt đầu đầu tư như thế nào?*

An Tâm AI phải bắt đầu từ những câu hỏi đời thường như vậy.  
**KHÔNG BẮT ĐẦU TỪ:** Sharpe Ratio, Black-Litterman, Monte Carlo, MPT, Risk Parity, Student-t Distribution, Agentic Macro Engine...  
Các kỹ thuật đó có thể tồn tại bên dưới engine, nhưng **NGƯỜI DÙNG KHÔNG CẦN HỌC THUẬT TOÁN ĐỂ SỬ DỤNG SẢN PHẨM**.

> **NGUYÊN TẮC VÀNG:**  
> **COMPLEXITY INSIDE. CLARITY OUTSIDE.**  
> *(Phức tạp bên trong lõi — Tinh tế, rõ ràng bên ngoài diện mạo)*

#### B. 4 TRẠNG THÁI CUỘC ĐỜI (4 LIFE-STAGE PERSONAS)
Không khóa sản phẩm vào: *“Người 30–40 tuổi, thu nhập cao, không có thời gian nghiên cứu đầu tư.”*  
Sản phẩm phải hữu ích từ **“¥0 tài sản đầu tư”** cho đến khi đã có portfolio vững vàng:

1. **PERSONA A — STARTING (18–24 tuổi):**
   - *Bối cảnh:* Sinh viên hoặc mới đi làm. Có ít tài sản nhưng có thời gian và tiềm năng tăng thu nhập.
   - *Câu hỏi chính:* “Tôi phải làm gì hôm nay để 3–5 năm sau có nhiều lựa chọn hơn?”
   - *An Tâm AI cần giúp họ:* Hình thành thói quen tài chính; hiểu tiền đi đâu; tiết kiệm khoản đầu tiên; tránh quyết định tài chính tệ; đầu tư vào kỹ năng; sử dụng thời gian tốt hơn; tìm cách tăng thu nhập; bắt đầu tích lũy tài sản.
2. **PERSONA B — BUILDING (23–30 tuổi):**
   - *Bối cảnh:* Đã có thu nhập ổn định. Cân bằng công việc / học tập / side project / gia đình / tiết kiệm / đầu tư.
   - *Câu hỏi chính:* “Thu nhập của tôi đang tăng, nhưng tôi nên phân bổ tiền và thời gian như thế nào để tiến nhanh hơn?”
3. **PERSONA C — STABILIZING (30–40 tuổi):**
   - *Bối cảnh:* Thu nhập tương đối tốt nhưng trách nhiệm tài chính tăng (nhà, gia đình, con cái, khoản vay, tài sản đầu tư).
   - *Câu hỏi chính:* “Nếu có biến cố xảy ra, cuộc sống hiện tại của tôi có đủ an toàn không?”
4. **PERSONA D — GROWING WEALTH:**
   - *Bối cảnh:* Đã có lượng tài sản nhất định. Không muốn trading liên tục.
   - *Quan tâm:* Phân bổ tài sản, bảo vệ downside, stress-test kịch bản, mục tiêu dài hạn, rebalance, quản trị tài sản.

#### C. HÀNH TRÌNH 7 BƯỚC CON NGƯỜI (7-STEP HUMAN JOURNEY)
```text
UNDERSTAND (Hiểu tình hình hiện tại)
    ↓
CONTROL (Kiểm soát dòng tiền)
    ↓
PROTECT (Tạo vùng an toàn)
    ↓
GROW (Tăng khả năng tạo thu nhập)
    ↓
INVEST (Biến tiền dư thành tài sản)
    ↓
PREPARE (Kiểm thử các biến cố tương lai)
    ↓
LIVE (Dùng tài chính để có nhiều quyền tự do lựa chọn hơn)
```

#### D. 7 JOBS TO BE DONE CỐT LÕI
- **JOB 01 — KNOW:** “Cho tôi biết tình hình của mình đang ổn hay không.” *(Output: Tiền đang có, thu nhập, chi tiêu, tiết kiệm, nợ, tài sản, runway, tiến độ mục tiêu — không biến thành Bloomberg Terminal).*
- **JOB 02 — SPEND:** “Giúp tôi tiêu tiền mà không phải cảm thấy mỗi ngày đều đang làm kế toán.” *(Output: "Tháng này tiêu nhiều hơn ở đâu? Khoản nào đáng giữ, khoản nào không tạo giá trị? Không phán xét).*
- **JOB 03 — SAVE:** “Giúp tôi tạo khoảng cách giữa thu nhập và chi tiêu.” *(Không chỉ bảo tiết kiệm 20%, mà chỉ ra bao lâu đạt quỹ khẩn cấp, mua nhà, khởi nghiệp nếu đổi hành vi nhỏ).*
- **JOB 04 — EARN (USP CỰC MẠNH):** “Phát triển khả năng kiếm tiền trong tương lai.” *(Kết nối: TIME → SKILL → WORK → INCOME → SAVINGS → ASSETS. Ví dụ: Dùng 5h/tuần rảnh để học kỹ năng X sẽ đạt lộ trình tăng thu nhập sau 4 tháng).*
- **JOB 05 — INVEST:** “Sau khi có tiền dư, tôi nên bắt đầu thế nào?” *(Flow: Emergency fund → Short-term commitments → Debt → Investable surplus → Goal → Risk capacity → Portfolio → Explain → Stress-test).*
- **JOB 06 — PREPARE:** “Nếu chuyện xấu xảy ra thì sao?” *(Mất việc, giảm 20% thu nhập, thị trường giảm... Người dùng hiểu: "Kế hoạch cuộc sống đổi thế nào?" chứ không phải "Expected Shortfall = 17.6%").*
- **JOB 07 — LIVE:** “Tất cả những thứ này giúp cuộc sống của tôi tốt hơn như thế nào?” *(Quyền tự do lựa chọn, ít áp lực tài chính, theo đuổi đam mê, nghỉ ngơi, chăm sóc gia đình).*

#### E. 5 HÀO LŨY PHÒNG THỦ (5 MOATS)
- **MOAT 1 — WHOLE FINANCIAL LIFE:** Không chỉ đầu tư. Bao gồm: Dòng tiền + Tiết kiệm + An toàn + Thu nhập + Đầu tư + Mục tiêu cuộc đời.
- **MOAT 2 — FUTURE, NOT ONLY PAST:** Thay vì chỉ nói đã tiêu bao nhiêu, An Tâm nói: *"Nếu tiếp tục như hiện tại, mục tiêu của bạn sẽ chậm khoảng X tháng"*.
- **MOAT 3 — EARNING CAPACITY:** Khả năng tạo thu nhập tương lai là tài sản lớn nhất của người trẻ.
- **MOAT 4 — EXPLAINABLE DECISION ENGINE:** Không chỉ đưa recommendation mà luôn giải thích: **WHY — TRADE-OFF — WHAT IF — NEXT STEP**.
- **MOAT 5 — PRIVATE BY DESIGN:** Dữ liệu nhạy cảm chỉ dùng ở mức cần thiết. Ưu tiên tính toán tại client.

> **NGUYÊN TẮC PHỐI HỢP AI & CODE:**  
> **"AI HANDLES AMBIGUITY. CODE HANDLES TRUTH."**  
> *(AI xử lý sự nhập nhằng, ý định, diễn giải văn phong — Code thuần xử lý phép tính, logic số học và chân lý)*

- **Trạng thái thực tế trong Repo:** Codebase Full-stack React 19 SPA, TypeScript, Cloudflare Worker (Hono, Zod), Cloudflare D1 Database, Recharts. Đã có sẵn 10+ màn hình hoàn chỉnh từ Auth đến Dashboard, Mô phỏng và Kế hoạch an toàn.


</details>
