# 06 · Lựa chọn cuộc đời `/lua-chon`

## Lưới (1672px)
- H1 HeroBanner (quote) — 12 cột.
- H2 "Tình huống của bạn" — trái tên + mô tả (+ chọn tình huống, "Tạo tình huống mới"), phải 3 chỉ số (chi phí chính, thu nhập hiện tại, mục tiêu sau khi hoàn thành).
- H3 trái ~8 cột: "So sánh các phương án" 2 thẻ radio (vòng điểm khả thi + nhãn) → "Phân tích chi tiết – Phương án n" (tác động số tháng an toàn · chi phí ước tính StackedBar · cơ hội · rủi ro · hộp kết luận vàng + điểm/100).
- H3 phải ~4 cột: "Điều kiện tiên quyết d/n" checklist → "Kế hoạch hành động do AI đề xuất" (đánh số, mức ưu tiên, thêm/xong/xóa).

## Luồng dữ liệu
khối → `useLifeChoices` / `useLifeChoice(id)` → `GET /api/life-choices`, `GET /api/life-choices/:id` → `evaluateLifeChoice` (shared/engine/lifeChoice.ts, dùng `humanCapital.ts`, `peace.ts`) → `life_choices`, `life_choice_options`, `life_choice_prereqs`, `life_choice_tasks` (0014 + 0020).
- Điểm khả thi = 40 an toàn (số tháng còn lại / mục tiêu quỹ) + 30 giữ mục tiêu (phần dư tháng / tiền góp mục tiêu khác) + 20 giá trị nghề (Δ vốn con người) + 10 điều kiện.
- "Số tháng an toàn" ở trang này = (tiền mặt + danh mục đầu tư) / chi tiêu tháng; sau phương án trừ phần chi phí không được thu nhập bù.
- Điều kiện `auto_key='reserve_12m'` tự kiểm tra (không tick tay).
- API khác: `GET /templates`, `POST /evaluate`, `POST /compare`, `POST|PATCH|DELETE /:id/options|prereqs|tasks`.

## Hành động → khối đổi
- Chọn radio phương án → PATCH option selected → "Phân tích chi tiết" đổi sang phương án đó.
- Tick điều kiện → d/n + điểm cả 2 phương án tăng/giảm (27→29, 75→76 khi đủ 6/6).
- Thêm / hoàn thành / xóa việc → danh sách + "x/n việc đã xong".
- "Tạo tình huống mới" (modal chọn mẫu study/care/startup/switch/sabbatical) → tạo phương án/điều kiện/việc từ mẫu, trang chuyển sang tình huống mới.

## Đối chiếu
- Vòng 1: thẻ chỉ số chật, chú giải chi phí bị cắt, cột phải cao → nới cột chỉ số, rút gọn nhãn, thu gọn hàng.
- Vòng 2: không còn lệch bố cục. Khác mockup về số (không ép): PA1 27/100 "Chưa nên làm ngay" (thiếu 180tr so với 600tr chi phí), PA2 75/100 "Khả thi" nên PA2 là đề xuất; −21 tháng thay vì −12.
