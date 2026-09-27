---
name: mockup-page
description: Build one An Tâm AI page to match its mockup (1..9) end-to-end — spec, real data flow (backend + frontend), demo seed through the real API, then a visual compare-and-fix loop of at least 3 rounds against the mockup until the page is "mature". Use when asked to build/optimize page N from the 9 ChatGPT mockups, or "/mockup-page N".
---

# mockup-page — làm 1 trang cho tới khi đạt độ chín

Đầu vào: số trang `N` (1..9). Làm **tuần tự**, không nhảy trang. Chỉ chuyển sang trang N+1 khi trang N qua hết "Tiêu chí chín" ở cuối file.

Tham chiếu:
- Bảng trang → mockup → route → dữ liệu: [pages.md](pages.md)
- Kế hoạch tổng: `C:\Users\ppnh1\.claude\plans\pure-skipping-fountain.md` (phần "Backend chi tiết" cho tên bảng/API)
- Stack: client `client/src` (React + Tailwind + TanStack Query, UI kit `client/src/components/ui`), worker `worker/` (Hono + D1), engine thuần `shared/engine`, i18n `shared/i18n/<lang>/<ns>.ts`.

## Luật bắt buộc

1. **Tính năng thật.** Không hardcode con số trong component. Mọi con số trên màn hình phải đến từ API → engine → D1. Dữ liệu demo chỉ được đưa vào **qua API thật** (xem bước 4). Người dùng nhập dữ liệu mới thì màn hình phải đổi theo.
2. **Tiếng Việt đơn giản, thuyết phục.** Không thuật ngữ khó/tiếng Anh: không "Runway" (dùng "Số tháng an toàn"), không HHI/KPI/cashflow. Giữ các tên riêng có trong mockup (Google Calendar, AI Workspace, Agent, MCP). Có đủ key vi/en/zh.
3. **Ít test.** Chỉ giữ test cũ xanh; thêm test ngắn chỉ cho logic tiền/phê duyệt. Tập trung tính năng + UI.
4. **Đúng bố cục mockup** (chia cột, thứ tự khối, tỉ lệ) ở khung 1440–1680px; co giãn hợp lý ở 1024 và 390 (không tràn ngang).
5. Tái sử dụng UI kit sẵn có (`KpiCard`, `SectionCard`, `StackedBar`, `Gauge`, `Stepper`, `Timeline`, `Tabs`, `ListRow`, `ApprovalBar`, `HeroBanner`, `QuoteCard`, `WeekGrid`, `ProgressRing`, `DonutChart`, `ScoreRing`…). Thiếu thì bổ sung vào kit, không viết trùng trong trang.
6. Nếu trang cần dữ liệu của domain chưa xây (vd Tổng quan cần lịch, lựa chọn cuộc đời), **xây phần backend tối thiểu nhưng thật** cho domain đó ngay (bảng + endpoint + engine) theo đúng tên trong kế hoạch, để trang sau mở rộng tiếp.

## Quy trình

### Bước 0 — Môi trường
- Worker: `npm run worker:dev` (cổng 8787), client: `npm run dev` (cổng 5173). Kiểm tra `curl -s localhost:8787/api/health` trước; chỉ khởi động nếu chưa chạy (chạy nền).
- Migration local: `npm run db:migrate`.
- Dữ liệu demo: `node scripts/seed-demo.mjs` (tạo/cập nhật tài khoản `hung.demo@antam.vn` / `demo12345` qua API thật; chạy lại nhiều lần không bị trùng).
- Trình duyệt: dùng `agent-browser` (giữ phiên, không đóng/mở lại). Đăng nhập tài khoản demo, đặt `localStorage.antam_locale='vi'`.

### Bước 1 — Đọc mockup & viết đặc tả trang
- `Read` ảnh mockup của trang N (đường dẫn trong pages.md). Xem kỹ từng khối.
- Viết/ cập nhật `.agents/pages/0N-<slug>.md` gồm:
  - **Lưới bố cục**: từng hàng, số cột và tỉ lệ (theo lưới 12 cột), chiều cao tương đối.
  - **Từng khối**: tiêu đề, trường dữ liệu, định dạng (vd `+7.500.000đ`, `80/100`), badge/màu, nút & hành động, trạng thái rỗng (người dùng mới chưa có dữ liệu thì hiện gì, có nút nhập).
  - Chữ trên màn hình (viết lại cho dễ hiểu nếu mockup dùng thuật ngữ).

### Bước 2 — Thiết kế luồng dữ liệu (ghi vào cùng file đặc tả)
Cho mỗi khối: `khối → hook (client/src/lib/queries/<domain>.ts) → endpoint → hàm engine → bảng D1`, và mỗi hành động người dùng: `form/nút → endpoint ghi (zod) → invalidate query nào → khối nào đổi`. Kiểm tra lại: không khối nào lấy số từ hằng số trong UI.

### Bước 3 — Code
Thứ tự: migration (nếu cần, số tiếp theo, mỗi domain 1 file) → engine thuần → route (file route đã được mount sẵn trong `worker/index.ts`; thay stub 501) → types `shared/types/api/<domain>.ts` → hooks → component trang (`client/src/features/<feature>/`) → i18n namespace. Trang cũ bị gộp (xem pages.md) thì chuyển phần còn dùng vào trang mới và xóa file cũ khi không còn ai import.

### Bước 4 — Dữ liệu demo qua API thật
Bổ sung vào `scripts/seed-demo.mjs` (Node ≥18, dùng `fetch` + cookie `at_session`): gọi đúng các endpoint ghi của trang này để tạo dữ liệu khớp số liệu mockup (xem pages.md). Script phải idempotent (xóa/ghi đè dữ liệu cũ của tài khoản demo trước khi ghi). Chạy lại script.

### Bước 5 — Vòng đối chiếu hình (tối thiểu 3 vòng, tối đa 6)
Mỗi vòng `k`:
1. `agent-browser set viewport 1672 941` (đúng khung mockup), mở route, chờ dữ liệu tải xong.
2. `agent-browser screenshot --full .agents/pages/shots/0N-r<k>.png`.
3. `Read` ảnh chụp **và** ảnh mockup, so từng khối theo thứ tự trên → dưới, trái → phải. Ghi bảng vào file đặc tả, mục "Vòng k":
   | Khối | Mockup | Hiện tại | Lệch (bố cục / khoảng cách / cỡ chữ / màu / icon / chữ / số liệu) | Sửa |
4. Sửa hết các dòng lệch, rồi sang vòng tiếp.
- Sau vòng cuối: kiểm tra tràn ngang ở 1440, 1024, 390 bằng `agent-browser set viewport <w> <h>` + `eval "document.documentElement.scrollWidth > innerWidth"`, và chữ không bị cắt/nút không xuống dòng xấu.

### Bước 6 — Kiểm tra tính năng thật
Bằng `agent-browser`, làm ít nhất 1 hành động chính của trang như người dùng thật (vd thêm giao dịch, đặt ngân sách, bấm "Thực hiện ngay") → xác nhận số trên trang đổi đúng và reload vẫn giữ. Kiểm tra trạng thái rỗng bằng một tài khoản mới (đăng ký qua API) — trang không vỡ, có hướng dẫn nhập.

### Bước 7 — Cổng chất lượng & commit
- `npm run typecheck && npm test && npm run build` phải xanh; `npm --prefix client run lint` không lỗi mới.
- Commit: `feat(page-N): <tên trang> khớp mockup + dữ liệu thật` với trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không stage file ngoài phạm vi (không đụng `.docx`, `package.json` trừ khi thật cần).
- Cập nhật trạng thái trang trong `.agents/pages/README.md` (✅ + ngày + commit).

## Tiêu chí chín (tất cả phải đạt mới qua trang)
- [ ] Đủ mọi khối trong mockup, đúng thứ tự và chia cột ở 1672px; ảnh vòng cuối gần như trùng mockup về bố cục.
- [ ] Không số nào hardcode; seed chạy qua API; nhập dữ liệu mới → màn hình đổi.
- [ ] Trạng thái rỗng và trạng thái lỗi có hướng dẫn rõ ràng.
- [ ] Chữ tiếng Việt dễ hiểu, không thuật ngữ; đủ vi/en/zh.
- [ ] Không tràn ngang ở 1440/1024/390; không chữ bị cắt.
- [ ] Đã chạy ≥3 vòng đối chiếu, bảng lệch vòng cuối không còn dòng quan trọng.
- [ ] typecheck + test + build xanh, đã commit.

## Báo cáo khi xong 1 trang (≤250 từ)
Commit hash; khối đã làm; luồng dữ liệu mới (endpoint/bảng); số vòng đối chiếu và lệch còn lại (nếu có, vì sao chấp nhận); đường dẫn ảnh vòng cuối.
