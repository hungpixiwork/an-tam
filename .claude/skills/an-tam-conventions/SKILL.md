---
name: an-tam-conventions
description: Quy ước bắt buộc khi code An Tâm AI — stack, lệnh, chữ tiếng Việt (từ cấm → từ thay), dữ liệu thật, test tối thiểu, commit sạch, và các bẫy Windows/Git Bash/worktree đã gặp. Load trước mọi việc code trong repo này, và dán phần "Luật" vào prompt của mọi subagent.
---

# Quy ước An Tâm AI

## Stack & lệnh
- `client/` React 19 + Vite + Tailwind + TanStack Query; UI kit `client/src/components/ui`; mỗi trang `client/src/features/<x>/`, tách mỗi khối 1 file (mẫu: `features/overview/`).
- `worker/` Hono + D1; route `worker/routes/<domain>.ts` (đã mount sẵn trong `worker/index.ts`); helper `worker/lib/{audit,idempotency,crypto,state,refresh}.ts`.
- `shared/engine/*.ts` hàm thuần; types `shared/types/api/<domain>.ts`; i18n `shared/i18n/<lang>/<ns>.ts` (vi/en/zh đủ key).
- Migration `migrations/00NN_<domain>.sql` — lấy số lớn nhất hiện có + 1; khi chạy song song, mỗi agent được cấp số riêng.
- Lệnh: `npm run typecheck` · `npm test` · `npm run build` · `npm run db:migrate` · `node scripts/seed-demo.mjs` · `node scripts/dev/smoke.mjs`.

## Luật (dán vào prompt subagent)
1. **Tính năng thật**: không số nào gõ cứng trong UI. Luồng: khối → hook → endpoint → engine → D1. Người dùng nhập mới → màn hình đổi.
2. **Dữ liệu demo chỉ qua API thật** (`scripts/seed-demo.mjs`, idempotent, mỗi phần 1 hàm + 1 dòng trong `steps`). Chỉnh *đầu vào* seed để số tính ra gần mockup; không ép số. Thêm giao dịch mới vào tháng này thì **bù** ở chỗ khác để tổng thu/chi vẫn 28,5tr / 21tr.
3. **Chữ tiếng Việt dễ hiểu**, không thuật ngữ:
   | Cấm | Dùng |
   |---|---|
   | Runway | Số tháng an toàn / quỹ đủ sống X tháng |
   | HHI, concentration index | Mức độ rủi ro tập trung |
   | KPI | (bỏ, chỉ ghi tên chỉ số) |
   | Cashflow | Dòng tiền |
   | Human capital | Giá trị nghề nghiệp |
   | AI exposure | Mức độ AI có thể thay thế công việc |
   | Freelance (trong câu) | Làm thêm |
   Giữ tên riêng trong mockup: Google Calendar, AI Workspace, Agent, MCP.
4. **Test tối thiểu**: giữ test cũ xanh; chỉ thêm 1–2 test ngắn cho logic tiền/phê duyệt/bảo mật.
5. **Không giả thành công**: tích hợp chưa kết nối → "Chưa kết nối"/"Cần kết nối …", không hiển thị "Đã kết nối".
6. Hành động ghi quan trọng (duyệt, tiền) cần `Idempotency-Key` + ghi `audit_log`.

## Commit
- Trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Không stage**: `*.docx`, `package.json`/`package-lock.json` (trừ khi thật sự thêm dep), `client/public/version.json`, `scripts/export_docx.py`, `.agents/*.md` ngoài `.agents/pages/` và `.agents/tasks/` (người dùng đang sửa dở), `image.png`.
- Stage theo tên file, không `git add -A` ở gốc.

## Bẫy môi trường đã gặp (Windows)
- **Git Bash đổi đối số bắt đầu bằng `/`** thành đường dẫn Windows (`/thu-chi` → `C:/Program Files/Git/thu-chi`). Dùng `MSYS_NO_PATHCONV=1` hoặc script Node.
- **curl gửi tiếng Việt bị hỏng dấu** → gửi JSON bằng Node `fetch` hoặc `--data-binary @file.json`.
- **agent-browser screenshot**: đường dẫn phải bắt đầu `./` (`./.agents/...`), nếu không `.agents/...` bị hiểu là CSS selector.
- **Worktree guard chặn trong Bash**: heredoc, `eval`, `$var`, `mklink` → dùng tool PowerShell hoặc script Node (`scripts/dev/smoke.mjs`).
- **Tắt worker**: chỉ giết tiến trình giữ đúng cổng (xem skill `dev-env`), không `Stop-Process -Name workerd` khi có agent khác đang chạy.
- `wrangler dev` cần thư mục `client/dist` tồn tại.
- **Worktree mới thiếu `client/node_modules` và `client/dist`** → tạo junction từ repo chính (PowerShell `New-Item -ItemType Junction -Path client\node_modules -Target <main>\client\node_modules`), gỡ junction trước khi commit.
- File dùng CRLF: script Node `replace()` với chuỗi có `\n` sẽ không khớp → dùng tool Edit.
- Class Tailwind truyền vào component đã có `w-full`/`h-full` sẽ không thắng → bọc bằng div có kích thước.
