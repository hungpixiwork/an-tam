# Engine "AI" rule-based

Mã nguồn: [`shared/engine/`](../../shared/engine). Hàm thuần, tất định (cùng đầu vào → cùng kết quả), chạy được cả ở
Worker lẫn trình duyệt. Test: `tests/*.test.ts` (`npm test`).

## Giả định thị trường (`portfolio.ts → CATEGORY_ASSUMPTIONS`)
| Loại | Lợi nhuận kỳ vọng/năm | Biến động/năm |
|---|---|---|
| Tiền mặt | 4,5% | 0,5% |
| Quỹ mở | 9% | 14% |
| Cổ phiếu | 11% | 22% |
| Trái phiếu | 6,5% | 4% |
| Khác | 6% | 12% |
Biến động danh mục = trung bình có trọng số × 0,85 (hệ số đa dạng hóa).
**Tỷ trọng tài sản biến động** = Σ tỷ trọng × (high 1 · mid 0,5 · low 0).

## Xác suất đạt mục tiêu (`goals.ts`)
- Giá trị kỳ vọng sau *n* tháng: `FV = C₀(1+r)ⁿ + c·((1+r)ⁿ − 1)/r` với *r* lãi tháng từ lợi nhuận năm.
- Quỹ dự phòng dùng giả định an toàn (4,5% / 1%) thay vì danh mục.
- `z = ln(FV / mục tiêu) / (σ·√năm·0,4 + 0,02)` → `P = Φ(z)`, kẹp trong [1%, 99%].
- `expectedCompletion` = tháng đầu tiên FV ≥ mục tiêu; `delayMonths` = so với hạn.
- `requiredMonthly` = số tiền/tháng để FV chạm mục tiêu đúng hạn (làm tròn 100 nghìn).

## Mức an tâm tài chính (`peace.ts`) — 100 điểm
| Thành phần | Tối đa | Công thức |
|---|---|---|
| Quỹ dự phòng | 30 | 30 × min(1, số tháng chi tiêu / số tháng mục tiêu) |
| Khả năng đạt mục tiêu | 30 | 30 × TB xác suất có trọng số ưu tiên (cao 3 · vừa 2 · thấp 1) |
| Mức rủi ro phù hợp | 20 | 20 × (1 − min(1, vượt khuyến nghị / 0,4)); khuyến nghị theo số tháng tới mục tiêu lớn gần nhất: ≤24 → 25% · ≤60 → 40% · ≤120 → 55% · còn lại 70% |
| Dòng tiền | 20 | 20 × min(1, tỷ lệ để dành / 50%) |
Mức: ≥80 **Ổn định** · 60–79 **Cần chú ý** · <60 **Cần hành động**.

## Mô phỏng (`simulate.ts`)
Cú sốc áp lên trạng thái → trạng thái mới, rồi đo lại mọi chỉ số:
- Thị trường: mỗi khoản × (1 + drop × beta) — beta cổ phiếu 1 · quỹ 0,8 · khác 0,4 · trái phiếu 0,1 · tiền mặt 0.
- Lãi suất: trái phiếu −(Δ lãi suất × 4 năm duration).
- Mất thu nhập N tháng: rút 50% chi tiêu × N từ quỹ dự phòng; các mục tiêu mất N tháng đóng góp.
- Chi phí bất ngờ: 50% từ quỹ dự phòng, 50% bán bớt tài sản (chia đều theo tỷ trọng).
- Lạm phát > 4%: chi tiêu tăng tương ứng → đóng góp mục tiêu giảm theo tỷ lệ dòng tiền.
- Dự phóng 10 năm: tài sản hiện tại vs sau cú sốc, cùng lãi suất kỳ vọng và khả năng để dành.

## Kế hoạch an toàn (`plan.ts`)
3 bước: (1) bù quỹ dự phòng tới mục tiêu (làm tròn 10 tr, trong 8 tháng) · (2) chuyển 10% tổng tài sản từ nhóm biến động cao sang trái phiếu · (3) thêm tối đa 3 tr/tháng cho mục tiêu lớn gần nhất.
Đo `current` vs `proposed` (xác suất, điểm, tháng dự phòng, nhãn biến động) và biểu đồ xác suất 12 tháng.

## Cảnh báo (`alerts.ts`)
| rule_key | Mức | Điều kiện |
|---|---|---|
| `goal_delay:<goalId>` | danger | mục tiêu (trừ dự phòng) trễ ≥ 6 tháng |
| `volatile_share` | warning | tỷ trọng biến động > khuyến nghị + 5% |
| `emergency_low` | action | quỹ dự phòng < chi tiêu × số tháng mục tiêu |
`syncAlerts` (Worker) mở cảnh báo mới, đóng cảnh báo hết vi phạm, không mở lại cảnh báo vừa được đánh dấu xử lý trong 7 ngày. Chạy khi đăng ký, khi mở Tổng quan và theo Cron hằng ngày.

## Câu chữ (`narrate.ts`)
Mọi câu "AI nói" là template + số liệu. Đánh dấu `{em:…}`, `{danger:…}`, `{success:…}` để client tô màu (`<Rich/>`).
Interface `Narrator` cho phép thay bằng bộ diễn đạt khác (ví dụ Workers AI) mà **không đổi số liệu**.
