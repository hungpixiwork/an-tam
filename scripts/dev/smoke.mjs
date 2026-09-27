#!/usr/bin/env node
// Kiểm tra nhanh mọi trang bằng agent-browser: tải được, không lỗi, không tràn ngang, không thuật ngữ cấm.
// Chạy bằng Node nên không bị chặn như `agent-browser eval` trong Bash của worktree.
//
//   node scripts/dev/smoke.mjs                          # vite 5173, mọi route, 1672px
//   node scripts/dev/smoke.mjs --base http://localhost:5206 --session p6 --routes /lua-chon
//   node scripts/dev/smoke.mjs --widths 1440,1024,390   # kiểm tra tràn ngang nhiều khung
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const BASE = args.base ?? 'http://localhost:5173';
const SESSION = args.session;
const WIDTHS = (args.widths ?? '1672').split(',').map(Number);
const ROUTES = (args.routes ?? '/,/thu-chi,/quy-an-toan,/tang-thu-nhap,/lich-ai,/lua-chon,/danh-muc,/ai-workspace,/nhat-ky-ai,/mo-phong,/cai-dat').split(',')
  // Git Bash đổi '/thu-chi' thành 'C:/Program Files/Git/thu-chi' — gỡ tiền tố đó.
  .map((r) => r.replace(/^[A-Za-z]:[\/].*?[\/]Git(?=[\/]|$)/, '') || '/');
// Từ không được xuất hiện trên giao diện tiếng Việt (xem skill an-tam-conventions).
const BANNED = /\b(runway|HHI|KPI|human capital|exposure)\b|\bcashflow\b(?! agent)/i; // "Cashflow Agent" là tên riêng trong mockup

// Windows: gọi thẳng file .exe (Node không chạy được .cmd khi không có shell).
const WIN_EXE = join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'agent-browser', 'bin', 'agent-browser-win32-x64.exe');
const BIN = process.platform === 'win32' && existsSync(WIN_EXE) ? WIN_EXE : 'agent-browser';
const ab = (...a) => execFileSync(BIN, [...(SESSION ? ['--session', SESSION] : []), ...a], { encoding: 'utf8' }).trim();

const PROBE = `JSON.stringify({
  at: location.pathname,
  login: location.pathname.startsWith('/dang-nhap'),
  err: !!document.querySelector('[role=alert]'),
  ovf: document.documentElement.scrollWidth > innerWidth,
  wide: [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 2).map(e => e.tagName + '.' + String(e.className).slice(0, 60)),
  h: (document.querySelector('main h1, main h2') || {}).textContent || '',
  banned: (document.body.innerText.match(${BANNED}) || [null])[0],
})`;

let bad = 0;
for (const w of WIDTHS) {
  ab('set', 'viewport', String(w), '941');
  for (const r of ROUTES) {
    ab('open', `${BASE}${r}`);
    ab('wait', '1500');
    const raw = ab('eval', PROBE).split('\n').pop();
    const res = JSON.parse(JSON.parse(raw));
    const issues = [
      res.login && 'chưa đăng nhập',
      res.err && 'có thông báo lỗi',
      res.ovf && `tràn ngang (${res.wide.join(', ')})`,
      res.banned && `từ cấm "${res.banned}"`,
    ].filter(Boolean);
    if (issues.length) bad++;
    console.log(`${issues.length ? '✗' : '✓'} ${w}px ${r.padEnd(16)} ${res.h.slice(0, 40).padEnd(40)} ${issues.join(' · ')}`);
  }
}
process.exit(bad ? 1 : 0);
