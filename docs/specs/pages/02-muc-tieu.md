# Màn Hình 02 — Mục tiêu cuộc sống (GoalsPage)

## Mục đích
Giúp người dùng thiết lập, theo dõi và quản lý các mục tiêu tài chính dài hạn (mua nhà, giáo dục con, nghỉ hưu, quỹ dự phòng). AI phân tích tiến độ và xác suất đạt hạn, đề xuất số tiền cần để dành mỗi tháng.

## Route
`/muc-tieu` (đã cấu hình trong router)

## Dữ liệu & API
- **Query hook:** `useGoals()` → `GoalsSummary`
  - `goals: GoalCard[]` — danh sách mục tiêu với progress, probability, requiredMonthly
  - `milestones: { year, title, detail, kind }[]` — các cột mốc theo năm
  - `tip: { text, goalTitle, delayMonths, extraMonthly, probabilityAfter } | null` — gợi ý từ AI
  
- **Mutation hooks:**
  - `useSaveGoal()` → tạo hoặc cập nhật mục tiêu (POST/PATCH `/goals`)
  - `useDeleteGoal()` → xóa mục tiêu (DELETE `/goals/{id}`)

## Bố cục & Khối chính
1. **PageHero** — tiêu đề, highlight với `{em:...}`, subtitle, FamilyCity scene
2. **Grid 4 cột (xl)** — goal card item; mỗi card có icon tile, tiêu đề, mục tiêu / đã có (bold), progress bar, xác suất, hạn mục tiêu
3. **Lộ trình mục tiêu** — timeline ngang với các mốc và năm; button "Thêm mục tiêu" ở header
4. **Biểu đồ tháng** — BarChart từ `requiredMonthly` của từng goal
5. **AI giúp gì** — 4 dòng tĩnh (icon tile + tiêu đề + mô tả)
6. **Gợi ý từ AI** (tùy chọn) — card tone="cream" với HouseCalendar illustration, nút "Xem kế hoạch an toàn" và "Mô phỏng ngay"

## Tương tác
- Click chevron trên goal card → mở modal chỉnh sửa (GoalFormModal)
- "Thêm mục tiêu" button → mở modal thêm mới
- Modal: form nhập title, kind select, targetAmount/currentAmount/monthlyContribution (triệu), targetMonth, nút xóa nếu là edit
- Chuyển đổi giữa triệu ↔ VND (×1_000_000) trong form modal

## Trạng thái Loading / Lỗi / Rỗng
- **isPending:** PageSkeleton
- **error:** ErrorState với nút Thử lại
- **Rỗng:** API không trả về mục tiêu → vẫn render, grid rỗng, gợi ý có thể null
