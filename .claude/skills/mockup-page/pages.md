# 9 trang — mockup, route, bố cục, dữ liệu

Mockup: `C:\Users\ppnh1\Downloads\Ảnh ChatGPT 22_43_<ss> 27 thg 9, 2026-<n>.png` — kích thước ~1672×941.

| N | ss | Trang | Route | Feature folder | Gộp trang cũ |
|---|----|-------|-------|----------------|--------------|
| 1 | 39 | Tổng quan | `/` | `features/overview` | — |
| 2 | 41 | Sổ thu chi & dòng tiền | `/thu-chi` | `features/ledger` | Thói quen → tab `?tab=thoi-quen` |
| 3 | 42 | Quỹ an toàn & mục tiêu | `/quy-an-toan` | `features/safety` | `plan/SafetyPlanPage`, `goals/GoalsPage` |
| 4 | 44 | Tăng thu nhập & kỹ năng | `/tang-thu-nhap` | `features/earn` | — |
| 5 | 45 | Lịch AI & kế hoạch tự động | `/lich-ai` | `features/calendar` | — |
| 6 | 47 | Lựa chọn cuộc đời | `/lua-chon` | `features/choices` | — |
| 7 | 49 | Danh mục & rủi ro tập trung | `/danh-muc` | `features/portfolio` | — |
| 8 | 50 | AI Workspace · MCP · Agents | `/ai-workspace` | `features/workspace` | — |
| 9 | 51 | Nhật ký AI, kiểm toán & quyền riêng tư | `/nhat-ky-ai` | `features/audit` | `ai/AiMonitorPage` |

Nhân vật demo (thống nhất mọi trang): **anh Hưng** (Phạm Phú Nguyễn Hưng), thu nhập 28.500.000đ/tháng (lương 22tr, làm thêm 4tr, đầu tư 2,5tr), chi 21.000.000đ/tháng, chi thiết yếu 20tr/tháng, quỹ dự phòng 84tr = **4,2 tháng an toàn** (mockup trang 1 ghi "Runway 12 tháng" → thay bằng "Số tháng an toàn 4,2 tháng", đồng bộ với trang 3), tài sản ròng 520tr, đầu tư 320tr (cổ phiếu 45% trong đó 112tr cổ phiếu công ty mình), nợ 50tr, mục tiêu MBA 300tr.

Lưới: nội dung ~1420px, lưới 12 cột, khoảng cách 16–20px, card bo 16px viền mảnh `line`, nền `canvas`.

---

## 1. Tổng quan `/`
**Bố cục**
- H1: HeroBanner full 12 cột, cao ~190px: "Chào anh Hưng," + dòng 2 "AI đang giúp anh quản lý **tiền, thời gian và kế hoạch sống** tốt hơn." (cụm giữa màu xanh lá) + mô tả xám 2 dòng; QuoteCard "Tài chính tốt hơn là một cuộc sống tự do hơn." nằm giữa-phải trên ảnh; ảnh người + chó ngắm thành phố bên phải.
- H2: 4 KpiCard bằng nhau (3/3/3/3):
  1. Điểm An Tâm `80/100` badge "↑ Tốt", thanh tiến độ xanh, "Tăng 8 điểm so với tháng trước".
  2. Số tháng an toàn `4,2 tháng`, thanh, "Với mức chi hiện tại, quỹ dự phòng đủ sống khoảng 4,2 tháng."
  3. Dòng tiền tháng này `+7.500.000đ` + biểu đồ cột mini 6 tháng (xanh/đỏ), dưới: "Thu 28.500.000đ | Chi 21.000.000đ".
  4. Tỷ lệ tiết kiệm `26%` badge "Tốt", thanh, "Cao hơn 6% so với trung bình người cùng độ tuổi".
- H3: trái 8 cột "Hôm nay AI đề xuất cho bạn" (link "Xem tất cả đề xuất →") chứa 3 thẻ ngang bằng nhau, mỗi thẻ: icon tile, badge (Ưu tiên cao đỏ / Tiết kiệm xanh / Phát triển bản thân xanh dương), menu ⋯, tiêu đề đậm, mô tả 3 dòng, nút (thẻ 1 nút xanh đậm đầy "Thực hiện ngay →", thẻ 2–3 nút viền "Xem chi tiết →", "Bắt đầu hôm nay →"); nền thẻ pastel nhạt theo màu. Phải 4 cột "Google Calendar hôm nay" (link "Xem lịch đầy đủ →"): pill ngày "Thứ Bảy, 27 tháng 9, 2026" + pill "4 việc hôm nay"; danh sách 4 dòng: cột giờ trái (08:00–08:30…), chấm màu theo loại, tiêu đề đậm + phụ đề, ⋯.
- H4: 3 cột ~ (4.5/4/3.5 → dùng 5/4/3 hoặc 4/4/4 tùy độ khớp):
  - "Tài sản hiện tại" (nút "Xem chi tiết →"): "Tổng tài sản ròng ⓘ" `520.000.000đ` badge "↑ 12%" "So với 3 tháng trước"; StackedBar 4 màu (Tiền mặt xanh lá, Đầu tư xanh dương, Tài sản khác vàng, Nợ phải trả tím) + legend 4 cột có số tiền và %.
  - "Phân bổ nguồn lực cuộc sống": 3 ProgressRing có icon bên trong (Tài chính 70% "Đang đi đúng hướng" xanh, Thời gian 60% "Cần tối ưu hơn" đỏ nhạt, Kỹ năng 55% "Còn nhiều cơ hội phát triển" cam).
  - "Lựa chọn cuộc đời" (link "Xem tất cả →"): icon + "Học thạc sĩ Quản trị Kinh doanh (MBA)" + mô tả; Stepper 4 mốc (Tìm hiểu ✓, Chuẩn bị tài chính ✓, Ứng tuyển, Bắt đầu học); hộp cảnh báo vàng "Cần thêm 6 tháng chuẩn bị" + giải thích + mũi tên.
**Dữ liệu** `GET /api/overview` (mở rộng `buildOverview` trong `shared/engine/overview.ts`): `peaceScore` + delta tháng trước (`net_worth_snapshots`/lịch sử điểm), `safeMonths` (`peace.ts emergencyMonths`), `cashflow6m` (từ `transactions`), `savingsRate` + `peerSavingsRate` (bảng tham chiếu `shared/data/peer-benchmarks.ts` theo nhóm tuổi), `todaySuggestions[3]` (`nba.ts nextBestActions` → map sang 3 nhóm: an toàn / tiết kiệm / phát triển), `todayEvents` (bảng `calendar_events`, migration 0013 tối thiểu; nguồn local, sau này Google), `netWorthBreakdown` (holdings + liabilities), `resourceRings` (`resources.ts`: tài chính = điểm An Tâm, thời gian = `time_allocations`, kỹ năng = `skill_plan_items`/`value_hours_log`), `pinnedLifeChoice` (bảng `life_choices` tối thiểu, migration 0014).
**Hành động thật**: "Thực hiện ngay" (tăng quỹ dự phòng) → mở modal xác nhận số tiền/tháng → cập nhật `monthlyContribution` của mục tiêu quỹ dự phòng (hoặc tạo) → KPI/đề xuất đổi. Menu ⋯ trên đề xuất: "Ẩn hôm nay". Dòng lịch ⋯: "Đánh dấu xong".

## 2. Sổ thu chi & dòng tiền `/thu-chi`
**Bố cục**: Tiêu đề + mô tả trái, 3 nút phải (Thêm giao dịch – xanh đậm; Chia đều chi phí; Đặt ngân sách tháng – viền xanh dương). H2: 4 KpiCard (Tổng thu nhập 28.500.000đ ↑12%, Tổng chi tiêu 21.000.000đ ↑8% đỏ, Dòng tiền ròng +7.500.000đ ↑28%, Ngân sách tháng 9 21.000.000đ đã chi 68% còn lại 10.000.000đ + link). H3: 3 cột (5/4/3): combo chart 6 tháng (cột thu xanh, cột chi đỏ, đường dòng tiền ròng xanh dương) | donut "Cơ cấu chi tiêu tháng 9" tổng giữa + bảng 7 danh mục % và tiền | "Gợi ý từ An Tâm AI" (hộp cảnh báo cam, bullet, hộp gợi ý xanh "tiết kiệm ~1.500.000đ/tháng", nút). H4: 3 cột (4/4/3): Giao dịch gần đây (5 dòng icon, tên, thời gian, badge danh mục, số tiền ±, ⋯) | Hóa đơn & đăng ký định kỳ (5 dòng: tên, "Hàng tháng • Ngày 10", số tiền, badge "Sắp đến hạn (3 ngày)"/"Tự động gia hạn") | banner minh họa "Tiết kiệm hôm nay vì những mục tiêu lớn hơn" + nút "Xem mô phỏng mục tiêu của bạn →".
**Dữ liệu**: `GET /api/ledger/dashboard?month`, `budgets`, `recurring_bills`, `POST /api/ledger/split` (VietQR), transactions CRUD sẵn có. Tab Thói quen dời từ `habits/HabitsPage`.
**Demo**: danh mục chi T9: Ăn uống 35% 7.350.000, Nhà ở 20% 4.200.000, Di chuyển 12% 2.520.000, Mua sắm 10% 2.100.000, Giải trí 8% 1.680.000, Y tế & Sức khỏe 7% 1.470.000, Khác 8% 1.680.000. Hóa đơn: Tiền điện 820k ngày 10, Internet 220k ngày 15, Netflix 180k ngày 20, Spotify 59k ngày 22, Bảo hiểm sức khỏe 350k ngày 25.

## 3. Quỹ an toàn & mục tiêu `/quy-an-toan`
**Bố cục**: HeroBanner ngắn (tiêu đề + mô tả + quote "Một quỹ dự phòng vững vàng cho bạn sự tự do trước những bất ngờ."). H2: 3 khối (5/4/3): Quỹ an toàn (ring "4,2 tháng", Đã có 84.000.000đ, Cần thêm để đạt 6 tháng 36.000.000đ, hộp nhắc xanh) | Mục tiêu đề xuất (2 thẻ: Đạt 6 tháng cần thêm 36tr – tiết kiệm 6tr/tháng trong 6 tháng – nút "Lên kế hoạch" xanh dương; Đạt 12 tháng cần 156tr – 7,8tr/tháng trong 20 tháng) | "Nếu mất việc hôm nay" (hộp đỏ "Chưa an toàn" + Stepper Hiện tại 4,2 / Mức an toàn 6 / Rất an toàn 12). H3: "Các mục tiêu tiết kiệm của bạn" Tabs Tất cả(4)/Ngắn hạn(2)/Trung hạn(1)/Dài hạn(1) + nút "Thêm mục tiêu"; 4 thẻ mục tiêu ngang (icon, tên, phụ đề, badge, số hiện có/mục tiêu, %, thanh, "Còn N tháng", "Chi tiết →"). H4: Gợi ý AI (tóm tắt 3 bullet | hộp "Bạn có thể tiết kiệm thêm 4.000.000đ/tháng" | "Tác động đến mục tiêu" sớm hơn N tháng).
**Dữ liệu**: `GET /api/safety` (`safety.ts`), goals CRUD (thêm `icon`, `horizon`), `PUT /api/safety/target`. **Demo**: Quỹ dự phòng 84/120tr 70%, Du lịch Nhật Bản 16/60tr, Học tập MBA 40/150tr, Mua xe ô tô 120/600tr.

## 4. Tăng thu nhập & kỹ năng `/tang-thu-nhap`
**Bố cục**: HeroBanner (quote "Kỹ năng hôm nay là thu nhập ngày mai."). H2: 3 khối (4/5/3): Nguồn thu nhập hiện tại (28.500.000đ/tháng, StackedBar Lương/Làm thêm/Đầu tư, nút "+ Thêm nguồn thu") | Cơ hội tăng thu nhập (3 ListRow có ›) | Giá trị nghề nghiệp (ring 72/100 badge "Khá tốt" + mô tả; thanh "Mức độ AI có thể thay thế công việc" 7 nấc, chỉ báo "Trung bình" + giải thích; "Hành động đề xuất từ AI" 3 dòng). H3: "Lộ trình kỹ năng → thu nhập kỳ vọng" 3 cột nối mũi tên (Kỹ năng cần học ✓ | Thời gian học dự kiến | Thu nhập kỳ vọng thêm). H4: Kế hoạch học tập tuần này (7 ô ngày có trạng thái, giờ) | Cơ hội việc làm & làm thêm phù hợp (ListRow + badge Phù hợp cao/Phù hợp).
**Dữ liệu**: `GET /api/earn/dashboard`, `GET /api/human-capital` (`humanCapital.ts`), `/api/skills`, bảng `opportunities` (seed catalog).

## 5. Lịch AI & kế hoạch tự động `/lich-ai`
**Bố cục**: trái 8–9 cột: HeroBanner ngắn + khối lịch (toolbar: Hôm nay, ‹ ›, "Th 2, 22 Thg 9 – CN, 28 Thg 9, 2026", Segmented Ngày/Tuần/Tháng, Bộ lọc; WeekGrid 07:00–22:00; legend 5 loại). Phải 3–4 cột xếp dọc: Đồng bộ Google Calendar (trạng thái, "Đồng bộ ngay") | AI lập kế hoạch cho bạn (Beta, nút lớn xanh dương "Tạo lịch tự động") | Đề xuất tự động (4 dòng + Toggle) | Đề xuất từ AI tuần này (thẻ + ApprovalBar).
**Dữ liệu**: `GET /api/calendar?week`, events CRUD, `POST /api/calendar/sync`, `POST /api/calendar/auto-schedule` (`scheduler.ts`), `/api/automation-rules`.

## 6. Lựa chọn cuộc đời `/lua-chon`
**Bố cục**: HeroBanner (quote "Quyết định hôm nay kiến tạo phiên bản tốt hơn của ngày mai."). H2: "Tình huống của bạn" (tiêu đề lớn + mô tả trái, 3 chỉ số phải). H3: trái 8 cột "So sánh các phương án" 2 thẻ radio (Gauge 72 và 68, badge), rồi "Phân tích chi tiết – Phương án 1" (Tác động số tháng an toàn "-12 tháng", Chi phí ước tính StackedBar, Cơ hội và lợi ích, Rủi ro chính, hộp Kết luận vàng + 72/100); phải 4 cột "Điều kiện tiên quyết 5/6" checklist + "Kế hoạch hành động do AI đề xuất" 5 bước có mức ưu tiên.
**Dữ liệu**: `/api/life-choices` (`lifeChoice.ts`: khả thi = 40 số tháng an toàn + 30 giữ mục tiêu + 20 giá trị nghề + 10 điều kiện).

## 7. Danh mục & rủi ro tập trung `/danh-muc`
**Bố cục**: tiêu đề + link "Tìm hiểu về quản lý danh mục →". H2: 4 KpiCard (Tổng tài sản ròng 520tr ↑12%, Tài sản đầu tư 320tr 62%, Tài sản khác 150tr 29%, Nợ phải trả 50tr 10%). H3: 3 cột (5/4/3): Cơ cấu danh mục đầu tư (donut "320 triệu đồng" + 5 dòng %, tiền, ›) | Cổ phiếu công ty của bạn (hộp đỏ "Tỷ trọng cao: 35%" + hộp vàng "Bạn có biết?") | Mức độ rủi ro tập trung (Gauge "Cao 70/100" + hộp đỏ). H4: "Rủi ro tập trung theo ngành (cả nghề nghiệp và tài sản)" thanh ngang + badge | hộp xanh "Vì sao rủi ro tập trung quan trọng?". H5: "Thử trước khi đầu tư" form (Loại tài sản, Số tiền, Thời gian nắm giữ, nút "Xem tác động →") | Kết quả dự kiến 3 ô (Rủi ro tập trung 70→48, Số tháng an toàn, Tiến độ mục tiêu 60%→67%) | Gợi ý AI vàng.
**Dữ liệu**: `GET /api/portfolio/risk`, `POST /api/portfolio/what-if` (`concentration.ts`), holdings có `sector`, `isEmployerStock`.

## 8. AI Workspace `/ai-workspace`
**Bố cục**: tiêu đề + mô tả, hộp phải "Nhiều AI Agent phối hợp với nhau…". H2: "Đội ngũ Agent của bạn" 5 thẻ ngang (Planner, Calendar, Cashflow, Skill, Goal: trạng thái "Đang hoạt động", mô tả, việc gần nhất) + "Quản lý Agent". H3: trái 8 cột: Ra lệnh cho đội ngũ AI (ô lệnh, trả lời, chips agent) → Kế hoạch tuần tới (WeekGrid thu gọn + tabs) → Công cụ & MCP đã dùng (Google Calendar, Sheets, Notion, Gmail) → thanh nút (Chỉnh sửa kế hoạch, Yêu cầu điều chỉnh, Từ chối, Phê duyệt và triển khai); phải 4 cột: Nhật ký hoạt động & quy trình thực thi (Timeline) + "Chờ phê duyệt" + "Hành động sẽ được thực hiện sau khi phê duyệt" 6 mục.
**Dữ liệu**: `/api/agents`, `/api/agent/runs`, `/api/agent/actions` (approve cần `Idempotency-Key`).

## 9. Nhật ký AI, kiểm toán & quyền riêng tư `/nhat-ky-ai`
**Bố cục**: HeroBanner (hộp phải "Dữ liệu của bạn luôn an toàn"). H2: trái 8 cột "Nhật ký hoạt động AI" (3 bộ lọc + bảng 6 cột: Thời gian, Tác nhân AI, Hành động, Dữ liệu liên quan (đã ẩn danh), Trạng thái badge, Người phê duyệt, ⋯) | phải 4 cột "Quyền riêng tư & bảo mật dữ liệu" 3 hộp (ẩn danh; cần phê duyệt; toàn quyền kiểm soát: Xuất dữ liệu / Xóa dữ liệu) — anchor `#privacy`. H3: trái "Ứng dụng & tích hợp đã kết nối" (+ Kết nối ứng dụng; bảng Google Calendar, Gmail, Google Sheets, Ngân hàng liên kết) — anchor `#integrations` | phải "Tình trạng hệ thống & đồng bộ dữ liệu".
**Dữ liệu**: `GET /api/audit`, `/api/integrations`, `/api/me/export`, `DELETE /api/me`, `/api/health`.
