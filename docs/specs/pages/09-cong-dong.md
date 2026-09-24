# Screen 09 — Bài học cộng đồng (Community)

## Mục đích
Chia sẻ bài học tài chính, câu chuyện thực tế, và bối cảnh lịch sử để giúp cộng đồng hiểu rõ hơn về quản lý tài chính.

## Route
- Path: `/cong-dong`
- Sidebar: "Bài học cộng đồng" (menu item)

## Dữ liệu / API
- `useLessons()` → `Lesson[]` (kind: 'lesson'|'story'|'history', isFeatured boolean)
- `useLesson(slug)` → `Lesson` (thêm bodyMd cho reader)
- Filter: featured (isFeatured=true), regular (kind==='lesson' && !featured, max 4), story (kind==='story'), history (kind==='history')

## Bố cục & các khối

### PageHero
- Title: "Tài chính tốt hơn"
- Highlight: "khi ai cũng hiểu rõ hơn."
- Subtitle: "Những bài học đơn giản, dễ áp dụng, giúp nhiều người ra quyết định bền vững hơn."
- Scene: FamilyCity (sceneWidth "55%")

### Featured Card
- Badge orange + Star icon: "Bài học nổi bật tuần này"
- Title large, excerpt
- Button "Xem bài học" (arrow) → open reader
- Minh họa HouseCalendar bên phải (hidden on small)

### 4 Lesson Cards (grid-cols-4)
- Mỗi card: icon (sprout→green, trending-down→red, home→violet, shield-plus→green), title bold, excerpt (line-clamp-2), Button soft "Xem nhanh"
- Click → open reader

### Story Card (1.4fr)
- PixelAvatar seed=38 (20x20)
- Title, quote box (excerpt) với dấu ngoặc kép lớn
- 2 ScoreRing side-by-side: trước vs sau 6 tháng (parse từ title: /(\d+)%.*?(\d+)%/, fallback 61/87)
- Caption "Khả năng mua nhà"
- Button "Xem câu chuyện"

### AI Help Card (1fr)
- 4 rows: Icon + title (BookOpen violet, BarChart3 green, Heart orange, Users blue)
- Static text

### History Card (full width)
- Subtitle: "Nhìn lại các giai đoạn quan trọng trong quá khứ để rút ra bài học cho hôm nay."
- 3 gradient cards (w-32 h-20 tương đương): 
  - building→Building2 red/dark
  - coins→Coins gold
  - virus→Activity red
- Title, excerpt, Button soft sm "Xem nhanh"

### Lesson Reader (right drawer)
- Fixed, slide-in từ bên phải
- Sticky header: category badge, title, readTime, close button
- Scrollable body: excerpt + bodyMd render (## → <h3>, blank line = paragraph)
- Loading: Skeleton

## Tương tác
- Click "Xem bài học" / "Xem nhanh" → setSelectedSlug → open reader
- Click close (X) → close reader
- Reader parse markdown body: lines starting "## " = heading, else = paragraph

## Trạng thái
- Loading: PageSkeleton
- Error: ErrorState
- Success: render các khối
- Reader loading: Skeleton rows
