# Screen 08 — AI theo dõi (AI Monitor)

## Mục đích
Hiển thị hoạt động của AI, các cảnh báo đang mở, và gợi ý hành động. Giúp người dùng hiểu AI hoạt động như thế nào và luôn kiểm soát các quyết định.

## Route
- Path: `/ai-theo-doi`
- Sidebar: "AI theo dõi" (menu item)

## Dữ liệu / API
- `useAi(range: 'week' | 'month')` → `{ events: AiEvent[], alerts: AiAlert[] }`
- `useResolveAlert()` → mutation để đánh dấu alert đã xử lý

## Bố cục & các khối

### PageHero
- Title: "AI không chỉ trả lời câu hỏi."
- Highlight: "AI đang theo dõi, phân tích và {em:nhắc bạn đúng lúc}."
- Subtitle: "Mọi gợi ý đều dựa trên dữ liệu tài chính của bạn, mục tiêu bạn đặt ra và các tình huống có thể xảy ra."
- Scene: HeroLakeCity

### Timeline Card (1/3 left)
- Select để chọn "Tuần này" / "Tháng này"
- Danh sách sự kiện dạng vertical timeline
- Mỗi event: time label (helper `timeLabel(iso)` – "Hôm nay 08:30", "Thứ 3 07:45"), colored dot (alert→red, simulation→violet, reminder→orange, analysis→green), icon tile, title bold, body small
- Empty state: "Chưa có hoạt động nào trong khoảng thời gian này."

### How It Works Card (1/2 right top)
- 4 step circles với Icon: Database(green), Search(violet), BarChart3(blue), Lightbulb(orange)
- Mỗi step: số thứ tự, title, description

### Will Not Do Card (1/2 right bottom)
- 3 tiles: activity icon(red) "Không tự ý mua bán", lock icon(blue) "Không lấy dữ liệu để quảng cáo", search icon(violet) "Không đưa lời khuyên chung chung"

### Alerts Card (1.45fr left)
- Badge red với số alerts
- Tối đa 3 card side-by-side, tinted by severity (danger→rose, warning→cream/orange, action→mint)
- Mỗi card: icon, severity pill, title, body, "Đánh dấu đã xử lý" button
- Empty: green check + "Không có cảnh báo nào đang mở."

### Suggestion Card (1fr right)
- Nếu có alert: sky box, title "Gợi ý hành động hôm nay"
- Dynamically select title theo ruleKey (volatile_share → "Điều chỉnh danh mục", emergency_low → "Bổ sung dự phòng", else → "Giữ tiến độ")
- Buttons: "Xem lý do" (→ /danh-muc or /muc-tieu), "Điều chỉnh kế hoạch" (→ /ke-hoach)
- Nếu không: text + "Xem mô phỏng" button (→ /mo-phong)

## Tương tác
- Select range (week/month) → refetch
- Click "Đánh dấu đã xử lý" → useResolveAlert().mutate(id)
- Click "Xem lý do" → navigate dựa trên ruleKey
- Click "Xem mô phỏng" → navigate /mo-phong

## Trạng thái
- Loading: PageSkeleton
- Error: ErrorState
- Success: render các khối
