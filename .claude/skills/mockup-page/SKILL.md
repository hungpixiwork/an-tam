---
name: mockup-page
description: Build one An Tâm AI page to match its mockup (1..9) end-to-end — real data flow (backend + frontend), demo seed through the real API, then at most 3 screenshot-compare-fix rounds against the mockup. Use when asked to build/optimize page N from the 9 ChatGPT mockups, or "/mockup-page N". Supports running several pages in parallel worktrees.
---

# mockup-page — làm 1 trang nhanh và đúng

Mục tiêu thời gian: **≤15 phút/trang**. Đầu vào: số trang `N`. Tham chiếu: [pages.md](pages.md) (bố cục + dữ liệu + số demo từng trang), kế hoạch `C:\Users\ppnh1\.claude\plans\pure-skipping-fountain.md` (tên bảng/API — chỉ đọc phần "Backend chi tiết").

## Luật
1. **Tính năng thật**: không hardcode số trong UI. Số đi API → engine → D1. Demo seed chỉ qua API thật.
2. **Tiếng Việt dễ hiểu**: không "Runway" (→ "Số tháng an toàn"), không HHI/KPI/cashflow. Đủ vi/en/zh.
3. **Ít test**: giữ test cũ xanh; chỉ thêm 1–2 test ngắn cho logic tiền/phê duyệt.
4. **Đúng bố cục mockup** ở 1672px; không tràn ngang ở 1440/1024/390.
5. **Không đọc lan man**: chỉ mở các file được nêu trong prompt/ phần "Đã có sẵn". Không viết tài liệu dài.

## Đã có sẵn — dùng lại
- UI kit `client/src/components/ui`: `KpiCard, SectionCard, StackedBar, Gauge, Stepper, Timeline, Tabs, ListRow, ApprovalBar, HeroBanner, QuoteCard, WeekGrid, ProgressRing, MiniBars, DonutChart, ScoreRing, Badge, Button, Modal, MoneyInput, Segmented, Toggle, TONE_HEX`.
- Mẫu trang: `client/src/features/overview/` — mỗi hàng/khối 1 file, trang chỉ ghép.
- Seed `scripts/seed-demo.mjs`: có `get/post/put/patch/del`, `M`/`K`, `thisMonth`, `today`, `addMonths`; mỗi phần = 1 hàm (xóa dữ liệu cũ của phần đó rồi ghi) + 1 dòng trong mảng `steps`.
- Backend: `calendar_events`/`automation_rules` (0013, `worker/routes/calendar.ts`), `life_choices`+options/prereqs/tasks (0014, `worker/routes/lifeChoices.ts`), `/api/liabilities`, engine `suggestions.ts, resources.ts, lifeChoice.ts, peace.ts, overview.ts, concentration.ts, humanCapital.ts`. Route stub của mọi domain đã được mount trong `worker/index.ts` → chỉ sửa file route của mình.
- Migration: 0010 sổ thu chi, 0011 kỹ năng/cơ hội, 0012 tích hợp; domain khác dùng 0015+ (trang N dùng `00(14+N)` nếu cần, tránh trùng khi chạy song song).

## Môi trường
**Chế độ thường (thư mục chính)**: worker 8787, vite 5173, session agent-browser mặc định.
**Chế độ song song (worktree)** — cổng theo số trang N:
```bash
# ĐẦU TIÊN: đưa worktree lên main mới nhất (worktree có thể tạo từ commit cũ)
git merge --ff-only main || git merge --no-edit main
# node_modules: junction bằng PowerShell (mklink/heredoc/eval bị chặn trong worktree)
#   PowerShell: New-Item -ItemType Junction -Path node_modules -Target D:-Competitions-Hackathonsn-tam
ode_modules
#   PowerShell: New-Item -ItemType Junction -Path client
ode_modules -Target D:-Competitions-Hackathonsn-tam\client
ode_modules
mkdir -p client/dist                     # wrangler dev cần thư mục này tồn tại
npx wrangler d1 migrations apply an-tam-db --local          # DB riêng của worktree
npx wrangler dev --port 880N          # run_in_background
(cd client && API_PORT=880N npx vite --port 520N --strictPort)   # run_in_background
API=http://localhost:880N node scripts/seed-demo.mjs
# agent-browser: luôn thêm --session pN ; mở http://localhost:520N
```
Chung:
```bash
agent-browser [--session pN] set viewport 1672 941
agent-browser [--session pN] open http://localhost:<vite>/dang-nhap ; agent-browser snapshot -i -c
# fill email hung.demo@antam.vn / mật khẩu demo12345, click Đăng nhập
agent-browser eval "localStorage.setItem('antam_locale','vi'); location.href='<route>'; 1"
agent-browser wait 1500 ; agent-browser screenshot --full ./.agents/pages/shots/0N-r<k>.png   # BẮT BUỘC có './' — '.agents/...' bị hiểu là CSS selector
```
- Tiếng Việt gửi API: dùng Node `fetch`, không curl inline.
- Sidebar trông bị cụt ở ảnh full-page là bình thường (sticky), đừng sửa.
- Viết file bằng tool Write/Edit, không dùng heredoc Bash (hỏng khi có dấu nháy đơn).
- Khi thay stub 501 bằng route thật: xóa path đó khỏi danh sách 501 trong `tests/health.test.ts`.
- Bảng `transactions` chỉ lưu ngày (không giờ) — hiển thị "Hôm nay/Hôm qua/dd/mm/yyyy".

## Quy trình
1. **Đọc mockup** (Read ảnh) + mục trang N trong pages.md. Ghi `.agents/pages/0N-<slug>.md` ngắn: lưới 12 cột từng hàng + luồng dữ liệu `khối → hook → endpoint → engine → bảng` + hành động người dùng → khối nào đổi. (≤40 dòng)
2. **Code**: migration → engine → route → `shared/types/api/<domain>.ts` → hooks `client/src/lib/queries/<domain>.ts` → khối UI → i18n ns. Trang cũ bị gộp: chuyển phần dùng được, xóa file khi không còn import.
3. **Seed**: thêm hàm vào `scripts/seed-demo.mjs`; chỉnh đầu vào để số tính ra gần mockup (không ép số). Chạy seed.
4. **Đối chiếu — tối đa 3 vòng**: chụp full → Read ảnh chụp + mockup → liệt kê lệch theo thứ tự ưu tiên (bố cục/cột → thiếu khối/chữ → số liệu → khoảng cách/cỡ chữ → màu/icon) → sửa **tất cả trong 1 lượt** → vòng sau. Vòng 2 không còn lệch quan trọng thì dừng. Giữa các vòng chỉ `npx tsc -p tsconfig.json --noEmit` hoặc `npm run typecheck`.
5. **Kiểm tra nhanh (1 lượt)**: overflow bằng 1 lệnh cho 1440/1024/390 (`set viewport` + `eval "document.documentElement.scrollWidth>innerWidth"`); làm 1 hành động chính trên trình duyệt và xác nhận số đổi; tài khoản rỗng: chỉ gọi API (đăng ký mới → GET dashboard không lỗi).
6. **Cổng + commit**: `npm run typecheck && npm test && npm run build`. Commit `feat(page-N): <tên> khớp mockup + dữ liệu thật` + trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage chỉ file của mình + ảnh vòng cuối + `.agents/pages/0N-*.md` + dòng N trong `.agents/pages/README.md`. Không stage `.docx`, `package.json`/lock, `client/public/version.json`, `scripts/export_docx.py`, `.agents/*.md` ngoài `.agents/pages/`. Xóa ảnh vòng trước. Chế độ song song: dừng worker/vite của mình trước khi kết thúc.

## Tiêu chí xong
Đủ khối, đúng chia cột · không số hardcode, seed qua API, nhập mới → màn hình đổi · chữ dễ hiểu, đủ 3 ngôn ngữ · không tràn ngang · ≤3 vòng đối chiếu · typecheck/test/build xanh, đã commit.

## Báo cáo (≤200 từ)
Commit; khối; endpoint/bảng/engine mới; số vòng + lệch còn lại; ảnh cuối; điểm nào trong skill làm chậm.
