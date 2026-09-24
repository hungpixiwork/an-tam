# Design system

Chuẩn thiết kế: khung **1448 × 1086** (tỉ lệ mockup). Phong cách: sáng, mềm, nhiều khoảng trắng, card bo tròn,
icon nằm trong "tile" màu nhạt, minh họa pixel art ở banner và card.

## Màu (Tailwind `theme.extend.colors`)
| Token | Hex | Dùng cho |
|---|---|---|
| `canvas` | `#F4F8FB` | nền trang |
| `line` | `#E8EEF4` | viền card, đường kẻ bảng |
| `ink` | `#0F2A44` | tiêu đề, số lớn |
| `ink-soft` | `#5B6B7F` | chữ phụ |
| `ink-mute` | `#8A97A8` | chú thích nhỏ, trục biểu đồ |
| `primary` (700) | `#0E6B58` | nút đậm ("Xem mô phỏng", "Áp dụng kế hoạch") |
| `accent` (600) | `#2F7BEA` | nav đang chọn, link, nút xanh |
| `accent-50` | `#EAF3FF` | nền nav đang chọn, nút nhạt |
| `success` | `#1FA16B` / nền `#E7F7EF` | tăng, ổn định |
| `warning` | `#F5A524` / nền `#FFF4E0` | cần chú ý |
| `violet` | `#8B5CF6` / nền `#F1ECFF` | icon phụ |
| `danger` | `#EF4444` / nền `#FDECEC` | giảm, rủi ro |
| `cream` | `#FFF9EC` | card "Gợi ý hôm nay" |

**Màu danh mục tài sản** (dùng thống nhất ở donut, bảng, legend):
Tiền mặt `#3B82F6` · Quỹ mở `#1FA37A` · Cổ phiếu `#F5A524` · Trái phiếu `#8B5CF6` · Khác `#94A3B8`.

## Chữ
- Font: **Be Vietnam Pro** (400/500/600/700/800), fallback `system-ui`.
- Tiêu đề trang (topbar): 28px / 700 / `ink`.
- Hero H1: 30px / 800, dòng 2: 28px / 700; từ khóa nhấn mạnh màu `primary`.
- Tiêu đề card: 18px / 700.
- Số KPI: 30px / 700; số âm/giảm màu `danger`, dương đặc biệt (+18 triệu) màu `primary`.
- Chữ thường 14px; chú thích 12px; chữ trong biểu đồ 11px.

## Khoảng cách, bo góc, bóng
- Sidebar rộng 256px; topbar cao 76px; lề nội dung 16px; gap lưới 16px.
- Card: `rounded-2xl` (16px), `border border-line`, `bg-white`, bóng `0 1px 2px rgba(15,42,68,.04)`, padding 20px.
- Icon tile: 44×44 (KPI 48×48), `rounded-xl`, nền màu nhạt, icon 22px màu đậm.
- Badge/pill: `rounded-full`, cao 26px, chữ 12–13px / 600.

## Component UI (`client/src/components/ui`)
| Component | Mô tả |
|---|---|
| `Card` | khung card chuẩn; prop `tone` (`white` \| `cream` \| `mint` \| `rose`) |
| `CardTitle` | icon màu + tiêu đề 18px + phần `action` bên phải |
| `IconTile` | ô icon màu nhạt; prop `tone` (`blue` \| `green` \| `orange` \| `violet` \| `red` \| `teal`) |
| `StatCard` | icon tile, nhãn, giá trị lớn, `DeltaBadge` + chú thích so sánh |
| `DeltaBadge` | mũi tên ↑/↓ + % ; màu theo chiều tăng/giảm và `goodWhen` |
| `Badge` | pill trạng thái (Ổn định, Cao, Thấp, Quan trọng…) |
| `Button` | `variant`: `primary` \| `soft` \| `outline` \| `ghost`; có `iconRight` |
| `ScoreRing` | vòng tròn điểm (SVG), gradient theo mức điểm |
| `DonutChart` | donut Recharts + nội dung ở tâm |
| `ProgressBar` | thanh tiến độ mục tiêu |
| `Select` | dropdown gọn (6/12 tháng, Tuần này…) |
| `Toggle` | công tắc bật/tắt (màn 10) |
| `Skeleton` | khối xám nhấp nháy khi loading |
| `ErrorState` | thông báo lỗi + nút "Thử lại" |

## Định dạng tiền & số (`shared/format`)
| Giá trị | Hiển thị |
|---|---|
| 1 240 000 000 | `1,24 tỷ` |
| 1 000 000 000 | `1 tỷ` (trục biểu đồ: `1,0 tỷ`) |
| 180 000 000 | `180 triệu` |
| 18 000 000 (dòng tiền) | `+18 triệu` |
| 3 500 000 | `3,5 triệu` |
| 850 000 | `850 nghìn` |
| 0.061 | `6%` |
- Dấu thập phân là **dấu phẩy**, tối đa 2 chữ số cho tỷ, 1 chữ số cho triệu, bỏ số 0 thừa.
- Tháng: `'2030-08'` → `Tháng 8/2030`; trục biểu đồ `Tháng 1..12`.

## Responsive
| Bề rộng | Hành vi |
|---|---|
| ≥ 1280 | đúng layout mockup |
| 1024 – 1279 | sidebar thu còn cột icon 76px; lưới KPI 3 + 2 |
| < 1024 | sidebar thành drawer (nút menu ở topbar), mọi lưới xếp 1 cột, ẩn ô tìm kiếm thành icon |

## Chuyển động & a11y
- Hover card: nâng bóng nhẹ; transition 150ms.
- Animation pixel art tắt khi `prefers-reduced-motion: reduce`.
- Mọi icon-only button có `aria-label`; tương phản chữ ≥ 4.5:1; focus ring `accent`.
