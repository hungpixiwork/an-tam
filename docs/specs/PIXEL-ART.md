# Hệ thống minh họa pixel art

Mọi hình minh họa là **pixel art 2D tự vẽ bằng code**: sprite định nghĩa bằng chuỗi ký tự, render ra SVG
(`shape-rendering="crispEdges"`), nền trời/đất dùng gradient CSS. Không dùng ảnh raster, không cắt từ mockup.

## Engine (`client/src/components/pixel/`)
| File | Vai trò |
|---|---|
| `palette.ts` | bảng màu chung (~40 màu: trời, nước, lá, da, tóc, áo, gạch, kính, kim loại) |
| `sprite.ts` | kiểu `Sprite = { rows: string[]; palette: Record<char, color> }`, hàm `runs()` gộp pixel |
| `PixelSprite.tsx` | render 1 sprite ra `<g>`/`<svg>`; gộp các pixel liền nhau cùng màu trên 1 hàng thành 1 `<rect>` |
| `rng.ts` | PRNG `mulberry32(seed)` — mọi thứ sinh thủ tục đều tất định |
| `generators.ts` | sinh skyline (tòa nhà + cửa sổ), rặng cây, mặt nước có vệt sáng, mây, đồi |
| `PixelScene.tsx` | khung scene: `viewBox` theo "pixel logic", nền gradient, `preserveAspectRatio` |
| `scenes/*.tsx` | các scene hoàn chỉnh |
| `pixel.css` | animation: mây trôi, nước lấp lánh, cửa sổ nhấp nháy, hơi cà phê |

### Quy ước sprite
```ts
const CUP: Sprite = {
  palette: { w: '#ffffff', c: '#6b3f2a', s: '#d6dde6' },
  rows: [
    '.www.',
    'wcccw',
    'wwwws',
  ],
};
```
- `.` hoặc khoảng trắng = trong suốt.
- 1 ký tự = 1 pixel logic; scene quyết định tỉ lệ bằng `viewBox` nên luôn sắc nét ở mọi kích thước.
- Hàm `runs(rows)` → danh sách `{x, y, w, color}`; số `<rect>` ≈ số đoạn màu, không phải số pixel.
- Sprite nhân vật có thể dùng `mirror` để lật ngang, `recolor` để đổi màu áo/tóc (sinh gia đình, avatar).

### Quy ước scene
- Pixel logic: banner 320×56, card 160×64, promo 96×112 (tùy scene).
- Scene có thể tăng mật độ bằng `new PixelCanvas(w, h, scale)`; tọa độ vẽ vẫn theo lưới cũ, còn SVG path và `PixelScene` dùng kích thước đầu ra `w * scale` × `h * scale`. Dùng `finePx()` cho chi tiết một pixel ở độ phân giải mới.
- Lớp từ xa đến gần: gradient trời → mặt trời/mây → skyline xa (nhạt) → skyline gần → mặt nước → bờ/cây → nhân vật.
- Scene nằm bên phải banner, mép trái **fade** về màu nền banner bằng mask gradient để chữ đọc rõ.
- Tất cả scene nhận `className` và co giãn theo khung cha (`width: 100%; height: 100%`).

### Animation
| Hiệu ứng | Cách làm |
|---|---|
| Mây trôi | `translateX` 40–60s, `steps()` để giữ cảm giác pixel |
| Nước lấp lánh | vệt sáng đổi `opacity` 2–4s, lệch pha |
| Cửa sổ đèn | một số cửa sổ nhấp nháy chậm |
| Hơi cà phê | 2 pixel bay lên, lặp 3s |
Tất cả tắt khi `prefers-reduced-motion: reduce`.

## Scene theo màn
| Scene | Màn | Mô tả | Trạng thái |
|---|---|---|---|
| `HeroLakeCity` | 01, 06, 07, 10 | trời sáng, mặt trời, thành phố 2 lớp, hồ phản chiếu, cây rủ lá, người ngồi ghế cầm cốc cà phê nhìn ra hồ | ✅ |
| `HouseCalendar` | 01 | ngôi nhà mái đỏ, cây, tờ lịch có đồng hồ đỏ | ✅ |
| `FamilyCity` | 01 | gia đình 3 thế hệ (ông, bố, mẹ, 2 con) trước nền thành phố và cây | ✅ |
| `WindingPath` | sidebar | đồi xanh, con đường uốn lượn về phía mặt trời, cây hai bên | ✅ |
| `PixelAvatar` | topbar | avatar đầu người sinh từ `avatar_seed` (màu da, tóc, áo) | ✅ |
| `FamilyLaptop` | 02 | bố mẹ và con bên laptop, bảng checklist "Nhà của chúng ta…" | ⏳ |
| `Signposts` | 03, 05 | người nhìn biển chỉ đường "Cơ hội / Thử thách / Tương lai tốt hơn" | ⏳ |
| `HouseDream` | 04 | người ngồi nhìn ngôi nhà bên hồ | ⏳ |
| `ClipboardTarget` | 03 | clipboard checklist + bia bắn cung (banner cuối trang) | ⏳ |
| `WorriedPerson` | 04 | người suy nghĩ + dấu chấm than đỏ | ⏳ |
| `ProfileAvatar` | 05 | chân dung lớn trong vòng tròn xanh | ⏳ |
| `RobotHelper` | 05, 08 | robot trắng tai nghe xanh, laptop, bảng biểu đồ | ⏳ |
| `SavingsJar` | 09 | hũ "QUỸ DỰ PHÒNG" với chồng xu và icon nhà / xe / y tế / ô | ⏳ |
| `StudyGroup` | 09 | nhóm 5 người bàn học quanh bàn | ⏳ |
| `HistoryThumbs` | 09 | 3 thumbnail: khủng hoảng 2008, lạm phát, COVID-19 | ⏳ |
| `ShieldHills` | 10 | khiên tích xanh + đồi và thành phố (banner cam kết) | ⏳ |

## Hiệu năng
- Mỗi scene < 1 500 `<rect>` sau khi gộp; sprite tính 1 lần (`useMemo` / hằng module).
- Không re-render theo state của trang (scene là component thuần, `React.memo`).
