# Quy ước code màn hình (bắt buộc cho mọi màn)

Màn mẫu chuẩn: `client/src/features/overview/OverviewPage.tsx` — **đọc kỹ trước khi viết màn mới** và làm theo đúng phong cách.

## Cấu trúc
- Mỗi màn = 1 thư mục `client/src/features/<ten>/`, file chính `<Ten>Page.tsx` **export default** component.
  Có thể tách thêm file con trong cùng thư mục nếu file chính > ~350 dòng.
- Router, Sidebar, Topbar, tiêu đề topbar **đã có sẵn** (`src/app/router.tsx`, `src/app/nav.ts`) — KHÔNG sửa.
- KHÔNG sửa các file dùng chung: `src/components/ui/*`, `src/components/pixel/*`, `src/lib/*`, `src/app/*`, `shared/*`, `worker/*`.
  Nếu cần helper riêng, viết trong thư mục màn của mình.

## Dữ liệu
- Chỉ lấy dữ liệu qua hook trong `src/lib/queries.ts` (đã có hook + kiểu dữ liệu cho mọi màn).
- Kiểu dữ liệu engine: `shared/engine/analysis.ts`, `shared/engine/plan.ts`, `shared/types/*`.
- Mẫu xử lý trạng thái:
  ```tsx
  const { data, error, refetch, isPending } = useX();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  ```
- KHÔNG hard-code số liệu tài chính — mọi con số lấy từ API. Chỉ văn bản tĩnh mô tả (ví dụ "AI sẽ không làm gì?") được viết cứng.
- Định dạng: `formatVnd`, `formatPct`, `formatMonth`, `formatDuration` từ `@shared/format`.
  Xác suất/pct trong API là **phân số 0..1** → hiển thị bằng `formatPct(x)`.
- Chuỗi có đánh dấu `{em:..}` `{danger:..}` `{success:..}` + `\n` → render bằng `<Rich text={...} />`.

## UI kit (`@/components/ui`)
`Card` (tone: white|cream|mint|rose|sky|violet), `CardTitle` (icon, tone, title, subtitle, action), `IconTile`,
`Button` / `ButtonLink` (variant: primary|accent|soft|outline|ghost|danger|white; `arrow`, `icon`), `TextLink`,
`Badge` (tone: blue|green|orange|violet|red|teal|gray), `DeltaBadge`, `ScoreRing` (score, max), `DonutChart`,
`ProgressBar`, `Toggle`, `Select`, `Skeleton`, `PageSkeleton`, `ErrorState`, `Rich`, `PageHero`, `cx`, `TONE`.

## Minh họa
Banner đầu trang dùng `PageHero` + scene pixel art có sẵn trong `@/components/pixel`:
`HeroLakeCity`, `FamilyCity`, `HouseCalendar`, `WindingPath`. Ví dụ:
`<PageHero title=".." highlight=".." subtitle=".." scene={(cls) => <HeroLakeCity className={cls} />} />`.
Ô minh họa nhỏ trong card: `<FamilyCity className="h-[110px] w-full" />`. KHÔNG dùng ảnh raster, KHÔNG tạo scene mới.

## Style
- Tailwind + token trong `client/tailwind.config.js` (`text-ink`, `text-ink-soft`, `bg-canvas`, `border-line`,
  `primary-*`, `accent-*`, `success-*`, `warning-*`, `violet-*`, `danger-*`). Không dùng màu hex tùy tiện khi đã có token.
- Icon: `lucide-react`. Biểu đồ: `recharts` (xem `NetWorthChart` ở màn mẫu).
- Khoảng cách giữa các hàng: `space-y-4`; lưới: `grid grid-cols-1 gap-4 xl:grid-cols-[...]`.
  Chuẩn thiết kế 1448px; ≥1280 (`xl:`) bố cục như mockup, nhỏ hơn thì xếp dọc.
- Giao diện 100% tiếng Việt có dấu. a11y: icon-only button phải có `aria-label`.

## Kiểm tra trước khi xong
```bash
cd client && npx tsc -b && npx oxlint src/features/<ten>
```
Phải sạch lỗi. Không chạy dev server / trình duyệt (người điều phối sẽ kiểm tra bằng trình duyệt).
