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
  if (freelance) list.push({ kind: 'income', amount: freelance, category: 'freelance', note: 'Dự án freelance', occurredOn: day(15) });
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
  await put('/earn', { currentIncome: 22 * M, targetIncome: 28_600 * K, targetMonths: 6, occupation: 'Chuyên viên phân tích dữ liệu', hoursPerWeek: 5, focusSkill: 'AI/No-code', sector: 'technology', iscoCode: '2511' });
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

/* ───────── 9. Kỹ năng đang học + kế hoạch học 7 ngày (trang Tăng thu nhập) ───────── */
const SKILLS = [
  { name: 'Phân tích dữ liệu', tag: 'data', stage: 'foundation', monthsMin: 1, monthsMax: 3, hoursPerWeek: 4, progress: 60 },
  { name: 'Tự động hóa với AI', tag: 'ai_automation', stage: 'practice', monthsMin: 2, monthsMax: 4, hoursPerWeek: 3, progress: 30 },
  { name: 'Thiết kế website No-code', tag: 'nocode', stage: 'portfolio', monthsMin: 1, monthsMax: 2, hoursPerWeek: 2, progress: 20 },
];
// Hôm qua → 5 ngày tới (hôm nay dùng buổi "Học kỹ năng AI" của lịch hôm nay). [độ lệch ngày, tên buổi, kỹ năng, giờ bắt đầu, số giờ]
const SESSIONS = [
  [-1, 'Excel nâng cao', 'Phân tích dữ liệu', '20:00', 2],
  [1, 'Thực hành Power BI', 'Phân tích dữ liệu', '20:00', 2],
  [2, 'AI tự động hóa công việc', 'Tự động hóa với AI', '20:00', 2],
  [3, 'Xây dựng portfolio', 'Thiết kế website No-code', '20:00', 1.5],
  [4, 'Dự án thực tế', 'Tự động hóa với AI', '09:00', 2],
  [5, 'Tổng kết & đánh giá', 'Phân tích dữ liệu', '10:00', 1],
];

async function skills() {
  for (const s of await get('/skills')) await del(`/skills/${s.id}`);
  for (const s of SKILLS) await post('/skills', s);
  const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  for (const [d, title, skill, from, hours] of SESSIONS) {
    const day = new Date(Date.parse(`${today}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
    for (const e of await get(`/calendar/events?date=${day}`)) if (e.category === 'skill') await del(`/calendar/events/${e.id}`);
    const [h, m] = from.split(':').map(Number);
    const { id } = await post('/calendar/events', { title, note: skill, category: 'skill', startsAt: `${day}T${from}`, endsAt: `${day}T${hhmm(h * 60 + m + hours * 60)}` });
    if (d < 0) await patch(`/calendar/events/${id}`, { done: true });
  }
}

/* ───────── Chạy ───────── */
const steps = [
  ['Tài khoản', login],
  ['Thu chi cơ bản', profile],
  ['Tài sản & nợ', assets],
  ['Mục tiêu', goals],
  ['Sổ thu chi 6 tháng', ledger],
  ['Thu nhập, thời gian, kỹ năng', earn],
  ['Lịch hôm nay', calendar],
  ['Lựa chọn cuộc đời', lifeChoices],
  ['Kỹ năng & kế hoạch học', skills],
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
