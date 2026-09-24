# Màn Hình 07 — Kế hoạch an toàn (SafetyPlanPage)

## Mục đích
Trình bày kế hoạch an toàn do AI đề xuất, so sánh với kế hoạch hiện tại, và cho phép người dùng áp dụng để AI theo dõi tiến độ hàng tháng. Bao gồm 3 bước cụ thể, biểu đồ dự báo, và danh sách việc cần làm.

## Route
`/ke-hoach` (đã cấu hình trong router)

## Dữ liệu & API
- **Query hook:** `usePlans()` → `PlansData`
  - `proposal: PlanProposal` — đề xuất gồm steps, metrics (current/proposed), chart, tasks
  - `applied: { id, appliedAt, tasks[] } | null` — kế hoạch đã áp dụng + danh sách task với checkbox
  
- **Mutation hooks:**
  - `useApplyPlan()` → áp dụng kế hoạch (POST `/plans/apply`)
  - `useToggleTask({ id, done })` → cập nhật trạng thái task (PATCH `/plans/tasks/{id}`)

## Bố cục & Khối chính
1. **PageHero** — tiêu đề, highlight với `{em:...}`, subtitle, HeroLakeCity scene
2. **Comparison card** (1.75fr) — hai panel (current/proposed) với Scale icon; hiển thị goalProbability, peaceScore, emergencyMonths, volatility
3. **Steps card** (1fr) — Lightbulb icon, 3 numbered circles với step title + detail
4. **AI Support card** (1fr) — 4 dòng tĩnh icon + mô tả
5. **Chart card** (1.2fr) — ComposedChart: bars (proposed), 2 lines (current gray, proposed green), Y axis percent, legend, end value pills
6. **Tasks card** (1.4fr) — checkbox list; nếu chưa apply → disabled checkboxes + hint; nếu applied → enabled checkboxes + toggle mutation
7. **Apply card** (1fr) — Flag icon, text mô tả, button "Áp dụng kế hoạch" (primary) + "Tùy chỉnh lại" (outline); nếu applied hiện ngày apply + text "Áp dụng lại"

**Layout xl:** [comparison 1.75fr | steps 1fr] → [AI support 1fr | chart 1.2fr] → [tasks 1.4fr | apply 1fr]

## Tương tác
- Click "Áp dụng kế hoạch" → gọi useApplyPlan, show success state với ngày apply
- Checkbox task (nếu applied) → gọi useToggleTask({ id, done })
- "Tùy chỉnh lại" → ButtonLink to "/mo-phong"
- Select "12 tháng" ở header chart (tạm thời single option)

## Trạng thái Loading / Lỗi / Rỗng
- **isPending:** PageSkeleton
- **error:** ErrorState với nút Thử lại
- **Mutation error:** show trong card (ngôn ngữ tự nhiên từ API)
- **Applied state:** toggle checkbox, show applied date + "Áp dụng lại" button
