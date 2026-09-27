#!/usr/bin/env node
// Dữ liệu demo "anh Hưng" — ghi hoàn toàn qua API thật (không chèn thẳng vào DB).
// Chạy lại nhiều lần không bị trùng: mỗi phần xóa dữ liệu cũ của tài khoản demo rồi ghi lại.
//
//   node scripts/seed-demo.mjs                 # mặc định http://localhost:8787
//   API=https://antam.example node scripts/seed-demo.mjs
//
// Số liệu nhân vật: .claude/skills/mockup-page/pages.md ("Nhân vật demo").

const API = (process.env.API ?? 'http://localhost:8787').replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL ?? 'hung.demo@antam.vn';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo12345';
const FULL_NAME = 'Phạm Phú Nguyễn Hưng';

let cookie = '';

async function call(method, path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const err = new Error(`${method} ${path} → ${res.status} ${json?.error?.message ?? ''}`);
    err.status = res.status;
    throw err;
  }
  return json.data;
}
const get = (p) => call('GET', p);
const post = (p, b) => call('POST', p, b);
const put = (p, b) => call('PUT', p, b);
const patch = (p, b) => call('PATCH', p, b);
const del = (p) => call('DELETE', p);

/* ───────── Thời gian (giờ Việt Nam) ───────── */
const vnNow = new Date(Date.now() + 7 * 3_600_000);
const today = vnNow.toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);
const addMonths = (month, d) => {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + d;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
};
const isoWeek = (day) => {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const week = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
const M = 1_000_000;
const K = 1_000;

/* ───────── 1. Tài khoản ───────── */
async function login() {
  try {
    await post('/auth/login', { email: EMAIL, password: PASSWORD });
  } catch (e) {
    if (e.status !== 401) throw e;
    await post('/auth/register', { email: EMAIL, password: PASSWORD, fullName: FULL_NAME, salutation: 'anh' });
  }
  const me = await get('/auth/me').catch(() => null);
  if (me && !me.onboarded) await post('/onboarding', { holdings: [], goals: [], lifeStage: 'building' });
  await patch('/me', { fullName: FULL_NAME, salutation: 'anh' });
  await put('/settings', { locale: 'vi', currency: 'VND' }).catch(() => {});
}

/* ───────── 2. Thu chi cơ bản ───────── */
async function profile() {
  // Chi thiết yếu 20 triệu/tháng; quỹ an toàn mục tiêu 6 tháng; sinh 1994 (32 tuổi)
  await put('/profile', { monthlyIncome: 28_500 * K, monthlyExpense: 20 * M, emergencyTargetMonths: 6, birthYear: 1994 });
}

/* ───────── 3. Tài sản & nợ (tài sản ròng 520 triệu) ───────── */
const HOLDINGS = [
  { name: 'Tiết kiệm ngân hàng (quỹ dự phòng)', category: 'cash', value: 84 * M },
  { name: 'Tài khoản thanh toán', category: 'cash', value: 16 * M },
  { name: 'Chứng chỉ quỹ mở', category: 'fund', value: 136 * M },
  { name: 'Cổ phiếu công ty (thưởng)', category: 'stock', value: 112 * M },
  { name: 'Cổ phiếu khác', category: 'stock', value: 32 * M },
  { name: 'Trái phiếu doanh nghiệp', category: 'bond', value: 40 * M },
  { name: 'Vàng SJC', category: 'other', value: 90 * M, volatility: 'low' },
  { name: 'Xe máy & đồ giá trị', category: 'other', value: 60 * M },
];
const LIABILITIES = [{ name: 'Vay mua xe máy & laptop', kind: 'consumer', balance: 50 * M, monthlyPayment: 2_500 * K, rateBp: 1100 }];

async function assets() {
  for (const h of await get('/holdings')) await del(`/holdings/${h.id}`);
  for (const h of HOLDINGS) await post('/holdings', h);
  for (const l of await get('/liabilities')) await del(`/liabilities/${l.id}`);
  for (const l of LIABILITIES) await post('/liabilities', l);
}

/* ───────── 4. Mục tiêu ───────── */
const GOALS = [
  { kind: 'emergency', title: 'Quỹ dự phòng', targetAmount: 120 * M, currentAmount: 84 * M, targetMonth: addMonths(thisMonth, 6), monthlyContribution: 4 * M, priority: 1 },
  { kind: 'education', title: 'Học tập MBA', targetAmount: 150 * M, currentAmount: 40 * M, targetMonth: addMonths(thisMonth, 48), monthlyContribution: 2 * M, priority: 2 },
  { kind: 'custom', title: 'Du lịch Nhật Bản', targetAmount: 60 * M, currentAmount: 16 * M, targetMonth: addMonths(thisMonth, 30), monthlyContribution: 1_500 * K, priority: 3 },
  { kind: 'custom', title: 'Mua xe ô tô', targetAmount: 600 * M, currentAmount: 120 * M, targetMonth: addMonths(thisMonth, 96), monthlyContribution: 2 * M, priority: 3 },
];

async function goals() {
  for (const g of (await get('/goals/summary')).goals) await del(`/goals/${g.id}`);
  for (const g of GOALS) await post('/goals', g);
}

/* ───────── 5. Sổ thu chi 6 tháng ───────── */
// Thu: lương 22 triệu + làm thêm + lãi đầu tư. Chi tháng này 21 triệu theo cơ cấu mockup trang 2.
const MONTHS = [
  { d: -5, freelance: 2_500 * K, invest: 1_500 * K, expense: 21_500 * K },
  { d: -4, freelance: 0, invest: 2 * M, expense: 24_500 * K },
  { d: -3, freelance: 0, invest: 0, expense: 23 * M },
  { d: -2, freelance: 3 * M, invest: 2 * M, expense: 18_500 * K },
  { d: -1, freelance: 4 * M, invest: 2 * M, expense: 18_500 * K },
  { d: 0, freelance: 4 * M, invest: 2_500 * K, expense: 21 * M },
];
const SHARES = [
  ['food', 0.35, 'Ăn uống gia đình', 4],
  ['housing', 0.2, 'Tiền nhà & điện nước', 2],
  ['transport', 0.12, 'Xăng xe & gửi xe', 6],
  ['shopping', 0.1, 'Mua sắm đồ dùng', 12],
  ['entertainment', 0.08, 'Xem phim, cà phê cuối tuần', 18],
  ['health', 0.07, 'Bảo hiểm & khám sức khỏe', 22],
  ['other_expense', 0.08, 'Chi khác', 25],
];

function monthTransactions({ d, freelance, invest, expense }) {
  const month = addMonths(thisMonth, d);
  const day = (n) => `${month}-${String(n).padStart(2, '0')}`;
  const list = [{ kind: 'income', amount: 22 * M, category: 'salary', note: 'Lương tháng', occurredOn: day(5) }];
  if (freelance) list.push({ kind: 'income', amount: freelance, category: 'business', note: 'Dự án freelance', occurredOn: day(15) });
  if (invest) list.push({ kind: 'income', amount: invest, category: 'invest_income', note: 'Lãi quỹ & cổ tức', occurredOn: day(20) });
  let left = expense;
  SHARES.forEach(([category, share, note, n], i) => {
    const amount = i === SHARES.length - 1 ? left : Math.round((expense * share) / (10 * K)) * 10 * K;
    left -= amount;
    list.push({ kind: 'expense', amount, category, note, occurredOn: day(n), valueTag: 'essential' });
  });
  if (d === 0) {
    // Tháng này: tách các khoản "không đáng" để AI gợi ý cắt giảm (~1,2 triệu)
    const food = list.find((t) => t.category === 'food');
    food.amount -= 700 * K;
    list.push({ kind: 'expense', amount: 700 * K, category: 'food', note: 'Đồ ăn ngoài, trà sữa', occurredOn: day(9), valueTag: 'regret' });
    const other = list.find((t) => t.category === 'other_expense');
    other.amount -= 500 * K;
    list.push({ kind: 'expense', amount: 500 * K, category: 'other_expense', note: 'Đăng ký app ít dùng', occurredOn: day(11), valueTag: 'regret' });
  }
  // Không ghi giao dịch trong tương lai
  return list.filter((t) => t.occurredOn <= today);
}

async function ledger() {
  for (const m of MONTHS) {
    const month = addMonths(thisMonth, m.d);
    for (const t of (await get(`/transactions?month=${month}`)).items) await del(`/transactions/${t.id}`);
    for (const t of monthTransactions(m)) await post('/transactions', t);
  }
}

/* ───────── 6. Tăng thu nhập, thời gian, kỹ năng ───────── */
async function earn() {
  await put('/earn', { currentIncome: 22 * M, targetIncome: 28_600 * K, targetMonths: 6, occupation: 'Chuyên viên phân tích dữ liệu', hoursPerWeek: 5, focusSkill: 'AI/No-code' });
  await put('/earn/time', {
    allocations: [
      { category: 'sleep', hours: 38 },
      { category: 'work', hours: 55 },
      { category: 'life', hours: 38 },
      { category: 'learning', hours: 2 },
      { category: 'side_income', hours: 3 },
    ],
  });
  for (const a of await get('/earn/activities')) await del(`/earn/activities/${a.id}`);
  const study = await post('/earn/activities', { title: 'Học AI/No-code' });
  const side = await post('/earn/activities', { title: 'Dự án freelance' });
  // 4 tuần gần nhất: kế hoạch 5 giờ/tuần, thực tế 3 · 2 · 3 · 3 giờ
  const actual = [[2, 1], [1, 1], [2, 1], [2, 1]];
  for (let i = 0; i < 4; i++) {
    const day = new Date(Date.parse(`${today}T00:00:00Z`) - (3 - i) * 7 * 86_400_000).toISOString().slice(0, 10);
    await put('/earn/hours', {
      week: isoWeek(day),
      entries: [
        { activityId: study.id, planned: 3, actual: actual[i][0] },
        { activityId: side.id, planned: 2, actual: actual[i][1] },
      ],
    });
  }
}

/* ───────── 7. Lịch AI: cả tuần này + quy tắc tự động + đề xuất AI ───────── */
// [thứ (0 = Thứ Hai), tiêu đề, loại, từ, đến, ghi chú]
const WEEK = [
  [0, 'Thiền buổi sáng', 'rest', '07:30', '08:00', '10 phút hít thở'],
  [0, 'Xem thu chi tuần trước', 'finance', '09:00', '10:00', 'Cùng An Tâm AI'],
  [0, 'Làm việc dự án freelance', 'work', '10:30', '12:00', ''],
  [0, 'Học kỹ năng Marketing', 'skill', '13:00', '14:00', ''],
  [0, 'Họp khách hàng', 'work', '15:00', '17:00', 'Dự án thiết kế website'],
  [0, 'Tập thể dục', 'rest', '20:00', '21:00', ''],
  [1, 'Đóng hóa đơn Internet', 'personal', '08:00', '09:00', ''],
  [1, 'Làm việc dự án thiết kế website', 'work', '10:00', '12:00', ''],
  [1, 'Cập nhật sổ thu chi', 'finance', '14:00', '15:00', ''],
  [1, 'Học tiếng Anh', 'skill', '19:00', '20:30', ''],
  [2, 'Học kỹ năng Data/AI', 'skill', '08:00', '09:00', ''],
  [2, 'Làm việc', 'work', '10:00', '11:00', ''],
  [2, 'Follow-up khách freelance', 'work', '13:30', '15:00', ''],
  [2, 'Lên kế hoạch tuần', 'work', '19:00', '20:00', ''],
  [3, 'Thiền buổi sáng', 'rest', '07:30', '08:00', ''],
  [3, 'Xem dòng tiền', 'finance', '09:00', '10:00', ''],
  [3, 'Học kỹ năng Productivity', 'skill', '11:00', '12:00', ''],
  [3, 'Làm việc dự án freelance', 'work', '14:00', '16:00', ''],
  [3, 'Chạy bộ', 'rest', '19:00', '20:00', ''],
  [4, 'Làm việc', 'work', '10:00', '12:00', ''],
  [4, 'Review mục tiêu', 'finance', '14:00', '15:00', ''],
  [4, 'Học kỹ năng UI/UX', 'skill', '19:30', '21:00', ''],
  [5, 'Thời gian gia đình', 'rest', '09:00', '11:00', ''],
  [5, 'Đọc sách', 'skill', '14:00', '16:00', ''],
  [5, 'Xem phim', 'rest', '20:00', '21:30', ''],
  [6, 'Tổng kết chi tiêu', 'finance', '09:00', '10:00', 'Cùng An Tâm AI'],
  [6, 'Lên kế hoạch tuần mới', 'personal', '10:30', '12:00', ''],
  [6, 'Chuẩn bị tài liệu', 'work', '15:00', '16:30', ''],
  [6, 'Nghỉ ngơi', 'rest', '20:00', '21:00', ''],
];
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));

/** POST có Idempotency-Key (duyệt / từ chối đề xuất). */
async function postIdem(path) {
  const res = await fetch(`${API}/api${path}`, { method: 'POST', headers: { Cookie: cookie, 'Idempotency-Key': `seed-${crypto.randomUUID()}` } });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
}

async function calendar() {
  // Xóa lịch tuần này + tuần sau, bỏ các đề xuất cũ đang chờ
  for (const w of [monday, addDays(monday, 7)]) {
    const week = await get(`/calendar?week=${w}`);
    for (const e of week.events.filter((x) => x.source !== 'google')) await del(`/calendar/events/${e.id}`);
  }
  for (const p of (await get(`/calendar?week=${monday}`)).proposals) await postIdem(`/calendar/proposals/${p.id}/reject`);

  for (const [d, title, category, from, to, note] of WEEK) {
    const day = addDays(monday, d);
    await post('/calendar/events', { title, note, category, startsAt: `${day}T${from}`, endsAt: `${day}T${to}` });
  }
  // Hạn đóng thẻ tín dụng: 3 ngày tới (để AI kịp nhắc trước 2 ngày) — trùng Thứ Sáu tuần này nếu còn kịp
  const friday = addDays(monday, 4);
  const due = friday >= addDays(today, 3) ? friday : addDays(today, 3);
  await post('/calendar/events', { title: 'Đóng phí thẻ tín dụng', note: 'Sao kê tháng này', category: 'personal', startsAt: `${due}T08:00`, endsAt: `${due}T09:00` });

  // 4 quy tắc tự động bật → AI tự xếp lịch (qua engine thật) → 2 đề xuất chờ duyệt
  for (const key of ['weekly_review', 'bill_reminder', 'skill_block', 'freelance_followup']) await put(`/automation-rules/${key}`, { enabled: true });
  await post(`/calendar/auto-schedule?week=${monday}`);
}

/* ───────── 8. Lựa chọn cuộc đời ───────── */
async function lifeChoices() {
  for (const c of await get('/life-choices')) await del(`/life-choices/${c.id}`);
  await post('/life-choices', {
    title: 'Học thạc sĩ Quản trị Kinh doanh (MBA)',
    description: 'Mở rộng cơ hội nghề nghiệp, tăng thu nhập dài hạn.',
    icon: 'graduation-cap',
    cost: 300 * M,
    steps: ['Tìm hiểu', 'Chuẩn bị tài chính', 'Ứng tuyển', 'Bắt đầu học'],
    currentStep: 2,
    pinned: true,
  });
}

/* ───────── Chạy ───────── */
const steps = [
  ['Tài khoản', login],
  ['Thu chi cơ bản', profile],
  ['Tài sản & nợ', assets],
  ['Mục tiêu', goals],
  ['Sổ thu chi 6 tháng', ledger],
  ['Thu nhập, thời gian, kỹ năng', earn],
  ['Lịch AI cả tuần', calendar],
  ['Lựa chọn cuộc đời', lifeChoices],
  ['Hiện lại đề xuất đã ẩn', () => del('/overview/suggestions/dismissals')],
];

try {
  for (const [name, fn] of steps) {
    process.stdout.write(`• ${name}… `);
    await fn();
    console.log('xong');
  }
  const o = await get('/overview');
  console.log(
    `\nĐiểm An Tâm ${o.peace.score} (${o.peaceDelta >= 0 ? '+' : ''}${o.peaceDelta ?? '—'}) · an toàn ${o.safeMonths.months} tháng · dòng tiền ${o.cashflow6m.net.toLocaleString('vi-VN')}đ` +
      ` · tiết kiệm ${Math.round((o.savingsRateVsPeers.rate ?? 0) * 100)}% · tài sản ròng ${o.netWorthBreakdown.net.toLocaleString('vi-VN')}đ · ${o.todayEvents.length} việc hôm nay`,
  );
} catch (e) {
  console.error(`\nLỗi: ${e.message}`);
  process.exit(1);
}
