---
name: safe-feature
description: Thêm tính năng mới vào trang An Tâm AI đã khớp mockup mà KHÔNG phá bố cục — chỉ gắn vào khối có sẵn (1 dòng trong thẻ, link mở modal, nút chuyển Segmented trong thẻ, bước kết quả), chụp trước/sau để chứng minh không đổi. Use khi người dùng yêu cầu thêm tính năng/nội dung vào trang đã hoàn thiện, hoặc nói "đừng phá mạch UI".
---

# Thêm tính năng không phá giao diện

Người dùng rất nhạy với việc trang bị "xấu đi". Trang đã khớp mockup thì **không thêm hàng/cột/thẻ mới**.

## Chỗ được phép gắn (theo thứ tự ưu tiên)
1. **1 dòng chữ nhỏ** trong thẻ có sẵn (dưới thanh tiến độ, dưới số chính) — dùng lại style chữ phụ của thẻ. Vd: "Nên để 2.000.000đ/tháng · Đủ".
2. **Link chữ ở header khối** ("Chia tiền để dành →", "Xem chi tiết →") mở **`Modal`** (UI kit) chứa bảng/biểu mẫu đầy đủ + nút hành động chính.
3. **`Segmented` trong header thẻ** ("Hiện tại | Đề xuất") — chế độ mặc định giữ nguyên hiển thị cũ; chế độ mới thay nội dung *bên trong* thẻ.
4. **Menu ⋯** của dòng/thẻ cho hành động phụ.
5. **Bước/màn riêng** ngoài trang chính (vd bước kết quả sau onboarding, trang con).
Không được: thêm SectionCard mới vào lưới, đổi số cột, đẩy khối xuống hàng khác, đổi chiều cao thẻ >10px ở chế độ mặc định.

## Quy trình
1. Chụp **trước**: `agent-browser set viewport 1672 941` → `agent-browser screenshot --full ./.agents/pages/shots/<tên>-before-<trang>.png`.
2. Thiết kế: với mỗi thông tin mới, chọn chỗ gắn theo danh sách trên; ghi 3–5 dòng lý do vào mô tả commit/report.
3. Engine thuần + endpoint riêng (không nhét vào endpoint dashboard nếu làm nặng); giả định số liệu gom vào **1 hằng số** export (dễ thay khi có nghiên cứu mới).
4. Hành động ghi → `Idempotency-Key` + `audit_log` + invalidate đúng query để các khối liên quan cập nhật.
5. Chụp **sau** ở cùng khung; `Read` cả 2 ảnh, so vị trí/chiều cao từng khối. Lệch → sửa đến khi bố cục mặc định trùng.
6. `node scripts/dev/smoke.mjs --widths 1672,1024,390 --routes <các trang đụng tới>`.
7. Chỉ commit ảnh "sau".

## Ví dụ đã làm
- Phân bổ tài chính: dòng "Nên để …/tháng" trong thẻ mục tiêu (Quỹ an toàn) + link "Chia tiền để dành →" mở modal bảng kế hoạch + nút "Áp dụng kế hoạch"; Danh mục: `Segmented` "Hiện tại | Đề xuất" trong thẻ "Cơ cấu danh mục đầu tư"; màn kết quả sau `/bat-dau`.
