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
  { d: -3, freelance: 2_600 * K, invest: 0, expense: 21_980 * K },
  { d: -2, freelance: 3 * M, invest: 2 * M, expense: 18_500 * K },
  { d: -1, freelance: 1_400 * K, invest: 2 * M, expense: 19_520 * K },
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

// Tháng này (mockup trang 2): chi 21 triệu = Ăn uống 35% · Nhà ở 20% · Di chuyển 12% · Mua sắm 10% · Giải trí 8% · Y tế 7% · Khác 8%.
// Hóa đơn định kỳ (điện, internet, Netflix, Spotify, bảo hiểm) được ghi ở bước "Hóa đơn" qua "Đánh dấu đã trả".
function currentMonthTransactions() {
  const dom = Number(today.slice(8, 10));
  const day = (n) => `${thisMonth}-${String(Math.max(1, Math.min(n, dom))).padStart(2, '0')}`;
  const ago = (k) => day(dom - k);
  const e = (amount, category, note, occurredOn, valueTag = 'essential') => ({ kind: 'expense', amount, category, note, occurredOn, valueTag });
  return [
    { kind: 'income', amount: 22 * M, category: 'salary', note: 'Lương – Công ty TNHH ABC', occurredOn: day(5) },
    { kind: 'income', amount: 2_500 * K, category: 'invest_income', note: 'Lãi quỹ & cổ tức', occurredOn: day(20) },
    { kind: 'income', amount: 4 * M, category: 'business', note: 'Dự án freelance', occurredOn: ago(1) },
    e(4_280 * K, 'food', 'Đi chợ & siêu thị', day(3)),
    e(600 * K, 'food', 'Cà phê, trà sữa', day(8), 'regret'),
    e(600 * K, 'food', 'Cà phê, trà sữa', day(19), 'regret'),
    e(600 * K, 'food', 'Đặt món qua ứng dụng', day(10), 'regret'),
    e(600 * K, 'food', 'Đặt món qua ứng dụng', day(17), 'regret'),
    e(600 * K, 'food', 'Đặt món qua ứng dụng', day(21), 'regret'),
    e(70 * K, 'food', 'Phở Bát Đàn', ago(0), 'useful'),
    e(3_160 * K, 'housing', 'Tiền nhà', day(1)),
    e(2_400 * K, 'transport', 'Xăng xe & gửi xe', day(6)),
    e(120 * K, 'transport', 'Grab', ago(3), 'useful'),
    e(1_650 * K, 'shopping', 'Mua sắm đồ dùng', day(4), 'useful'),
    e(450 * K, 'shopping', 'Shopee', ago(2), 'useful'),
    e(1_441 * K, 'entertainment', 'Xem phim & đi chơi cuối tuần', day(13), 'joy'),
    e(1_120 * K, 'health', 'Khám sức khỏe & thuốc', day(16)),
    e(1_180 * K, 'other_expense', 'Chi khác', day(18)),
    e(500 * K, 'other_expense', 'Đăng ký app ít dùng', day(14), 'regret'),
  ];
}

function monthTransactions({ d, freelance, invest, expense }) {
  if (d === 0) return currentMonthTransactions();
  const month = addMonths(thisMonth, d);
  const day = (n) => `${month}-${String(n).padStart(2, '0')}`;
  const list = [{ kind: 'income', amount: 22 * M, category: 'salary', note: 'Lương – Công ty TNHH ABC', occurredOn: day(5) }];
  if (freelance) list.push({ kind: 'income', amount: freelance, category: 'business', note: 'Dự án freelance', occurredOn: day(15) });
  if (invest) list.push({ kind: 'income', amount: invest, category: 'invest_income', note: 'Lãi quỹ & cổ tức', occurredOn: day(20) });
  let left = expense;
  SHARES.forEach(([category, share, note, n], i) => {
    const amount = i === SHARES.length - 1 ? left : Math.round((expense * share) / (10 * K)) * 10 * K;
    left -= amount;
    list.push({ kind: 'expense', amount, category, note, occurredOn: day(n), valueTag: 'essential' });
  });
  return list;
}

async function ledger() {
  for (const m of MONTHS) {
    const month = addMonths(thisMonth, m.d);
    for (const t of (await get(`/transactions?month=${month}`)).items) await del(`/transactions/${t.id}`);
    for (const t of monthTransactions(m)) await post('/transactions', t);
  }
}

/* ───────── 5b. Ngân sách & hóa đơn định kỳ ───────── */
const BILLS = [
  { name: 'Tiền điện', amount: 820 * K, category: 'housing', dayOfMonth: 10, autoRenew: false, icon: 'zap' },
  { name: 'Tiền internet', amount: 220 * K, category: 'housing', dayOfMonth: 15, autoRenew: false, icon: 'wifi' },
  { name: 'Netflix', amount: 180 * K, category: 'entertainment', dayOfMonth: 20, autoRenew: true, icon: 'tv' },
  { name: 'Spotify', amount: 59 * K, category: 'entertainment', dayOfMonth: 22, autoRenew: true, icon: 'music' },
  { name: 'Bảo hiểm sức khỏe', amount: 350 * K, category: 'health', dayOfMonth: 25, autoRenew: true, icon: 'shield' },
];

async function billsAndBudget() {
  // Ngân sách chi tháng này 31 triệu (đã chi 21 triệu ≈ 68%, còn 10 triệu)
  await put(`/budgets/${thisMonth}`, { limit: 31 * M });
  for (const b of await get('/bills')) await del(`/bills/${b.id}`);
  const dom = Number(today.slice(8, 10));
  for (const b of BILLS) {
    const { id } = await post('/bills', b);
    // Tháng này đã trả hết (bảo hiểm trả sớm trước hạn)
    const paidDay = Math.min(b.name === 'Bảo hiểm sức khỏe' ? dom - 4 : b.dayOfMonth, dom);
    if (paidDay >= 1) await post(`/bills/${id}/paid`, { occurredOn: `${thisMonth}-${String(paidDay).padStart(2, '0')}` });
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

/* ───────── 7. Lịch hôm nay ───────── */
const EVENTS = [
  { title: 'Xem lại chi tiêu tuần qua', note: 'Cùng An Tâm AI', category: 'finance', from: '08:00', to: '08:30' },
  { title: 'Học kỹ năng AI (45 phút)', note: 'Khóa học GenAI cho công việc', category: 'skill', from: '09:00', to: '09:45' },
  { title: 'Gọi lại khách freelance', note: 'Trao đổi dự án thiết kế website', category: 'work', from: '14:00', to: '14:30' },
  { title: 'Cập nhật mục tiêu tiết kiệm', note: 'Rà soát tiến độ cùng AI', category: 'personal', from: '20:00', to: '20:30' },
];

async function calendar() {
  for (const e of await get(`/calendar/events?date=${today}`)) await del(`/calendar/events/${e.id}`);
  for (const e of EVENTS) await post('/calendar/events', { title: e.title, note: e.note, category: e.category, startsAt: `${today}T${e.from}`, endsAt: `${today}T${e.to}` });
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
  ['Ngân sách & hóa đơn', billsAndBudget],
  ['Thu nhập, thời gian, kỹ năng', earn],
  ['Lịch hôm nay', calendar],
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
  const l = await get('/ledger/dashboard');
  console.log(
    `\nĐiểm An Tâm ${o.peace.score} (${o.peaceDelta >= 0 ? '+' : ''}${o.peaceDelta ?? '—'}) · an toàn ${o.safeMonths.months} tháng · dòng tiền ${o.cashflow6m.net.toLocaleString('vi-VN')}đ` +
      ` · tiết kiệm ${Math.round((o.savingsRateVsPeers.rate ?? 0) * 100)}% · tài sản ròng ${o.netWorthBreakdown.net.toLocaleString('vi-VN')}đ · ${o.todayEvents.length} việc hôm nay` +
      `
Sổ thu chi: thu ${l.totals.income.toLocaleString('vi-VN')}đ · chi ${l.totals.expense.toLocaleString('vi-VN')}đ · ngân sách ${Math.round((l.budget.pct ?? 0) * 100)}% · ${l.categories.map((c) => `${c.key} ${Math.round(c.pct * 100)}%`).join(' ')} · tiết kiệm được ${l.advice.saving?.monthly ?? 0}`,
  );
} catch (e) {
  console.error(`\nLỗi: ${e.message}`);
  process.exit(1);
}
