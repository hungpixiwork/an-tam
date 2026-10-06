# 🧠 Hướng Dẫn Tích Hợp Claude Desktop Với An Tâm AI MCP Server

Ứng dụng **Claude Desktop** hỗ trợ giao thức **Model Context Protocol (MCP)**, cho phép Claude đọc trực tiếp dữ liệu Điểm An Tâm, sổ thu chi và đề xuất hành động tài chính trên An Tâm AI.

---

## 🛠️ CÁCH 1: Chạy MCP Qua NPX (Khuyến Nghị — Nhanh Nhất)

### Bước 1: Mở File Cấu Hình Claude Desktop
- **Trên Windows**: Mở Run (`Win + R`) gõ `%APPDATA%\Claude` và mở file `claude_desktop_config.json` (tạo mới nếu chưa có).
- **Trên macOS**: Mở `~/Library/Application Support/Claude/claude_desktop_config.json`.

---

### Bước 2: Thêm Cấu Hình MCP Server Cho An Tâm AI

Dán đoạn JSON dưới đây vào file `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "an-tam-ai": {
      "command": "npx",
      "args": ["-y", "antam-ai", "mcp"],
      "env": {
        "ANTAM_API_KEY": "your_api_key_here",
        "ANTAM_BASE_URL": "https://an-tam.ai"
      }
    }
  }
}
```

> **Lưu ý**: Thay `your_api_key_here` bằng API Key tài khoản của bạn trên An Tâm AI.

---

### Bước 3: Khởi Động Lại Claude Desktop
1. Tắt hoàn toàn Claude Desktop và mở lại.
2. Bạn sẽ thấy biểu tượng chiếc búa 🔨 (**Tools**) xuất hiện ở góc dưới khung chat của Claude kèm các công cụ:
   - `get_overview`: Xem Điểm An Tâm & Quỹ an toàn.
   - `get_ledger`: Xem sổ thu chi & ngân sách tháng.
   - `propose_action`: Đề xuất đặt ngân sách / tạo lịch nhắc việc (Human-in-the-loop).
   - `run_desk`: Chạy phân tích đa chuyên gia đầu tư.

---

## 💬 CÁC CÂU LỆNH MẪU ĐỂ TRÒ CHUYỆN VỚI CLAUDE

- *"Chào Claude, hãy kiểm tra bức tranh tài chính tổng quan trên An Tâm AI của tôi hôm nay."*
- *"Tháng này tôi đã chi bao nhiêu tiền cho ăn uống và mua sắm rồi?"*
- *"Tôi muốn dành thêm 2 triệu mỗi tháng cho quỹ dự phòng, hãy đề xuất cập nhật ngân sách giúp tôi."*
- *"Chạy phân tích đa chuyên gia cho mã FPT giúp tôi."*
