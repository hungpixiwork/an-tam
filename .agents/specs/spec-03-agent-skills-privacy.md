# SPEC-03: Không Gian Làm Việc AI Multi-Agent, Kiến Trúc CLI/Skills & Kiểm Toán Quyền Riêng Tư

> **Mã tài liệu:** `SPEC-03-AGENTS-SKILLS-PRIVACY`  
> **Phiên bản:** 2.3 (Cập nhật Kiến trúc CLI & Skills thay thế MCP cồng kềnh + Tuân thủ AI Compliance)  
> **Cơ sở đối chiếu:** Concept Boards 09, 10 (`An_Tam_AI_Proposal.pdf`)  
> **Trạng thái:** Sẵn sàng triển khai (Ready for Dev)

---

## 1. ĐỊNH HƯỚNG KIẾN TRÚC: CLI & SKILLS THAY THẾ MCP CỒNG KỀNH

### 1.1. Vấn Đề Lớn Của MCP Truyền Thống
- Giao thức MCP (Model Context Protocol) truyền thống ép toàn bộ schemas, công cụ và ngữ cảnh lớn vào prompt của LLM trong mỗi lượt gọi.
- Hậu quả: **Tốn token cực lớn**, tăng độ trễ (latency cao), chi phí vận hành đắt đỏ và dễ gây phân tâm (context hallucination) cho các mô hình ngôn ngữ.

### 1.2. Xu Hướng Mới: Kiến Trúc CLI & Kỹ Năng Độc Lập (CLI-First & Skill-Based Architecture)
Lấy cảm hứng từ triết lý của skill `fast-images-to-pdf`:
> *"Một script CLI thực thi tất định siêu tốc (< 1 giây), không tốn token LLM, nhận input chuẩn và trả output chính xác 100%."*

An Tâm AI áp dụng triết lý:
$$\textbf{AI handles intent \& ambiguity} \quad\longleftrightarrow\quad \textbf{CLI \& Skills handle calculation \& truth}$$

```text
[Người dùng ra lệnh tự nhiên]
             │
             ▼
   [Intent Classifier (LLM)]  ──► Chỉ trích xuất tham số & ý định (không thấy số dư tài khoản)
             │
             ▼
┌────────────────────────────────────────────────────────┐
│         BỘ KỸ NĂNG & CLI THỰC THI TẤT ĐỊNH            │
│  ├── Cashflow Skill CLI : Tính toán dòng tiền ròng     │
│  ├── Runway Skill CLI   : Tính số tháng an toàn        │
│  ├── Skill Path CLI     : Khớp lộ trình kỹ năng        │
│  └── Calendar CLI       : Thuật toán phân bổ 168 giờ   │
└────────────────────────────────────────────────────────┘
             │
             ▼
[Kế hoạch tổng hợp (Draft Plan)]
             │
             ▼
[Cổng Duyệt Con Người (Human Confirmation Gate)]  ──► Bắt buộc Idempotency-Key
             │
             ▼
[Thực thi hành động & Ghi Sổ cái Kiểm toán Bất biến (Audit Log)]
```

---

## 2. ĐỘI NGŨ 5 AGENT CHUYÊN TRÁCH DỰA TRÊN SKILLS (5 SPECIALIZED SKILL AGENTS)

Thay vì chạy 5 chatbot độc lập cồng kềnh, hệ thống vận hành 5 gói Kỹ năng / Logic chuyên biệt:

1. **Planner Agent (Điều phối Kế hoạch):**
   - *Nhiệm vụ:* Tiếp nhận mục tiêu lớn của người dùng (ví dụ: *"Tôi muốn để dành 20 triệu và học phân tích dữ liệu trong 6 tháng"*), phân rã thành các mốc hành động tuần tự.
2. **Cashflow Agent (Kiểm soát Dòng tiền):**
   - *Nhiệm vụ:* Kích hoạt script kiểm tra dòng tiền ròng, phát hiện số dư thực tế có thể trích ra mỗi tháng mà không gây thâm hụt sinh hoạt.
3. **Goal Agent (Theo dõi Mục tiêu):**
   - *Nhiệm vụ:* Đo lường tiến độ mục tiêu, tính toán số tiền cần bổ sung định kỳ và dự phóng ngày về đích.
4. **Skill Agent (Phát triển Năng lực):**
   - *Nhiệm vụ:* Tra cứu danh mục kỹ năng, khớp mục tiêu nghề nghiệp với lộ trình học tập cụ thể (khung thời gian 5h/tuần).
5. **Calendar Agent (Quản trị Lịch trình):**
   - *Nhiệm vụ:* Tìm kiếm các khung giờ trống phù hợp trong tuần, tạo khối thời gian và gọi lệnh tạo lịch (`wx.addPhoneCalendar` trên Weixin hoặc Google Calendar trên Web).

---

## 3. CỔNG DUYỆT CON NGƯỜI & CHỐNG TRÙNG LẬP (HUMAN CONFIRMATION GATE & IDEMPOTENCY)

### 3.1. Nguyên Tắc "Human-in-the-Loop" Tuyệt Đối
AI **không bao giờ tự ý sửa dữ liệu hoặc tự ý ghi ra bên ngoài** khi chưa có sự xác nhận rõ ràng của người dùng:
$$\text{Pending (Đề xuất)} \xrightarrow{\text{Người dùng xem Preview \& Duyệt}} \text{Approved} \longrightarrow \text{Executing} \longrightarrow \text{Done}$$

### 3.2. Chống Trùng Lặp Giao Dịch (`Idempotency-Key`)
- Mọi thao tác phê duyệt (`/api/agent/actions/:id/approve`) bắt buộc phải gửi kèm header `Idempotency-Key: <UUID>`.
- Cơ sở dữ liệu sử dụng mệnh đề nguyên tử:
  ```sql
  UPDATE agent_actions 
  SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
  WHERE id = ? AND status = 'pending';
  ```
- Nếu người dùng bấm đúp hoặc mạng chập chờn gửi 2 lần, hệ thống trả về HTTP `409 Conflict`, đảm bảo hành động chỉ được thực thi duy nhất 1 lần.

---

## 4. MINH BẠCH, QUYỀN RIÊNG TƯ & SỔ CÁI KIỂM TOÁN (TRUST, PRIVACY & AI AUDITABILITY)

### 4.1. Phân Tầng Nhãn Nội Dung AI Tuân Thủ Pháp Lý (GenAI Compliance Labeling)
Tuân thủ quy định dán nhãn nội dung AI (có hiệu lực từ 01/09/2025): Mọi thông tin trên giao diện An Tâm AI bắt buộc phải phân định rõ ràng 3 cấp độ:

| Nhãn hiển thị | Bản chất kỹ thuật | Ví dụ minh họa |
| :--- | :--- | :--- |
| 🔢 **Tính toán chuẩn xác (Calculated)** | Kết quả từ công thức toán học tất định, sự thật 100% | *"Số tháng an toàn của bạn hiện tại là 4.2 tháng."* |
| 💡 **AI Diễn giải (AI Interpretation)** | Lời phân tích ý nghĩa theo hoàn cảnh thực tế | *"Mức an toàn này hiện thấp hơn ngưỡng 6 tháng mà bạn đã chọn."* |
| 📊 **Dự phóng ước tính (Estimate)** | Mô hình kịch bản có điều kiện giả định | *"Với tốc độ tích lũy hiện tại, bạn có thể đạt 6 tháng trong khoảng 5 tháng tới."* |

### 4.2. Sổ Cái Kiểm Toán Bất Biến (Immutable Audit Log)
Mọi hành động của AI (đề xuất, phân tích, tạo lịch) đều được ghi vào bảng `audit_log` với cơ chế chuỗi băm (Hash-Chained):

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Không thiết lập Foreign Key để hỗ trợ xóa tài khoản mà không mất vết kiểm toán
  action TEXT NOT NULL,
  related_data_type TEXT NOT NULL,
  payload_anonymized TEXT, -- ĐÃ ẨN DANH: Tuyệt đối không chứa số dư hay tên thật
  status TEXT NOT NULL, -- 'completed', 'approved', 'rejected', 'reviewed'
  actor TEXT NOT NULL CHECK (actor IN ('auto', 'you')),
  prev_hash TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Trigger SQLite chặn hoàn toàn lệnh UPDATE hoặc DELETE (Append-Only)
CREATE TRIGGER block_audit_log_update BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(FAIL, 'Lỗi bảo mật: Không được phép chỉnh sửa sổ cái kiểm toán audit_log');
END;
```

### 4.3. Quản Trị Dữ Liệu Cá Nhân (Data Privacy Controls)
1. **Nguyên tắc "Không gửi số dư cho LLM":**
   - Khi người dùng trò chuyện với AI, câu hỏi được hệ thống ẩn danh hóa tại máy trạm/client trước khi gửi qua API (ví dụ: *"Tôi muốn học thạc sĩ"* thay vì gửi kèm *"Tôi đang có 520 triệu trong tài khoản"*).
2. **Quyền Xuất Dữ Liệu Toàn Diện (Full Data Export):**
   - Cung cấp tính năng tải toàn bộ lịch sử giao dịch, mục tiêu, lộ trình kỹ năng thành file JSON/ZIP chuẩn GDPR.
3. **Quyền Được Lãng Quên (Right to be Forgotten):**
   - Người dùng bấm xóa tài khoản ➔ Hệ thống xóa sạch dữ liệu cá nhân, chỉ giữ lại mã băm ẩn danh trên sổ cái kiểm toán để phục vụ đối soát an toàn thông tin.

---

## 5. LƯỢNG HÓA DỮ LIỆU & HỢP ĐỒNG API (DATA SCHEMA & APIS)

### 5.1. Bảng Dữ Liệu D1 SQLite Quản Lý Agent & Hành Động
```sql
-- Lượt ra lệnh cho AI
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_prompt TEXT NOT NULL,
  status TEXT DEFAULT 'planning', -- 'planning', 'awaiting_approval', 'executing', 'completed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Các bước thực hiện chi tiết của từng Agent
CREATE TABLE agent_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  agent_name TEXT NOT NULL, -- 'planner', 'cashflow', 'goal', 'skill', 'calendar'
  status TEXT DEFAULT 'completed',
  summary TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Hành động đề xuất chờ duyệt
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  target_tool TEXT NOT NULL, -- 'phone_calendar', 'google_calendar', 'budget_update', 'goal_create'
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT
);
```

### 5.2. Danh Sách Endpoints Cốt Lõi
- `POST /api/agent/runs`: Tiếp nhận câu lệnh mục tiêu từ người dùng ➔ Chạy quy trình điều phối giữa các Kỹ năng.
- `GET /api/agent/runs/:id`: Lấy tiến độ thực thi của các Agent và danh sách hành động đề xuất.
- `POST /api/agent/actions/:id/approve`: Cổng duyệt con người (bắt buộc `Idempotency-Key`).
- `POST /api/agent/actions/:id/reject`: Từ chối hành động do AI đề xuất.
- `GET /api/audit`: Lấy danh sách nhật ký kiểm toán công khai cho người dùng tra cứu.
- `DELETE /api/me`: Yêu cầu xóa tài khoản vĩnh viễn và tạo bản ghi tombstone.
