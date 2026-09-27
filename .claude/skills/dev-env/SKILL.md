---
name: dev-env
description: Khởi động / khởi động lại môi trường dev An Tâm AI an toàn (worker 8787, vite 5173), migrate, seed demo, đăng nhập agent-browser và smoke test mọi trang. Use khi cần chạy app, sau khi merge, khi .dev.vars đổi, hoặc trước buổi demo.
---

# Môi trường dev

## 1. Kiểm tra đang chạy chưa
```bash
curl -s localhost:8787/api/health | head -c 80; curl -s -o /dev/null -w " vite:%{http_code}\n" localhost:5173
```
Chỉ khởi động cái nào đang down (luôn `run_in_background`):
- worker: `npm run worker:dev`  (log: `> $TEMP/antam-worker.log 2>&1`)
- vite: `npm run dev`

## 2. Khởi động lại worker (sau khi đổi `.dev.vars`, wrangler.jsonc, migration lỗi)
Chỉ giết tiến trình của **thư mục chính**, không đụng worker của subagent (cổng 88xx):
```powershell
# PowerShell
Get-NetTCPConnection -LocalPort 8787 -State Listen -EA SilentlyContinue | % { Stop-Process -Id $_.OwningProcess -Force }
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  ? { $_.CommandLine -match 'wrangler' -and $_.CommandLine -notmatch '--port 88' } |
  % { Stop-Process -Id $_.ProcessId -Force }
```
Rồi chạy lại `npm run worker:dev` (background) và chờ health:
```bash
for i in $(seq 1 40); do curl -s localhost:8787/api/health >/dev/null && break; sleep 1; done
```
- Secrets local nằm ở `.dev.vars` (gitignore). Mẫu: `.dev.vars.example`. Worktree có `.dev.vars` riêng — copy về thư mục chính nếu seed cần (vd `SEPAY_WEBHOOK_KEY`).

## 3. Dữ liệu
```bash
npm run db:migrate          # sau mỗi lần merge có migration mới
node scripts/seed-demo.mjs  # in dòng tóm tắt; kỳ vọng: thu 28.500.000 · chi 21.000.000 · dòng tiền 7.500.000 · 4.2 tháng · tài sản ròng 520.000.000
```
- Tài khoản demo: `hung.demo@antam.vn` / `demo12345`.
- **Trước demo luôn seed lại**: đề xuất AI (agent_actions) hết hạn sau 24h.

## 4. Đăng nhập agent-browser (khi bị đẩy về /dang-nhap)
```bash
agent-browser open http://localhost:5173/dang-nhap && agent-browser snapshot -i -c
agent-browser fill @<email> hung.demo@antam.vn && agent-browser fill @<pass> demo12345 && agent-browser click @<nút>
```
Đặt tiếng Việt: trong trang chạy `localStorage.setItem('antam_locale','vi')` (qua `agent-browser eval`, hoặc PowerShell nếu Bash chặn).

## 5. Smoke test
```bash
node scripts/dev/smoke.mjs                                  # 11 route, 1672px
node scripts/dev/smoke.mjs --widths 1440,1024,390           # tràn ngang
node scripts/dev/smoke.mjs --base http://localhost:5206 --session p6 --routes /lua-chon
```
Báo ✓/✗ cho: chưa đăng nhập · thông báo lỗi · tràn ngang (kèm phần tử gây tràn) · từ cấm (runway, HHI, KPI…). Exit code 1 nếu có lỗi.
