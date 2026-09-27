# Trang 3 — Quỹ an toàn & mục tiêu `/quy-an-toan`

## Lưới (1672px, nội dung ~1400px)
- H1 HeroBanner ngắn 12 cột: tiêu đề + mô tả + quote.
- H2 `[965fr_428fr]`: card Quỹ an toàn (ring số tháng · Đã có / Cần thêm 6 tháng · hộp nhắc xanh) + panel "Mục tiêu đề xuất" (2 thẻ 6/12 tháng, nút "Lên kế hoạch") | "Nếu mất việc hôm nay" (hộp trạng thái + Stepper Hiện tại / 6 / 12).
- H3 12 cột: "Các mục tiêu tiết kiệm của bạn" + Tabs Tất cả/Ngắn/Trung/Dài hạn + "Thêm mục tiêu"; 4 thẻ mục tiêu.
- H4 12 cột: "Gợi ý từ An Tâm AI" `[570fr_380fr_395fr]`: tóm tắt 3 ý | số tiền để dành thêm | tác động đến mục tiêu.

## Luồng dữ liệu
| Khối | Hook | Endpoint | Engine | Bảng |
|---|---|---|---|---|
| Quỹ an toàn, mất việc | `useSafety` | `GET /api/safety` | `buildSafety` (`emergencyMonths`, `safetyStatus`) | goals, financial_profiles, transactions |
| Mục tiêu đề xuất | `useSafety` / `useApplySafetyTarget` | `PUT /api/safety/target {months}` | `safetyPlans` | goals (emergency), financial_profiles.emergency_target_months |
| Mục tiêu tiết kiệm | `useSafety`, `useSaveGoal`, `useDeleteGoal` | `/api/goals` (+icon, horizon) | `goalHorizon` | goals |
| Gợi ý AI | `useSafety` | `GET /api/safety` | `savingIdeas`, `goalAccelerations` | transactions, income_profiles, goals |

## Hành động
- "Lên kế hoạch" 6/12 tháng → cập nhật mục tiêu quỹ dự phòng (mục tiêu, tiền/tháng, hạn) → thẻ hiện "Đang áp dụng", Tổng quan đổi.
- "Thêm mục tiêu" / "Chi tiết" / ⋮ → GoalFormModal (biểu tượng + kỳ hạn) → danh sách, số đếm tab, tác động đổi.
- "Điều chỉnh mục tiêu" → sửa mục tiêu quỹ dự phòng.

Gộp: `plan/SafetyPlanPage`, `goals/GoalsPage`, `goals/GoalFormModal` (chuyển vào `features/safety`).
Seed: `goalLooks()` gán icon/horizon qua `PATCH /api/goals/:id`.
