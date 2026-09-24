# Màn 03 — Mô phỏng tương lai (SimulationPage)

## Mục đích
Cho phép người dùng điều chỉnh các tham số (thị trường, lạm phát, gián đoạn thu nhập, lãi suất, chi phí bất ngờ) để tạo các kịch bản khác nhau và xem trước tác động lên tài chính của họ trước khi chạy mô phỏng chính thức.

## Route
- Path: `/mo-phong`
- Query param: `?preset=<slug>` (nạp params mặc định từ preset có slug tương ứng)
- Data: `usePresets()` → danh sách preset, `useSimulationPreview()` → dữ liệu xem trước

## Bố cục & các khối

1. **PageHero**: "Nếu tương lai thay đổi, kế hoạch của bạn có còn ổn không?" + scene WindingPath (40% width)

2. **Hàng grid 1** (xl: `[1fr | 1.45fr]`):
   - **Cột trái**: Thẻ điều chỉnh tham số 5 slider:
     - Thị trường giảm (-50..+50%, step 5)
     - Lạm phát tăng (0..10%, step 0.5)
     - Thu nhập gián đoạn (0..12 tháng, step 1)
     - Lãi suất thay đổi (-3..+3%, step 0.5)
     - Chi phí bất ngờ (0..500 triệu, step 10 triệu)
   - Mỗi slider: IconTile + label + input range + tick labels + value box (phải)
   - Chip preset + chip "Tự tạo" (highlight nếu là kịch bản hiện tại)
   
   - **Cột phải**: "Xem trước tác động" → 4 metric tiles (before/after):
     - Tổng tài sản dự kiến
     - Mục tiêu mua nhà (% probability)
     - Quỹ dự phòng (tháng)
     - Mức an tâm tài chính
   - Mỗi tile: before → after, delta pill (red nếu xấu)
   - Chart: Dự phóng 10 năm (baseline blue, scenario red)

3. **Hàng grid 2**: Card "AI đang làm gì?" — 4 step boxes với arrows

4. **CTA Banner** (mint gradient): "Bạn không cần đoán tương lai..." + button "Chạy mô phỏng" (arrow, disabled while pending)

## Tương tác
- Thay đổi slider → debounce 300ms → fetch `useSimulationPreview(debouncedParams)` (placeholderData giữ previous)
- Click preset chip → set params = preset.params
- Click "Tự tạo" → set params = DEFAULT_PARAMS
- Click "Chạy mô phỏng" → `useRunSimulation()` → navigate `/mo-phong/ket-qua/:runId`

## Trạng thái
- `presetsLoading`: PageSkeleton
- `presetsError`: ErrorState
- `previewLoading`: preview card opacity-60
- `runMutation.pending`: button disabled, show "Đang xử lý…"
- `runMutation.error`: show error message under button
