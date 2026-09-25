# 11 · Sổ thu chi — `/thu-chi`

Mã: `client/src/features/ledger/LedgerPage.tsx` · API: `/api/transactions` · Engine: `shared/engine/ledger.ts`.

## Mục đích
Nơi người dùng ghi thu nhập / chi tiêu thực tế. Ưu tiên **nhập nhanh**: 1 ô tiền + 1 lần chọn danh mục + Enter.

## Bố cục
- **Ghi nhanh** (trái): Thu/Chi (`Segmented`) · số tiền (`MoneyInput`, tự chèn dấu chấm, chip 50k…1tr cho chi, 5tr…30tr cho thu) ·
  chip danh mục theo loại · ghi chú · ngày (mặc định hôm nay, không cho chọn tương lai).
  Lưu xong: giữ loại / danh mục / ngày, xóa số tiền + ghi chú, focus lại ô tiền, hiện "Đã lưu · AI đã cập nhật phân tích".
- **Tháng** (phải): chuyển tháng ‹ › (không vượt tháng hiện tại) · 3 ô Thu / Chi / Còn lại · chi theo danh mục (top 5) ·
  6 tháng gần nhất (thanh thu xanh / chi đỏ) · hộp "AI đang tính với thu X (nguồn) và chi Y (nguồn)".
- **Danh sách**: nhóm theo ngày, mỗi dòng icon danh mục, ghi chú, số tiền (+xanh / −), nút sửa → `Modal` cùng form, có Xóa.
- Tháng trống: `EmptyState`.

## Dữ liệu
- Mỗi thêm / sửa / xóa gọi `afterChange` → nhật ký AI "Cập nhật sổ thu chi" (gộp trong 30 phút) kèm tổng thu / chi tháng.
- Engine dùng trung bình các tháng đã trọn (≤ 3) làm thu / chi tháng — xem ENGINE.md › Sổ thu chi.
