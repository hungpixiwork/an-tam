# Trang 2 — Sổ thu chi & dòng tiền `/thu-chi`

Mockup: `Ảnh ChatGPT 22_43_41 … -2.png` · ảnh cuối: `shots/02-r3.png` (1672×941).

## Lưới
| Hàng | Cột | Khối |
|---|---|---|
| H1 | tiêu đề + tabs (Tổng quan · Tất cả giao dịch · Thói quen) · 3 nút phải | Thêm giao dịch / Chia đều chi phí / Đặt ngân sách tháng |
| H2 | 3·3·3·3 | Tổng thu nhập · Tổng chi tiêu · Dòng tiền ròng (delta so với tháng trước + thanh) · Ngân sách tháng |
| H3 | 536/456/396 fr | Combo 6 tháng (cột thu/chi + đường ròng) · Donut cơ cấu chi + bảng 7 danh mục · Gợi ý từ An Tâm AI |
| H4 | 482/514/394 fr | Giao dịch gần đây (5) · Hóa đơn & đăng ký định kỳ (5) · Banner "Tiết kiệm hôm nay…" → /mo-phong |

## Luồng dữ liệu
- Mọi khối H2–H4 ← `useLedgerDashboard` ← `GET /api/ledger/dashboard?month` ← engine `budget.ts` (`totalsOf`, `momDeltas`, `categoryBreakdown`, `spendingAdvice`), `bills.ts` (`billStatus`) ← D1 `transactions`, `budgets`, `recurring_bills`, `user_settings`.
- Thêm giao dịch → `POST /api/transactions` → invalidate FINANCE_KEYS (gồm `['ledger']`) → mọi khối đổi.
- Đặt ngân sách → `PUT /api/budgets/:month` (upsert, tháng sau tự mang sang) → KPI Ngân sách.
- Chia đều → `POST /api/ledger/split` (`splitEvenly`, `vietQrUrl`) → phần mỗi người + ảnh VietQR; chưa có tài khoản → form `PUT /api/settings/payout-account`.
- Hóa đơn ⋯ "Đánh dấu đã trả" → `POST /api/bills/:id/paid` → ghi giao dịch `source='bill'`, `bill_id` (409 nếu đã trả trong tháng). CRUD `/api/bills` (Thêm/Sửa/Xóa).
- Gợi ý AI: danh mục vượt mức phổ biến (`PEER_SPENDING_SHARES`) + nhóm khoản tự gắn "Không đáng" → tiết kiệm = 50%.
- Tab Thói quen = `HabitsTab` (chuyển nguyên từ `habits/HabitsPage`), tab Tất cả giao dịch = sổ theo tháng cũ (sửa/xóa).
- Rỗng (tài khoản mới, đã kiểm API): KPI "—" + "Ghi khoản đầu tiên", biểu đồ/donut/giao dịch/hóa đơn có EmptyState + nút, gợi ý "Ghi ít nhất 5 khoản chi".

## Vòng 1
| Khối | Mockup | Hiện tại | Lệch | Sửa |
|---|---|---|---|---|
| KPI 1–3 | badge % cạnh số | badge rơi xuống dòng | bố cục | cỡ số 23px |
| Combo | trục 0–40Tr | trục 29/19/10/-9Tr | số liệu trục | ticks tròn 10 triệu |
| Donut | bảng đủ số tiền | cột tiền bị cắt | chữ cắt | donut 164px, bảng 12.5px |
| Giao dịch | có badge danh mục | badge bị ẩn (`hidden` bị ghi đè) | thiếu | bọc div |
| Banner | chữ trên nền trời sáng | chữ đè cây, khó đọc | màu | lớp phủ trắng chéo |
| Gợi ý AI | 2 bullet | 3 bullet, card cao | khoảng cách | bỏ dòng tỷ trọng khi có khoản cụ thể |

## Vòng 2
| Khối | Lệch | Sửa |
|---|---|---|
| KPI thu/ròng | badge vẫn xuống dòng | 21px |
| Giao dịch/Hóa đơn | tên bị cắt ("Dự án freelan…"), "+ 4.000.000đ" xuống dòng | cột badge co lại, số tiền nowrap |
| Hàng 3 | cao hơn mockup | gọn chữ gợi ý |

## Vòng 3 — còn lại (chấp nhận)
- Ngân sách: mockup ghi "21.000.000đ · đã chi 68% · còn 10.000.000đ" (tự mâu thuẫn). Seed ngân sách 31 triệu → 68% / còn 10 triệu, số lớn = ngân sách.
- Hóa đơn điện/internet "Còn 12/17 ngày" thay vì "Sắp đến hạn" vì hôm nay 28/9 đã trả kỳ tháng 9 (≤7 ngày mới là "Sắp đến hạn").
- Giao dịch không có giờ (bảng chỉ lưu ngày) → "Hôm nay", "Hôm qua", dd/mm/yyyy.
- Hàng 3 cao hơn mockup ~60px (gợi ý AI có tiêu đề 3 dòng). Điểm An Tâm trang 1: 60 (+6) (trước +8) do chỉnh thu/chi tháng 8 để delta KPI khớp mockup (+12%/+8%/+28%).
- Overflow 1440/1280/1024/390: không tràn (sửa thẻ Ngân sách ở 1440).
