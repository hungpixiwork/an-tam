Bạn đang tiếp tục phát triển codebase An Tâm AI SAU khi audit và fix Phase 1–3.

Không làm lại từ đầu.

Hiện tại codebase đã có nhiều flow ở mức 4–5/5 và đã có:

- Peace Score
- Sổ thu chi
- Mục tiêu cuộc sống
- Onboarding
- Mô phỏng rủi ro
- Danh mục đầu tư
- Behavioral finance
- Kế hoạch an toàn
- Alert engine
- Community
- Auth / Settings
- Daily use loop
- Narrator / explainable templates
- Privacy claims đã được chỉnh sát implementation

Test hiện tại:
32/32 tests pass
Build pass

Nhiệm vụ của bạn là:

HOÀN THIỆN PHẦN CÒN THIẾU
+
NÂNG TOÀN BỘ CORE PRODUCT LÊN MỨC 5/5
+
KHÔNG TẠO FEATURE RÁC
+
KHÔNG LÀM APP PHÌNH TO
+
KHÔNG PHÁ KIẾN TRÚC HIỆN TẠI.

Mục tiêu cuối cùng:

An Tâm AI phải có một product story hoàn chỉnh:

TIME
→ CAPABILITY
→ INCOME
→ CASH FLOW
→ SAVINGS
→ SAFETY
→ INVESTMENT
→ LIFE OPTIONS.

==================================================
0. NGUYÊN TẮC THỰC THI
==================================================

Trước khi code:

1. Đọc:
   - walkthrough hiện tại
   - audit docs
   - PRODUCT_IMPLEMENTATION_LOG
   - route tree
   - state/data models
   - tests
   - components
   - engine
   - current user journeys

2. Không tin hoàn toàn các kết luận cũ.

Phải verify code thực tế.

Ví dụ:

Nếu báo cáo nói:
“Không gọi LLM ngoài”

thì phải search toàn codebase để xác nhận.

Nếu report nói:
“Privacy local-first”

thì phải kiểm tra dữ liệu thật sự đi đâu.

Không được biến assumption thành claim.

3. Không thêm thuật ngữ tài chính hoặc AI chỉ để nghe có vẻ advanced.

4. Mọi feature mới phải trả lời được:

“Người dùng sẽ làm gì khác đi sau khi dùng nó?”

Nếu không trả lời được:
KHÔNG BUILD.

==================================================
1. DEFINITION OF 5/5
==================================================

Một tính năng chỉ được chấm 5/5 nếu thỏa TẤT CẢ:

A. USER NEED

Có một nhu cầu người dùng cụ thể.

B. ENTRY POINT

Người dùng biết tại sao cần vào màn hình này.

C. INPUT

Nhập liệu đơn giản, có default/chip/preset khi phù hợp.

D. COMPUTATION

Logic chính xác, deterministic khi có thể.

E. OUTPUT

Kết quả nói bằng ngôn ngữ đời thường.

F. WHY

Người dùng hiểu tại sao hệ thống đưa ra kết quả đó.

G. ACTION

Có bước tiếp theo rõ ràng.

H. STATE

Có:

- loading
- empty
- error
- success
- edge case

I. PERSISTENCE

Dữ liệu không mất vô lý sau reload nếu flow cần persistence.

J. MOBILE

320px vẫn usable.

K. ACCESSIBILITY

Không dựa hoàn toàn vào màu sắc.

L. TRUST

Không claim quá khả năng code.

M. TEST

Có test cho core logic.

N. JOURNEY

Có thể chạy end-to-end.

O. PRODUCT THESIS

Feature phải liên kết được với:

AN TÂM TÀI CHÍNH.

Thiếu bất kỳ mục quan trọng nào:
không được tự đánh 5/5.

==================================================
2. P0 — BUILD “EARN” LAYER
==================================================

Đây là lỗ hổng lớn nhất.

Hiện An Tâm AI quản lý tiền đã kiếm được tương đối tốt.

Nhưng với người trẻ, tài sản tài chính quan trọng nhất thường chưa phải portfolio.

Mà là:

HUMAN CAPITAL.

An Tâm AI cần có một layer:

“Năng lực tạo thu nhập”.

KHÔNG biến nó thành:

- job board;
- LinkedIn clone;
- course marketplace;
- Pomodoro app;
- productivity tracker.

Chỉ build những gì cần để nối:

TIME
→ SKILL
→ EARNING CAPACITY
→ FINANCIAL GOAL.

---------------------------------
2.1 NEW CORE FEATURE:
INCOME GROWTH PLAN
---------------------------------

Người dùng trả lời tối đa khoảng:

1. Thu nhập hiện tại
2. Nghề/công việc hiện tại
3. Mục tiêu thu nhập
4. Khoảng thời gian mục tiêu
5. Số giờ/tuần có thể đầu tư cho phát triển bản thân
6. Skill đang muốn phát triển

Không cần onboarding dài.

Output phải kiểu:

“Mục tiêu của bạn:
từ ¥7.000 → ¥10.000/tháng trong 12 tháng.”

“Bạn có khoảng 5 giờ/tuần.”

“Trong 12 tháng = khoảng 260 giờ.”

“Thay vì chia quá nhiều việc, hiện tại nên tập trung:
[Skill X]
[Portfolio proof]
[Job/application milestone]”

Không được hứa:

“học X sẽ tăng lương 50%”.

Phải phân biệt:

FACT
ESTIMATE
USER GOAL.

---------------------------------
2.2 TIME ALLOCATION
---------------------------------

Tạo một UX đơn giản để người dùng phân chia quỹ thời gian mỗi tuần.

Ví dụ:

168 giờ / tuần

Sleep
Work / school
Life
Learning
Side income
Unallocated.

Không cần tracking từng phút.

Mục tiêu là giúp user nhìn:

“Bạn nói mục tiêu tăng thu nhập quan trọng,
nhưng tuần này chỉ dành 1 giờ cho nó.”

Đây là reflection, không phải guilt.

Copy phải trung tính.

KHÔNG:

“Bạn đang lãng phí thời gian.”

Ưu tiên:

“Mục tiêu này hiện chưa nhận được nhiều thời gian.”

---------------------------------
2.3 VALUE HOURS
---------------------------------

Cho phép user tạo tối đa 3:

“Việc có giá trị cao”.

Ví dụ:

- học coding;
- làm portfolio;
- luyện ngoại ngữ;
- freelance;
- chuẩn bị certification;
- phát triển sản phẩm.

Mỗi tuần:

planned hours
vs
actual hours.

Sau completion:

không biến thành XP game.

Hiển thị:

“Tuần này bạn đầu tư 6 giờ vào khả năng tăng thu nhập.”

---------------------------------
2.4 FINANCIAL CONNECTION
---------------------------------

Đây là phần quan trọng nhất.

Income module KHÔNG được tách khỏi finance.

Ví dụ:

Current income:
¥8,000

Potential target:
¥10,000

Savings rate:
20%

Nếu đạt mục tiêu:

additional monthly income:
¥2,000

Nếu giữ savings rate:

additional potential saving:
¥400/month

Goal:

Emergency Fund

Projected acceleration:
X months.

Nhưng:

phải ghi rõ đây là SCENARIO,
không phải prediction.

Copy:

“Nếu thu nhập tăng lên mức bạn đặt mục tiêu và tỷ lệ tiết kiệm giữ nguyên…”

Không viết:

“AI dự đoán bạn sẽ…”

==================================================
3. P0 — HOÀN THIỆN “LIVE”
==================================================

App hiện có thể đang nhìn chi tiêu quá nhiều theo góc:

“giảm càng nhiều càng tốt”.

Điều đó sai với thesis.

An Tâm AI không tối ưu:

MINIMUM SPENDING.

Mà tối ưu:

INTENTIONAL SPENDING.

Thêm một concept nhẹ:

VALUE OF SPENDING.

Khi ghi giao dịch, user có thể OPTIONAL tag:

Essential
Useful
Joy
Growth
Regret / Low value.

Không ép tag mọi giao dịch.

Sau một khoảng dữ liệu:

An Tâm AI có thể nói:

“Bạn chi ¥1.200 cho ăn uống tháng này.

¥700 là sinh hoạt.
¥300 là gặp bạn bè.
¥200 bạn tự đánh dấu là không đáng.”

Insight phải là:

“Khoản dễ tối ưu nhất có thể là ¥200.”

Không nói:

“Bạn nên cắt ¥500 tiền ăn.”

---------------------------------
3.1 MONEY ≠ ONLY SAVING
---------------------------------

Thêm insight:

“Khoản chi đem lại giá trị”

Ví dụ:

Learning
Health
Family
Experience.

Goal:

người dùng cảm thấy tài chính là:

quản lý tài nguyên cho cuộc sống,

không phải:

bị app kiểm soát.

==================================================
4. P0 — ONBOARDING THEO LIFE STAGE
==================================================

Hiện có persona selector.

Nâng thành 4 entry paths nhưng reuse flow hiện có.

STARTING

“Tôi mới bắt đầu quản lý tài chính”

BUILDING

“Tôi muốn tiết kiệm và tăng thu nhập”

PREPARING

“Tôi đang chuẩn bị cho một mục tiêu lớn”

INVESTING

“Tôi đã có tài sản và muốn quản lý tốt hơn”

Sau chọn:

chỉ thay:

- home priority
- suggested first action
- empty state
- default guidance.

KHÔNG tạo 4 app khác nhau.

==================================================
5. P0 — HOME PHẢI TRỞ THÀNH DECISION HOME
==================================================

Audit lại homepage.

Không để home trở thành dashboard chứa 15 card.

Home phải ưu tiên 3 câu hỏi:

1. Tôi đang thế nào?
2. Điều gì đáng chú ý nhất?
3. Tôi nên làm gì tiếp?

Structure đề xuất:

---------------------------------

Greeting

“Chào buổi sáng, …”

Peace Score
+
1 sentence explanation.

“72 — nhìn chung ổn, nhưng quỹ dự phòng đang thấp.”

---------------------------------

TODAY / THIS WEEK

Một action quan trọng nhất.

Ví dụ:

“Hoàn thành thêm ¥1.200 để đạt quỹ dự phòng 3 tháng.”

hoặc:

“Bạn đặt mục tiêu tăng thu nhập nhưng chưa dành thời gian học tuần này.”

---------------------------------

YOUR MONEY

Cashflow summary.

---------------------------------

YOUR FUTURE

Goal progress / scenario.

---------------------------------

OPTIONAL DEEP DIVE

Investments
Behavior
Community.

Không hiển thị tất cả cùng priority.

==================================================
6. P0 — NEXT BEST ACTION ENGINE
==================================================

Hiện đã có tips.

Nâng thành một lightweight deterministic engine:

NEXT BEST ACTION.

Không cần LLM.

Input:

- emergency fund
- negative cashflow
- savings trend
- high-interest debt nếu model có
- overdue goal
- income growth goal
- portfolio concentration
- behavioral mismatch
- inactivity.

Engine chỉ chọn:

1 PRIMARY ACTION.

Có thể có 2 secondary.

Example priority:

1. negative cashflow
2. insufficient emergency reserve
3. debt issue
4. urgent goal gap
5. income growth commitment
6. portfolio risk
7. optimization.

Phải tránh:

“10 recommendation cùng lúc.”

An Tâm = clarity.

==================================================
7. P0 — INTERNATIONALIZATION
==================================================

Competition ở Shenzhen.

Không hardcode Vietnamese assumptions.

Refactor minimally để support:

VI
EN
ZH-CN.

Không nhất thiết translate 100% low-level dev content.

Nhưng toàn bộ competition demo flow phải hoàn chỉnh.

---------------------------------
7.1 I18N
---------------------------------

Centralize UI strings.

Không để scattered hardcoded string ở JSX/TSX nếu thuộc core screens.

Support:

vi
en
zh-CN.

---------------------------------
7.2 CURRENCY
---------------------------------

Không hardcode “₫”.

Tạo currency preference.

Minimum:

CNY
VND
USD.

Use Intl.NumberFormat.

Không convert FX nếu chưa có reliable rate engine.

Currency selection chỉ là:

display / user-entered currency context.

Không giả định CNY ↔ VND.

---------------------------------
7.3 DATE
---------------------------------

Intl.DateTimeFormat.

---------------------------------
7.4 CHINESE LAYOUT
---------------------------------

Test:

320
360
390
430 width.

Check:

- Chinese wrapping
- CTA
- chips
- cards
- chart labels
- dialogs
- onboarding
- settings.

==================================================
8. P1 — NOTIFICATION / RETURN LOOP
==================================================

Hiện có in-app alerts.

Đừng vội build native push infrastructure nếu app không cần.

Trước tiên hoàn thiện:

NOTIFICATION CENTER.

Mỗi alert cần:

TYPE
WHY
ACTION
SEVERITY
DATE
READ STATE.

Ví dụ:

Không:

“Budget warning”

Mà:

“Ăn ngoài đang cao hơn kế hoạch ¥320.”

Action:

“Xem chi tiết”

hoặc:

“Điều chỉnh ngân sách”.

Alert phải actionable.

---------------------------------
8.1 DIGEST
---------------------------------

Tạo weekly financial check-in:

5 phút.

Ví dụ:

“Tuần này của bạn”

Money in
Money out
Saved
Goal progress
Value hours
One thing to notice
One next action.

Đây có thể trở thành return loop mạnh nhất.

==================================================
9. P1 — PEACE SCORE NÂNG LÊN 5/5
==================================================

Peace Score hiện được đánh 5/5.

Nhưng verify lại.

Người dùng phải có thể click:

“Vì sao 72?”

Hiển thị từng component.

Ví dụ:

Cashflow
18/20

Safety
14/30

Goals
22/30

Risk
18/20.

Sau đó:

“Làm gì tăng điểm?”

Nhưng không gamify quá mức.

Không cho user chase score.

Copy:

“Điểm chỉ là cách tóm tắt tình hình, không phải mục tiêu tài chính của bạn.”

Excellent trust copy.

==================================================
10. P1 — SCENARIO ENGINE NÂNG LÊN 5/5
==================================================

Hiện 4.5/5.

Tìm chính xác thiếu 0.5 ở đâu.

Thường các vấn đề:

- quá nhiều sliders;
- user không hiểu scenario;
- output chỉ là chart;
- không có actionable recovery.

Flow phải là:

WHAT IF

“Nếu thu nhập giảm 30% trong 6 tháng?”

↓

WHAT CHANGES

Emergency fund
Goal date
Investment runway

↓

CAN I HANDLE IT?

Yes / Tight / Risk.

↓

WHAT CAN I DO?

2–3 recovery actions.

---------------------------------

Presets:

Lose job
Income cut
Large expense
Market decline
Interest rate change.

Không đưa user vào financial jargon.

==================================================
11. P1 — PORTFOLIO NÂNG 4.5 → 5
==================================================

Không cần thêm quant model.

Tập trung UX.

Portfolio screen phải trả lời:

1. Tôi đang sở hữu gì?
2. Tôi đang phụ thuộc quá nhiều vào đâu không?
3. Có gì lệch khỏi kế hoạch?
4. Tôi có cần làm gì không?

Không highlight daily performance quá mạnh.

Không kích thích trading.

Nếu rebalance:

Hiển thị:

CURRENT
TARGET
DIFFERENCE
WHY.

Không tự động giao dịch nếu hệ thống không thật sự kết nối broker.

Nếu chưa có execution:

copy phải là:

“Gợi ý cân bằng”

không phải:

“Automatic Rebalancing”.

==================================================
12. P1 — BEHAVIORAL FINANCE NÂNG 4 → 5
==================================================

Hiện có:

self score vs actual behavior.

Nâng UX để người dùng hiểu:

“Bạn nghĩ mình chấp nhận rủi ro 8/10.

Nhưng trong kịch bản giảm 20%, lựa chọn của bạn tương ứng khoảng 5/10.”

Không gọi user:

irrational
biased
wrong.

Say:

“Khả năng chịu biến động thực tế có thể thấp hơn bạn nghĩ.”

Sau đó:

“So với mục tiêu hiện tại, danh mục có thể cần ít rủi ro hơn.”

Actionable.

==================================================
13. P1 — SAFETY PLAN NÂNG 4 → 5
==================================================

Safety Plan phải bao gồm:

Emergency reserve.

Minimum monthly cost.

Months protected.

Target reserve.

Gap.

Contribution plan.

Scenario:

“If income stops today”.

Copy ví dụ:

“Với mức chi thiết yếu hiện tại, bạn có khoảng 2.7 tháng dự phòng.”

“Nếu thêm ¥600/tháng, bạn có thể đạt mốc 6 tháng trong khoảng X tháng.”

Không tạo nỗi sợ.

==================================================
14. P1 — COMMUNITY NÂNG 4 → 5
==================================================

Không biến community thành feed.

Nếu hiện tại chỉ có learning content:

giữ learning library.

Rename nếu “Community” misleading.

Content recommendations theo:

- life stage;
- Peace Score weakness;
- current goal.

Example:

Safety thấp:

“3 phút: Quỹ dự phòng nên dùng khi nào?”

Investment beginner:

“ETF khác cổ phiếu riêng lẻ như thế nào?”

Không recommend generic article feed.

==================================================
15. P1 — TRUST CENTER
==================================================

Tạo một màn hình hoặc section:

“Dữ liệu của bạn”.

Hiển thị rõ:

Stored on device:
[...]

Stored on server:
[...]

Used for calculations:
[...]

Sent to external AI:
[...]

Nếu none:
ghi none.

Nhưng phải dựa trên CODE THỰC TẾ.

Buttons:

Export data
Delete data.

Nếu đã có thì polish.

==================================================
16. P1 — AI ROLE TRANSPARENCY
==================================================

Nếu sản phẩm dùng template narrator / deterministic engine:

UI copy phải phản ánh đúng.

Không overclaim:

“AI predicts your future.”

Ưu tiên:

“An Tâm phân tích kế hoạch của bạn dựa trên dữ liệu bạn cung cấp.”

Nếu có AI/LLM thật:

label rõ phần nào là AI-generated.

Nếu không:

đừng gọi tất cả mọi thứ “AI”.

Brand có thể là An Tâm AI nhưng product trust quan trọng hơn.

==================================================
17. P2 — EMPTY STATES
==================================================

Audit toàn bộ.

Không có màn hình trắng.

Ví dụ Portfolio empty:

Không:

“No assets.”

Mà:

“Bạn chưa cần có khoản đầu tư để dùng An Tâm.

Trước tiên hãy kiểm tra vùng an toàn tài chính của bạn.”

CTA:

“Kiểm tra”

Goal empty:

“Bạn muốn tiền giúp mình đạt điều gì?”

CTA:

“Tạo mục tiêu đầu tiên”.

==================================================
18. P2 — ERROR STATES
==================================================

Không hiện raw API error.

Human copy:

“Chưa lưu được giao dịch.”

Actions:

Try again
Keep draft.

Persistence quan trọng.

==================================================
19. P2 — MICROCOPY
==================================================

Scan toàn bộ UI.

Remove unnecessary:

- jargon
- English mixing
- technical phrasing
- AI marketing
- overly long paragraphs.

Target:

grade-school clarity.

Một card:

1 headline
1 key number
1 interpretation
1 action.

==================================================
20. P2 — VISUAL HIERARCHY
==================================================

Không redesign.

Polish:

spacing
typography
button hierarchy
card density
mobile stacking
chart legends
empty state.

Không thêm gradient/glass/animation vô nghĩa.

Product phải:

CALM
CLEAR
TRUSTWORTHY.

==================================================
21. FIVE END-TO-END JOURNEYS
==================================================

Phải implement/test ít nhất:

---------------------------------
JOURNEY A — 21 YEAR OLD
---------------------------------

No investments.

Onboard “Starting”.

Enter income + expenses.

Peace Score.

Create emergency goal.

Create income growth goal.

Allocate 5 value hours/week.

See:

“If your target income is achieved…”

Must work without portfolio.

---------------------------------
JOURNEY B — 25 YEAR OLD
---------------------------------

Income stable.

Tracks spending.

Marks low-value spending.

Creates saving goal.

Receives Next Best Action.

Weekly check-in.

---------------------------------
JOURNEY C — 29 YEAR OLD
---------------------------------

Goal:
home deposit.

See projected completion.

Run:

large expense scenario.

See delay.

See recovery plan.

---------------------------------
JOURNEY D — 35 YEAR OLD
---------------------------------

Has portfolio.

Safety reserve.

Run job-loss + market-drop scenario.

See whether plan survives.

See rebalance suggestion.

---------------------------------
JOURNEY E — BUSY PROFESSIONAL
---------------------------------

Minimal input.

Portfolio + cashflow.

One weekly digest.

One next action.

No need to study charts.

==================================================
22. COMPETITION DEMO MODE
==================================================

Không tạo fake feature.

Nhưng có thể tạo seeded demo personas.

Add:

Demo Starting
Demo Builder
Demo Family
Demo Investor.

Seed realistic Chinese-context data.

Currency:
CNY.

Names generic.

Do NOT fake:

bank connection
real trade execution
live market prediction

unless implemented.

Demo data must be clearly demo data.

==================================================
23. SHENZHEN DEMO COPY
==================================================

Homepage Chinese thesis should communicate approximately:

“安心，不只是赚得更多。

而是知道钱去了哪里，
为意外做好准备，
把时间投入到真正有价值的事情，
一步一步增加收入、储蓄和选择生活的自由。”

English equivalent:

“Financial peace is not just about earning more.

It is knowing where your money goes, preparing for uncertainty, investing your time in what creates value, and gradually building income, savings and freedom of choice.”

Do not mechanically translate if better native copy exists.

==================================================
24. USP HIERARCHY
==================================================

After implementation, An Tâm AI's competitive story should be:

USP 1

FINANCIAL PEACE SYSTEM

Not wealth maximization.

---------------------------------

USP 2

FROM HUMAN CAPITAL TO FINANCIAL CAPITAL

TIME
→ SKILLS
→ INCOME
→ SAVINGS
→ ASSETS.

Most finance apps start only at money.

---------------------------------

USP 3

FUTURE-FIRST

Not only:

“What happened?”

But:

“What happens if…?”

---------------------------------

USP 4

ACTIONABLE

Every major insight → one next action.

---------------------------------

USP 5

EXPLAINABLE

Numbers calculated by deterministic logic where possible.

Narration explains them.

---------------------------------

USP 6

PRIVATE / TRUSTWORTHY

Claims exactly match architecture.

==================================================
25. DO NOT BUILD
==================================================

Do NOT waste time building:

- stock market news feed;
- candlestick charts;
- trading signals;
- social feed;
- token;
- blockchain;
- voice assistant;
- AI avatar;
- chatbot as home screen;
- 100 financial ratios;
- brokerage execution;
- bank integrations if unavailable;
- giant career recommendation engine;
- job crawler;
- full calendar;
- Pomodoro clone.

These dilute the thesis.

==================================================
26. IMPLEMENTATION ORDER
==================================================

Execute in this order:

P0.1
EARN data model + engine.

P0.2
Income Growth Plan UI.

P0.3
Value Hours.

P0.4
Connect EARN to financial goals.

P0.5
Intentional Spending tags.

P0.6
Next Best Action engine.

P0.7
Home prioritization.

P0.8
i18n VI/EN/ZH-CN.

P0.9
currency/date abstraction.

Then:

P1:
upgrade all 4/4.5 features.

Then:

P2:
polish.

==================================================
27. SUBAGENT STRATEGY
==================================================

Use parallel subagents where safe.

Suggested split:

SA1 — EARN engine/data model

SA2 — EARN UI

SA3 — intentional spending + LIVE

SA4 — Next Best Action + Home

SA5 — i18n/currency/date

SA6 — scenario + safety

SA7 — portfolio + behavioral

SA8 — alerts + digest + learning

SA9 — trust/privacy + empty/error states

SA10 — E2E QA + competition demo.

BUT:

Shared foundational files must not be edited concurrently without coordination.

Before spawning:
identify overlapping files.

==================================================
28. REQUIRED TESTS
==================================================

Add tests for at least:

Income growth scenario.

No false income prediction.

Value hours.

Financial goal acceleration scenario.

Next Best Action priority.

Intentional spending aggregation.

Peace Score regression.

Safety months.

Scenario recovery.

Portfolio concentration.

Behavior mismatch.

Currency formatting.

i18n fallback.

Chinese rendering strings.

Data export/delete.

Alert action.

Weekly digest.

==================================================
29. BROWSER VALIDATION
==================================================

If browser tooling is available:

Test:

320×640
360×800
390×844
430×932
1280×720
1440×900.

Languages:

VI
EN
ZH-CN.

Critical flows:

Starting
Saving
Income growth
Scenario
Investor.

Record any:

overflow
clipping
horizontal scroll
modal issue
tap-target issue
unreadable chart.

Fix all P0/P1 layout problems.

==================================================
30. FINAL REALITY CHECK
==================================================

At the end, recreate feature table.

Do NOT automatically say everything is 5/5.

For each:

Peace Score
Transactions
Goals
Income Growth
Value Hours
Intentional Spending
Onboarding
Home
Next Best Action
Scenario
Portfolio
Behavior
Safety
Alerts
Weekly Digest
Learning
Privacy
Settings
Localization

Report:

STATUS
EVIDENCE
FILES
TEST
KNOWN LIMITATION
SCORE.

Only score 5/5 if definition above is met.

==================================================
31. DOCUMENTATION UPDATE
==================================================

Update:

docs/AN_TAM_PRODUCT_AUDIT.md

docs/PRODUCT_IMPLEMENTATION_LOG.md

docs/PRODUCT_TRACEABILITY_MATRIX.md

docs/COMPETITION_READINESS.md

Create:

docs/FINAL_PRODUCT_REALITY_CHECK.md

with:

1. Product thesis
2. What is genuinely implemented
3. What is still simulated
4. What is not implemented
5. Claims safe to say on stage
6. Claims NOT safe to say on stage
7. 5-minute demo script
8. Feature completeness
9. Tests
10. Known limitations.

==================================================
32. FINAL OUTPUT FORMAT
==================================================

When done, output:

PHASE 1 — BEFORE

- files
- current state
- gaps

PHASE 2 — IMPLEMENTED

For each feature:

WHAT CHANGED
WHY
FILES
TEST.

PHASE 3 — 5/5 CHECK

Table:

Feature
Before
After
Evidence
Test
Remaining issue.

PHASE 4 — DEMO READINESS

Give exact demo order.

PHASE 5 — CLAIMS

SAFE CLAIMS

and

DO NOT CLAIM.

==================================================
33. FINAL PRODUCT TEST
==================================================

After all implementation, answer these without marketing language:

1. Why would a 21-year-old use An Tâm AI?
2. Why would a 35-year-old use it?
3. Why isn't it just an expense tracker?
4. Why isn't it just a robo-advisor?
5. Why isn't it replaceable by one ChatGPT prompt?
6. Where exactly does AI create value?
7. Where exactly does deterministic code create value?
8. What does An Tâm know about the user that creates continuity over time?
9. What reason does a user have to return next week?
10. What tangible outcome can a user achieve after 3 months?

If any answer is weak:

return to implementation.

Do not finish the task until these answers are defensible from the actual codebase.

==================================================
34. NORTH STAR
==================================================

Keep this sentence visible while implementing:

AN TÂM AI DOES NOT HELP PEOPLE OBSESS OVER MONEY.

IT HELPS THEM USE MONEY, TIME AND CAPABILITY TO BUILD A LIFE WITH MORE SAFETY AND MORE CHOICES.

Technology is implementation.

Financial peace is the product.