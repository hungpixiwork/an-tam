# Trang 7 — Danh mục & rủi ro tập trung `/danh-muc`

Mockup: `Ảnh ChatGPT 22_43_49 … -7.png`. Ảnh cuối: `shots/07-r3.png` .

## Lưới (1672px, nội dung ~1375px)
- H1: tiêu đề + mô tả | nút "Tìm hiểu về quản lý danh mục →".
- H2: 4 KpiCard 3/3/3/3 — Tài sản ròng (↑% so với 3 tháng trước), Tài sản đầu tư, Tài sản khác, Nợ (badge % trên tổng tài sản).
- H3: 1.6fr / 1fr / 1fr — Cơ cấu danh mục (donut + 5 dòng, bấm → bảng các khoản) | Cổ phiếu công ty của bạn | Mức độ rủi ro tập trung (Gauge + hộp cảnh báo).
- H4: thanh ngang theo ngành (cả nghề nghiệp và tài sản) | hộp "Vì sao rủi ro tập trung quan trọng?".
- H5: form Thử trước khi đầu tư | Kết quả dự kiến 3 ô | Gợi ý từ An Tâm AI.
- H6 (thêm, cần cho CRUD): Các khoản của bạn — danh mục đầu tư / tài sản khác, sửa bằng HoldingFormModal.

## Luồng dữ liệu
- H2–H4 → `usePortfolioRisk` → `GET /api/portfolio/risk` → `portfolioRisk()` (concentration.ts, dùng `netWorthBreakdown`) → `holdings` (+`sector`, `is_employer_stock`, `in_portfolio` 0021), `liabilities`, `income_profiles.sector`, thu nhập tháng hiện dùng.
- H5 → `useWhatIf` → `POST /api/portfolio/what-if {preset, amount, holdingMonths}` → `whatIfAllocate()`: lấy tiền chờ đầu tư trước, thiếu thì rút quỹ dự phòng; khoản mới tính cho mục tiêu dài hạn ưu tiên nhất.
- H6 → `useHoldings` / `useSaveHolding` → `/api/holdings` (ngành, cổ phiếu công ty mình, tính vào danh mục).

## Công thức (chữ trên màn hình: "Mức độ rủi ro tập trung")
- C_s = (thu nhập 2 năm nếu s = ngành nghề + tài sản đầu tư ngành s) / (thu nhập 2 năm + tổng đầu tư).
- Điểm 0..100 = HHI của C_s chuẩn hóa trên 8 ngành. ≥60 cao, ≥35 trung bình.

## Hành động → khối đổi
- Thêm/sửa khoản (ngành, công ty mình, danh mục) → H2, H3, H4, H5 tính lại (khóa `portfolio`).
- Đổi form + "Xem tác động" → H5 (vd. cổ phiếu công nghệ 50tr: 62 → 69; ETF toàn cầu: 62 → 61, số tháng an toàn 4,2 → 3,3, khả năng đạt mục tiêu 60% → 66–67%).

## Vòng đối chiếu
- r1: badge KPI bị rơi xuống dưới; chia cột H3 lệch; nhãn ô kết quả bị cắt → đã sửa.
- r2: ô số tiền bị cắt, nhãn donut bị cắt → đã sửa.
- r3: khớp bố cục. Lệch còn lại (có chủ đích): số liệu thật (tài sản khác 250tr/44%, điểm 62, số tháng an toàn giảm khi phải rút quỹ dự phòng); hàng ngành thứ 4 là "Khác" thay cho BĐS.
