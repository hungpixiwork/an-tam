# Trang 4 — Tăng thu nhập & kỹ năng `/tang-thu-nhap`

Mockup: `Ảnh ChatGPT 22_43_44 … -4.png`. Ảnh vòng cuối: `shots/04-r3.png`.

## Lưới (1672px)
- H1: HeroBanner 12 cột (quote "Kỹ năng hôm nay là thu nhập ngày mai.").
- Thân: `xl:grid-cols-[973fr_420fr]` — trái xếp dọc 3 hàng, phải "Giá trị nghề nghiệp" cao hết thân.
  - Hàng 1 `[468fr_491fr]`: Nguồn thu nhập hiện tại | Cơ hội tăng thu nhập.
  - Hàng 2: Lộ trình kỹ năng → thu nhập kỳ vọng (3 cột nối mũi tên).
  - Hàng 3 `[548fr_411fr]`: Kế hoạch học tập tuần này (7 ô) | Cơ hội việc làm & làm thêm phù hợp.

## Luồng dữ liệu
Tất cả khối ← `useEarnDashboard` ← `GET /api/earn/dashboard` (`worker/routes/earn.ts`) ← engine `shared/engine/earnDashboard.ts` + `humanCapital.ts`:
- Nguồn thu ← `transactions` (thu tháng này, rỗng → tháng trước) → `incomeSources` (lương+thưởng · làm thêm = `freelance`+`business` · đầu tư · khác).
- Cơ hội / việc làm ← bảng `opportunities` (0011, 8 dòng seed) → `rankOpportunities` (phù hợp theo `skill_plan_items.tag`, tiến độ ≥ 50% → Phù hợp cao).
- Lộ trình ← `skill_plan_items` (0011) + thu nhập từ cơ hội làm thêm cùng nhóm → `roadmap`.
- Kế hoạch 7 ngày (hôm qua → +5) ← `calendar_events` loại `skill` (0013) → `learningWeek` (done/today/planned/missed/free, giờ đã học).
- Giá trị nghề nghiệp ← `humanCapital()`: thu nhập = tổng nguồn thu, tuổi từ `financial_profiles.birth_year`, nghề `income_profiles.isco_code` → `shared/data/ilo-exposure.ts` (nhóm nghề ISCO cấp 1 → mức 0..4 → Thấp/Trung bình/Cao), giờ học = giờ đã học trong kế hoạch 7 ngày; `careerBand`, `careerActions`.
- API phụ: `/api/skills` CRUD, `GET /api/human-capital`, `PUT /api/earn` nhận thêm `sector`, `iscoCode`.

## Hành động → khối đổi
- "+ Thêm nguồn thu" → modal → `POST /api/transactions` (kind income) → Nguồn thu, KPI trang Tổng quan/Sổ thu chi.
- Bấm ô ngày học → `PATCH /api/calendar/events/:id {done}` → ô đổi trạng thái, "Đã học x/y giờ", điểm Giá trị nghề nghiệp (giờ học ≥ 3 → rủi ro giảm một bậc).
- Bấm cơ hội → hộp chi tiết (thu nhập, nhu cầu, kỹ năng liên quan, mức phù hợp).

## Đối chiếu
- r1: highlight hero 3 dòng, tên buổi học và tên việc làm bị cắt → thu nhỏ chữ, cho xuống dòng, cột thu nhập rộng hơn.
- r2→r3: ô ngày cao hơn; tràn ngang 390px do `sr-only` thoát khỏi vùng cuộn → thêm `relative`. 1440/1024/390 không tràn.
- Còn lệch nhỏ: ảnh hero dùng ảnh hồ-thành phố chung (không có ảnh người đeo balo); điểm 73 (mockup 72) — số tính thật từ dữ liệu seed.
