# Trang 1 — Tổng quan `/`

Mockup: `C:\Users\ppnh1\Downloads\Ảnh ChatGPT 22_43_39 27 thg 9, 2026-1.png` (1672×941).
Nhân vật demo: anh Hưng (Phạm Phú Nguyễn Hưng) — xem `.claude/skills/mockup-page/pages.md`.

## 1. Lưới bố cục (lưới 12 cột, khoảng cách 16px)

| Hàng | Cột | Cao tương đối | Nội dung |
|---|---|---|---|
| H1 | 12 | ~190px | HeroBanner: "Chào anh Hưng," / dòng nhấn xanh / mô tả xám 2 dòng / QuoteCard giữa-phải / ảnh người + chó + hồ + thành phố bên phải |
| H2 | 3·3·3·3 | ~150px | 4 KpiCard: Điểm An Tâm · Số tháng an toàn · Dòng tiền tháng này (biểu đồ cột mini) · Tỷ lệ tiết kiệm |
| H3 | 8 · 4 | ~260px | "Hôm nay AI đề xuất cho bạn" (3 thẻ ngang pastel) · "Google Calendar hôm nay" (2 pill + 4 dòng giờ) |
| H4 | 5 · 4 · 3 (≈ 4.5/4/3.5) | ~210px | "Tài sản hiện tại" · "Phân bổ nguồn lực cuộc sống" (3 vòng) · "Lựa chọn cuộc đời" (Stepper + hộp vàng) |

## 2. Từng khối

**H1 Hero** — tiêu đề `Chào {anh|chị|bạn} {tên},`; dòng 2 `AI đang giúp {anh} quản lý {em:tiền, thời gian và kế hoạch sống} tốt hơn.`; mô tả 2 dòng; quote `Tài chính tốt hơn / là một cuộc sống tự do hơn.`; ảnh `/family-city.jpg`→ chọn ảnh người + hồ + thành phố. Người dùng mới: dòng 2 mời nhập dữ liệu (`greeting.empty`).

**H2.1 Điểm An Tâm** — `80 /100`, badge `↑ Tốt` (≥80 Tốt xanh, 60–79 Cần chú ý cam, <60 Cần hành động đỏ), thanh tiến độ = điểm/100, chú thích `Tăng 8 điểm so với tháng trước` (Giảm/Không đổi; chưa có dữ liệu tháng trước → "Chưa có số tháng trước để so sánh"). Rỗng: `—` + "Nhập thu chi để tính điểm".
**H2.2 Số tháng an toàn** — `4,2 tháng`, thanh = số tháng / mục tiêu (6), chú thích `Với mức chi hiện tại, quỹ dự phòng đủ sống khoảng 4,2 tháng.` Rỗng: "Nhập chi tiêu hằng tháng để tính".
**H2.3 Dòng tiền tháng này** — `+7.500.000đ` (đỏ nếu âm), biểu đồ cột mini 6 tháng (xanh ≥0, đỏ <0), dưới `Thu 28.500.000đ | Chi 21.000.000đ`. Rỗng: "Chưa ghi thu chi tháng này" + link Ghi thu chi.
**H2.4 Tỷ lệ tiết kiệm** — `26%`, badge `Tốt` (≥20%), `Khá` (10–19%), `Cần cải thiện` (<10%); thanh = tỷ lệ; chú thích `Cao hơn 6% so với trung bình người cùng độ tuổi` (thấp hơn / bằng; chưa có năm sinh → "Thêm năm sinh để so sánh với người cùng độ tuổi").

**H3 trái — Hôm nay AI đề xuất cho bạn** (link `Xem tất cả đề xuất →` → `/ai-workspace`). 3 thẻ theo 3 nhóm cố định:
1. An toàn (đỏ, badge `Ưu tiên cao`): `Tăng quỹ dự phòng` — `Mỗi tháng dành thêm 2.000.000đ vào quỹ an toàn để đạt 6 tháng chi tiêu.` Nút đầy xanh đậm `Thực hiện ngay →` → modal xác nhận số tiền/tháng. Khi đã đúng tiến độ: badge `Đúng tiến độ`, nút viền `Xem chi tiết →`.
2. Tiết kiệm (cam/xanh lá, badge `Tiết kiệm`): `Chặn chi tiêu lãng phí` — `Bạn có thể tiết kiệm ~1.200.000đ/tháng từ các khoản chi chưa cần thiết (…).` Nút viền `Xem chi tiết →` → `/thu-chi`.
3. Phát triển (xanh dương, badge `Phát triển bản thân`): `Học kỹ năng tăng thu nhập` — `Dành 45 phút mỗi ngày học kỹ năng AI/No-code để đạt mục tiêu tăng thu nhập 30% trong 6 tháng tới.` Nút viền `Bắt đầu hôm nay →` → `/tang-thu-nhap`.
Menu ⋯: `Ẩn hôm nay`. Rỗng: mỗi nhóm có câu mời nhập (ghi thu chi / đặt mục tiêu / đặt mục tiêu thu nhập).

**H3 phải — Google Calendar hôm nay** (link `Xem lịch đầy đủ →` → `/lich-ai`). Pill ngày `Thứ Bảy, 27 tháng 9, 2026` + pill `4 việc hôm nay`. Mỗi dòng: cột giờ `08:00 – 08:30` | chấm màu theo loại (tài chính xanh lá, kỹ năng xanh dương, công việc cam, cá nhân tím, nghỉ ngơi xanh ngọc) | tiêu đề đậm + phụ đề | ⋯ (`Đánh dấu xong` / `Bỏ đánh dấu`). Rỗng: "Hôm nay chưa có việc nào" + link Mở Lịch AI.

**H4.1 Tài sản hiện tại** (nút viền `Xem chi tiết →` → `/danh-muc`). `Tổng tài sản ròng ⓘ` → `520.000.000đ` + badge `↑ N%` + `So với 3 tháng trước`. StackedBar 4 màu: Tiền mặt (xanh lá) · Đầu tư (xanh dương) · Tài sản khác (vàng) · Nợ phải trả (tím), legend 4 cột số tiền + %. Rỗng: "Chưa có tài sản" + nút Thêm tài sản.
**H4.2 Phân bổ nguồn lực cuộc sống** — 3 ProgressRing icon ở tâm: Tài chính (= Điểm An Tâm), Thời gian, Kỹ năng; trạng thái ≥70 `Đang đi đúng hướng` (xanh), thời gian <70 `Cần tối ưu hơn` (đỏ nhạt), kỹ năng <70 `Còn nhiều cơ hội phát triển` (cam). Thiếu dữ liệu → vòng xám "Chưa có dữ liệu".
**H4.3 Lựa chọn cuộc đời** (link `Xem tất cả →` → `/lua-chon`). Icon mũ tốt nghiệp + tên + mô tả; Stepper 4 mốc; hộp vàng `Cần thêm N tháng chuẩn bị` + `Dựa trên tình hình tài chính hiện tại, anh nên đạt quỹ dự phòng tối thiểu X trước khi bắt đầu.` + ›. Đủ điều kiện → hộp xanh "Đã sẵn sàng về tài chính". Rỗng: "Chưa có lựa chọn nào được ghim" + link.

Chữ đã đổi so với mockup: "Runway tài chính 12 tháng" → **"Số tháng an toàn 4,2 tháng"**.

## 3. Luồng dữ liệu

Tất cả khối đọc từ một hook `useOverview()` → `GET /api/overview` → `buildOverview()` (`shared/engine/overview.ts`) → `loadUserState` + bảng phụ.

| Khối | Trường `OverviewData` | Engine | Bảng D1 |
|---|---|---|---|
| Hero | `greeting` | `narrate.ts` | users |
| Điểm An Tâm | `peace.score`, `peace.delta` | `peace.ts peaceScore` + `peaceScoreAsOf` (tháng trước) | financial_profiles, holdings, goals, transactions |
| Số tháng an toàn | `safety.months/targetMonths` | `peace.ts emergencyMonths` | goals(kind=emergency), transactions/financial_profiles |
| Dòng tiền | `cashflow.{income,expense,net,months[6]}` | `overview.ts monthCashflow` | transactions |
| Tỷ lệ tiết kiệm | `savings.{rate,peerRate,ageGroup}` | `peerSavingsRate` (`shared/data/peer-benchmarks.ts`) | transactions, financial_profiles.birth_year |
| Đề xuất | `suggestions[]` | `suggestions.ts todaySuggestions` (ánh xạ `nba.ts` sang 3 nhóm) | goals, transactions(value_tag), income_profiles, suggestion_dismissals |
| Lịch hôm nay | `todayEvents`, `todayDate` | lọc theo ngày giờ VN | calendar_events (0013) |
| Tài sản hiện tại | `netWorth.{cash,invested,other,debt,net,deltaPct}` | `netWorthBreakdown` | holdings, liabilities, net_worth_snapshots / transactions |
| Nguồn lực | `resources.{finance,time,skill}` | `resources.ts resourceRings` | time_allocations, value_hours_log, income_profiles |
| Lựa chọn cuộc đời | `lifeChoice` | `lifeChoice.ts lifeChoiceReadiness` | life_choices (0014) |

Hành động:
| Nút | Endpoint ghi | Invalidate | Khối đổi |
|---|---|---|---|
| Thực hiện ngay (modal) | `PATCH /api/goals/:id {monthlyContribution}` hoặc `POST /api/goals` (tạo quỹ dự phòng) | FINANCE_KEYS (overview…) | Đề xuất 1, Lựa chọn cuộc đời (số tháng chuẩn bị), Điểm An Tâm |
| ⋯ Ẩn hôm nay | `POST /api/overview/suggestions/:key/dismiss` | overview | Đề xuất |
| ⋯ Đánh dấu xong | `PATCH /api/calendar/events/:id {done}` | overview | Lịch hôm nay |

Không khối nào lấy số từ hằng số UI — hằng số duy nhất là ngưỡng badge và bảng tham chiếu tỷ lệ tiết kiệm theo độ tuổi (dữ liệu tham chiếu, trong `shared/data`).

## 4. Vòng đối chiếu

### Vòng 1 — `shots/01-r1.png` (1672×941, full page)

| Khối | Mockup | Hiện tại | Lệch | Sửa |
|---|---|---|---|---|
| Lưới tổng | H1 12 · H2 3/3/3/3 · H3 8/4 · H4 ≈4.5/4/3.5 | Đúng thứ tự & tỉ lệ (863fr/518fr, 515fr/434fr/420fr) | — | — |
| Hero | Chữ đọc rõ trên nền trời sáng; quote 2 dòng giữa-phải | Dòng 2 "…tốt hơn." chồng lên cây/nhà của ảnh; quote xuống 3 dòng ("hơn.") | bố cục / ảnh | Thu vùng ảnh 64%→56%, đẩy ảnh sang phải; quote rộng 262px, chữ 13,5px |
| KPI Dòng tiền | Cột mini nằm cùng hàng với số tiền, bên phải | Cột mini rơi xuống dòng dưới, đẩy "Thu/Chi" xuống | bố cục | Cột mảnh hơn (5px, cao 40px) để nằm cùng hàng |
| KPI Điểm An Tâm | 80/100 "↑ Tốt" | 60/100 "↑ Khá" (điểm thật của dữ liệu demo), "Tăng 8 điểm" | số liệu (chấp nhận — tính thật) | — |
| KPI Số tháng an toàn | "Runway 12 tháng" | "Số tháng an toàn 4,2 tháng" | chữ (cố ý theo luật) | — |
| Đề xuất | 3 thẻ pastel, badge, ⋯, nút | Đủ, đúng màu/nút; thẻ cao hơn chút vì cùng hàng với lịch | khoảng cách nhỏ | chấp nhận |
| Lịch hôm nay | "Thứ Bảy, 27 tháng 9, 2025" · 4 việc | "Chủ Nhật, 27 tháng 9, 2026" (ngày thật) · 4 việc, chấm màu, ⋯ | — | — |
| Tài sản hiện tại | 520.000.000đ ↑12% · 4 màu · legend 4 cột | 520.000.000đ ↑5% (tính thật từ sổ thu chi 3 tháng) · 4 màu · legend 4 cột | số liệu (chấp nhận) | — |
| Nguồn lực | 3 vòng 70/60/55, badge vừa khung | 60/62/55; badge "Còn nhiều cơ hội phát triển" sát mép card | chữ bị sát | Badge của ProgressRing (UI kit) cho phép xuống dòng, căn giữa |
| Lựa chọn cuộc đời | Stepper 4 mốc, hộp vàng "Cần thêm 6 tháng" | Đủ; "Cần thêm 9 tháng" (36tr thiếu ÷ 4tr/tháng); nhãn "Chuẩn bị tài chính" 2 dòng | số liệu (thật) | — |

### Vòng 2 — `shots/01-r2.png`

| Khối | Mockup | Hiện tại | Lệch | Sửa |
|---|---|---|---|---|
| Hero | Chữ trên nền sáng, quote 2 dòng | Đã hết chồng chữ lên ảnh; quote 2 dòng | — | — |
| KPI Dòng tiền | Cột mini bên phải cùng hàng số tiền | Vẫn rơi xuống dòng dưới (số tiền 26px + cột > bề rộng cột chữ) | bố cục | Thêm `aside` + `valueClassName` vào `KpiCard` (UI kit): cột mini nằm ở cột riêng bên phải hàng tiêu đề, số tiền 24px không xuống dòng |
| Nguồn lực | Badge nằm gọn dưới vòng | "Còn nhiều cơ hội phát triển" vẫn tràn mép phải card (class `whitespace-nowrap` của Badge thắng) | chữ bị cắt | Dùng `!whitespace-normal !h-auto` cho badge của `ProgressRing` → xuống 2 dòng, căn giữa |
| KPI (cả hàng) | Cao ~150px | Cao ~175px do chú thích 2 dòng | khoảng cách | chấp nhận (chữ chú thích dài hơn vì dùng câu dễ hiểu) |
| Lựa chọn cuộc đời | Nhãn mốc 1 dòng | "Chuẩn bị tài chính" 2 dòng (cột ~92px) | chữ | chấp nhận |

### Vòng 3 — `shots/01-r3.png`

| Khối | Mockup | Hiện tại | Lệch | Sửa |
|---|---|---|---|---|
| KPI Dòng tiền | Nhãn "Dòng tiền tháng này" đủ chữ, cột mini cạnh số tiền | Cột mini đã lên cùng hàng nhưng chiếm cột riêng → nhãn bị cắt "Dòng tiền tháng n…" | chữ bị cắt | `aside` của `KpiCard` chuyển vào chính hàng giá trị (`ml-auto`), nhãn dùng hết bề rộng — kiểm tra lại bằng `eval`: không nhãn nào bị cắt |
| Nguồn lực | Badge 1 dòng | Badge không còn tràn; "Cần củng cố thêm" xuống 2 dòng | chữ | Rút gọn "Cần củng cố" |
| Các khối khác | — | Khớp bố cục, thứ tự, màu, icon | — | — |

### Vòng 4 (cuối) — `shots/01-r4.png`

| Khối | Mockup | Hiện tại | Lệch | Sửa |
|---|---|---|---|---|
| Hero | Chào + dòng nhấn xanh + mô tả + quote + ảnh hồ/thành phố | Khớp (ảnh `/hero-lake-city.jpg`) | ảnh khác nội dung (không có người + chó) | chấp nhận — dùng ảnh sẵn có |
| KPI ×4 | 80/100 · 12 tháng · +7.500.000đ + cột mini · 26% | 60/100 "Khá" (+8) · 4,2 tháng · +7.500.000đ + cột mini xanh/đỏ · 26% "Tốt" (+6% so với nhóm 25–34) | số liệu tính thật; KPI cao hơn ~20px | chấp nhận |
| Đề xuất ×3 | pastel · badge · ⋯ · nút | Khớp | — | — |
| Lịch hôm nay | 2 pill + 4 dòng | Khớp | — | — |
| Tài sản / Nguồn lực / Lựa chọn | 3 cột ≈ 4.5/4/3.5 | Khớp; ↑5% và "9 tháng" là số thật | badge 2 dòng ở vòng Kỹ năng | chấp nhận |

Không còn dòng lệch quan trọng.

## 5. Kiểm tra

- **Tràn ngang** (`agent-browser set viewport` + `eval scrollWidth > innerWidth`): 1672 / 1440 / 1024 / 390 → `false`; không phần tử nào vượt mép phải; không nhãn `.truncate` nào bị cắt (đã sửa legend 4 cột → 2 cột dưới 1600px, dòng lịch cho xuống dòng trên điện thoại).
- **Hành động thật**: bấm "Thực hiện ngay" → hộp thoại (đang góp 4.000.000đ, AI đề xuất 6.000.000đ, "quỹ đạt 120.000.000đ sau khoảng 6 tháng") → Xác nhận → `PATCH /api/goals/:id` → Điểm An Tâm 60 → 70, thẻ An toàn đổi sang "Quỹ dự phòng đúng tiến độ", Lựa chọn cuộc đời "Cần thêm 9 tháng" → "6 tháng"; tải lại trang vẫn giữ. "Ẩn hôm nay" → còn 2 thẻ; lịch "Đánh dấu xong" → gạch ngang. Chạy lại `node scripts/seed-demo.mjs` đưa dữ liệu demo về như cũ (idempotent).
- **Trạng thái rỗng** (tài khoản mới đăng ký qua API): hero mời "Nhập dữ liệu đầu tiên"; 4 KPI hiện "—" + link nhập; 3 đề xuất hướng dẫn nhập (chi tiêu / ghi thu chi / mục tiêu thu nhập); lịch, tài sản, lựa chọn có EmptyState + nút; 3 vòng xám "Chưa có dữ liệu". Lỗi tải: `ErrorState` có nút Thử lại.
- `npm run typecheck`, `npm test` (145 xanh, thêm `tests/overview-page.test.ts`), `npm run build` xanh; `npm --prefix client run lint` không lỗi.
