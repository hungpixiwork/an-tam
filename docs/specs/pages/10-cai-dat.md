# Screen 10 — Cài đặt & quyền riêng tư (Settings)

## Mục đích
Cho phép người dùng kiểm soát quyền riêng tư dữ liệu, tùy chỉnh cách AI hỗ trợ, và hiểu rõ cách dữ liệu được sử dụng.

## Route
- Path: `/cai-dat`
- Sidebar: "Cài đặt" (menu item)

## Dữ liệu / API
- `useSettings()` → `Settings` (dataEncrypted, advancedAnalysis, notifyGoalDelay, notifyPortfolioRisk, notifyWeeklyEmail, notifyCommunityLessons)
- `useUpdateSettings().mutate({key: value})` → toggle settings
- `useDeleteAccount().mutateAsync()` → xóa account, sau đó navigate `/dang-ky` via `window.location.assign()`

## Bố cục & các khối

### PageHero
- Title: "Tiền của bạn là chuyện riêng của bạn."
- Subtitle: "An Tâm AI ưu tiên bảo vệ dữ liệu và minh bạch cách AI hoạt động."
- Scene: HeroLakeCity

### Privacy Card (1fr left)
- Icon ShieldCheck blue
- Title "Quyền riêng tư của bạn", subtitle "Bạn luôn kiểm soát dữ liệu và cách An Tâm AI sử dụng chúng."
- Rows:
  1. "Dữ liệu tài sản lưu an toàn" + badge "Đang bật" + Toggle disabled checked
  2. "Chia sẻ dữ liệu cho phân tích nâng cao" + badge "Tùy chọn" + Toggle (advancedAnalysis)
  3. "Tải xuống dữ liệu của tôi" + soft Button (Download icon) → `window.location.href = '/api/me/export'`
  4. "Xóa toàn bộ dữ liệu" + danger Button (Trash2) → show confirm modal

### Delete Confirm Modal
- Dialog: "Xác nhận xóa dữ liệu"
- Input text: "Gõ XÓA để xác nhận"
- Button "Xóa dữ liệu" chỉ enable khi input === "XÓA"
- useDeleteAccount().mutateAsync() → `window.location.assign('/dang-ky')`

### Data Used Card (1.15fr right)
- Icon Database
- Title "Dữ liệu nào được dùng?", subtitle "An Tâm AI chỉ sử dụng những dữ liệu cần thiết để hỗ trợ bạn tốt hơn."
- 2 columns:
  - Green panel (CheckCircle2 header): 5 rows (Mục tiêu / Cấu trúc danh mục / Dòng tiền / Quỹ dự phòng / Lựa chọn mô phỏng)
  - Red panel (XCircle header): 3 rows (Không quảng cáo / Không bán bên 3 / Không chia sẻ tùy ý)

### Transparency Card (1fr left)
- Icon Bot
- Title "AI hoạt động minh bạch", subtitle "Bạn luôn biết AI đang làm gì với dữ liệu của mình."
- 4 numbered rows (circle + number + title + body):
  1. "AI phân tích dữ liệu để phát hiện rủi ro"
  2. "AI chạy mô phỏng để xem kế hoạch có bền không"
  3. "AI tóm tắt bằng ngôn ngữ dễ hiểu"
  4. "Quyết định cuối cùng vẫn là của bạn"

### Notifications Card (1.15fr right)
- Icon Bell
- Title "Cách bạn muốn nhận hỗ trợ", subtitle "Tùy chỉnh cách An Tâm AI đồng hành cùng bạn."
- 4 rows (IconTile + title/desc + Toggle):
  - notifyGoalDelay
  - notifyPortfolioRisk
  - notifyWeeklyEmail
  - notifyCommunityLessons

### Commitment Banner (full width)
- Icon ShieldCheck green (h-16 w-16)
- "Cam kết của An Tâm AI": text + WindingPath minh họa (right, hidden on small)
- Tone: mint

## Tương tác
- Toggle → useUpdateSettings().mutate({key: value})
- Download button → `window.location.href = '/api/me/export'`
- Delete button → show modal
- Modal cancel → close
- Modal confirm (if text === 'XÓA') → useDeleteAccount().mutateAsync() → `window.location.assign('/dang-ky')`

## Trạng thái
- Loading: PageSkeleton
- Error: ErrorState
- Success: render các khối
- Mutation loading: button disabled, toggle disabled
