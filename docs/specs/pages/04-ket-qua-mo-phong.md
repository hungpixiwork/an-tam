# Màn 04 — Kết quả mô phỏng (SimulationResultPage)

## Mục đích
Hiển thị chi tiết kết quả của một lần chạy mô phỏng, so sánh before/after, nhấn mạnh những thay đổi lớn nhất, cảnh báo rủi ro chính, và đề xuất hành động để cải thiện tình hình.

## Route
- Path: `/mo-phong/ket-qua/:runId`
- Data: `useRun(runId)` → SimulationRun (SimulationReport + createdAt)
- Error: 404 → ErrorState + ButtonLink back to `/mo-phong`

## Bố cục & các khối

1. **PageHero**: 
   - Eyebrow: "Kịch bản: {report.label}"
   - Title: report.headline.title
   - Highlight: report.headline.emphasis (primary-700 color)
   - Subtitle: report.headline.body (Rich text)
   - Scene: HeroLakeCity

2. **Grid 4 thẻ so sánh**:
   - Tổng tài sản (before → after, delta pill)
   - Mức an tâm (score)
   - Mục tiêu mua nhà (nếu có: report.home)
   - Tiền dự phòng (tháng, delta pill)

3. **Chart "Điều gì thay đổi nhiều nhất?"**: BarChart grouped
   - 4 nhóm: Tài sản, Mục tiêu mua nhà, Quỹ dự phòng, Mức an tâm
   - 2 bar per nhóm: "Trước mô phỏng" (#BFDBFE) / "Sau mô phỏng" (#3B82F6)
   - Các nhóm bình thường có 2 bar, nhưng "Mức an tâm" scale khác

4. **Card rose "Điều đáng lo nhất"**: AlertTriangle icon + Rich text(report.worry)

5. **Card "AI đề xuất 3 việc nên làm"**: 3 sub-card (green/violet/orange)
   - Mỗi card: number badge + title + body + ButtonLink

6. **Card mint "Nếu áp dụng gợi ý này"**:
   - Row 1: Khả năng đạt mục tiêu mua nhà (before % → after % green)
   - Row 2: Mức an tâm (before → after green)
   - 2 buttons: primary "Tạo kế hoạch an toàn hơn" (/ke-hoach) + outline "Thử kịch bản khác" (/mo-phong)

## Tương tác
- Click ButtonLinks → navigate to target route

## Trạng thái
- `isPending`: PageSkeleton
- `error || !run`: ErrorState
- Data: hiển thị từ `run` object (SimulationReport + createdAt)
