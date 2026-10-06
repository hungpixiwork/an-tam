# 🤖 Hướng Dẫn Thiết Lập Custom GPT "An Tâm AI" Cho ChatGPT

Tài liệu này hướng dẫn bạn tạo một **Custom GPT (GPTs)** riêng trên ChatGPT (hỗ trợ ChatGPT Plus, Team và Enterprise) kết nối trực tiếp với backend An Tâm AI thông qua **Actions (OpenAPI)**.

---

## 🛠️ CÁC BƯỚC THIẾT LẬP (5 PHÚT)

### Bước 1: Mở Trình Tạo Custom GPT
1. Truy cập [https://chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor) hoặc vào menu **Explore GPTs** → Bấm **Create**.
2. Chọn tab **Configure** (Cấu hình).

---

### Bước 2: Điền Thông Tin Cơ Bản (Basic Info)

* **Name**: `An Tâm AI - Cố Vấn Tài Chính An Nhiên`
* **Description**: `Cố vấn tài chính cá nhân thông minh, tính Điểm An Tâm (Peace Score), quản lý sổ thu chi và cảnh báo rủi ro tập trung.`
* **Instructions**: Copy toàn bộ nội dung từ file [`docs/chatgpt/03_Custom_GPT_System_Instructions.md`](file:///d:/07-Competitions-Hackathons/an-tam/docs/chatgpt/03_Custom_GPT_System_Instructions.md).
* **Conversation Starters (Gợi ý hội thoại)**:
  1. `Điểm An Tâm của tôi tháng này thế nào?`
  2. `Ghi sổ giúp tôi: Sáng nay đổ xăng 80k tiền mặt`
  3. `Quỹ dự phòng an toàn của tôi sống được bao nhiêu tháng?`
  4. `Tạo lịch nhắc tôi hạn trả nợ thẻ tín dụng tuần tới`

---

### Bước 3: Cấu Hình Actions (Kết Nối API)

1. Cuộn xuống phần **Actions** → Bấm **Create new action**.
2. Tại mục **Schema**:
   * Bấm **Import from URL** và dán: `https://an-tam.ai/api/openapi.json`
   * *Hoặc* copy toàn bộ nội dung file [`docs/chatgpt/01_OpenAPI_Schema_ChatGPT_Actions.json`](file:///d:/07-Competitions-Hackathons/an-tam/docs/chatgpt/01_OpenAPI_Schema_ChatGPT_Actions.json) dán thẳng vào ô text Schema.
3. Tại mục **Authentication** (Xác thực):
   * Chọn **Authentication Type**: `API Key`
   * **Auth Type**: `Bearer`
   * Dán API Key cá nhân của bạn trên An Tâm AI.
4. Tại mục **Privacy Policy**:
   * Dán URL: `https://an-tam.ai/cai-dat#privacy`

---

### Bước 4: Kiểm Thử & Xuất Bản (Test & Publish)

1. Thử chat ở khung Preview bên phải:
   * Gõ: *"Kiểm tra Điểm An Tâm của tôi"*
   * ChatGPT sẽ gọi Action `getFinancialOverview` và trả về kết quả tiếng Việt rõ ràng, kèm Điểm An Tâm, Quỹ an toàn và Dòng tiền.
2. Bấm nút **Create / Save** ở góc trên bên phải:
   * Chọn **Only me** (Dùng cá nhân) hoặc **Anyone with a link** (Chia sẻ cho bạn bè/team).
