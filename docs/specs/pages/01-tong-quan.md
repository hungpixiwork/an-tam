# 01 · Tổng quan tài chính

**Route:** `/` · **File:** `client/src/features/overview/OverviewPage.tsx` · **Mockup:** ảnh (1)

## Mục đích
Cho người dùng biết trong 5 giây: tài chính đang ổn tới đâu, tiền nằm ở đâu, và việc nên làm hôm nay.

## Dữ liệu
`useOverview(range)` → `GET /api/overview?range=6|12` → `OverviewData` (1 request cho cả màn).

## Bố cục (≥1280px)
| Hàng | Lưới | Khối |
|---|---|---|
| 1 | full | **Hero** — "Chào anh Minh," + headline theo mức điểm (từ khóa màu primary) + 2 dòng phụ; scene `HeroLakeCity` bên phải |
| 2 | `1.75fr + 4×1fr` | **Mức an tâm** (ScoreRing 82/100, badge "Ổn định", mô tả, "Xem chi tiết" → drawer breakdown 4 thành phần) · **Tổng tài sản** · **Tiền dự phòng** · **Tiền đầu tư** (↑% so với 3 tháng trước) · **Dòng tiền tháng này** (+18 triệu, badge Tốt hơn/Kém hơn so với tháng trước) |
| 3 | `7fr 5fr` | **Tài sản 12 tháng** (cột + đường, nhãn nổi giá trị cuối, select 6/12 tháng) · **Tiền của bạn đang nằm ở đâu?** (donut + legend 5 loại, link Chi tiết → /danh-muc) |
| 4 | `1.2fr 1fr 1fr` | **AI đang làm gì cho bạn?** (4 dòng tĩnh) · **Gợi ý hôm nay** (nền kem, `HouseCalendar`, câu từ engine, nút "Xem mô phỏng" → `/mo-phong?preset=nam-kho-khan`) · **Vì cộng đồng** (`FamilyCity`, nút "Tìm hiểu thêm" → /cong-dong) |

## Responsive
1024–1279: KPI 4 cột, thẻ điểm chiếm cả hàng; <1024: 2 cột → 1 cột; biểu đồ và hàng cuối xếp dọc.

## Trạng thái
- Loading: `PageSkeleton`. Lỗi: `ErrorState` + Thử lại.
- `deltaPct = null` (thiếu snapshot) → ẩn badge %.
- Không có mục tiêu → gợi ý "Hãy thêm mục tiêu đầu tiên…".

## Kiểm tra
Seed demo: 82 "Ổn định", 1,24 tỷ ↑6%, 180 triệu ↑12%, 740 triệu ↑8%, +18 triệu Tốt hơn, gợi ý "chậm 8 tháng".
