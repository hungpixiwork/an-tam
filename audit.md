Bạn đang đóng vai đồng thời là:
Principal Product Engineer
Senior Product Designer chuyên Human-Centered Design
Product Manager fintech consumer
UX Researcher
Financial Wellness Product Strategist
QA / Codebase Auditor
Competition Product Reviewer
Nhiệm vụ của bạn KHÔNG phải thiết kế lại An Tâm AI từ đầu.
Codebase hiện tại đã tương đối đầy đủ. Hãy đọc TOÀN BỘ codebase, route, component, state, data model, API, test, tài liệu, mock data và những flow hiện có trước khi đưa ra kết luận.
Mục tiêu là:
Xác định chính xác An Tâm AI hiện tại đã làm được gì.
Đối chiếu những gì code đang làm với product thesis.
Kiểm tra từng tính năng có thực sự giải quyết nhu cầu người dùng hay chỉ “trông giống một tính năng fintech”.
Kiểm tra tính Human-Centric.
Kiểm tra nội dung có dễ hiểu, dễ dùng, gần với đời sống hay không.
Xác định những khoảng trống khiến sản phẩm chưa đủ sức cạnh tranh khi demo tại cuộc thi ở Thâm Quyến.
Hoàn thiện những phần còn thiếu bằng cách ưu tiên sửa code hiện có thay vì xây thêm hàng loạt tính năng.
Tạo một PRODUCT COMPLETENESS LOG để bất kỳ thành viên nào trong team cũng hiểu:
màn hình này tồn tại để làm gì;
người dùng đang gặp vấn đề gì;
chúng ta giải quyết nó thế nào;
AI làm gì;
logic deterministic làm gì;
dữ liệu nào được sử dụng;
người dùng nhận được giá trị gì;
implementation nằm ở đâu;
trạng thái hoàn thiện hiện tại;
còn thiếu gì.
Đừng xem An Tâm AI là:
“một robo-advisor dùng AI để đầu tư tốt hơn”.
Đó chỉ là một phần của sản phẩm.
Thesis cốt lõi:
“An tâm trong tài chính cá nhân không chỉ đến từ việc đầu tư tốt hơn.
Nó đến từ việc hiểu mình đang có gì, kiểm soát cách mình tiêu tiền, tạo được khoản tiết kiệm, chuẩn bị cho những biến cố có thể xảy ra, sử dụng thời gian cho những việc thực sự tạo giá trị, nâng cao năng lực kiếm tiền, và sau đó mới chuyển phần giá trị tích lũy đó thành tài sản cho tương lai.
An Tâm AI giúp người dùng từng bước biến thời gian → năng lực → thu nhập → tiết kiệm → tài sản → quyền tự do lựa chọn trong cuộc sống.”
Đây phải là logic xuyên suốt toàn bộ sản phẩm.
Một người mở An Tâm AI không nhất thiết phải là “nhà đầu tư”.
Họ có thể chỉ đang nghĩ:
Tháng này tiền của mình đi đâu?
Tại sao mình kiếm được nhưng vẫn không dư?
Nếu nghỉ việc 3 tháng thì mình sống được bao lâu?
Có nên mua món đồ này không?
Mình nên tiết kiệm bao nhiêu?
Mình đang dành quá nhiều thời gian cho thứ không tạo giá trị không?
Làm gì để thu nhập tăng lên?
Nếu mỗi tháng dư thêm ¥1.000 thì tương lai thay đổi thế nào?
Nên trả nợ, giữ tiền mặt hay đầu tư?
Nếu thị trường giảm mạnh thì kế hoạch cuộc sống của mình có bị phá vỡ không?
Mục tiêu mua nhà / học tiếp / kết hôn / khởi nghiệp còn bao xa?
Khi có tiền dư thì nên bắt đầu đầu tư như thế nào?
An Tâm AI phải bắt đầu từ những câu hỏi đời thường như vậy.
Không bắt đầu từ:
Sharpe Ratio,
Black-Litterman,
Monte Carlo,
MPT,
Risk Parity,
Student-t Distribution,
Agentic Macro Engine...
Các kỹ thuật đó có thể tồn tại bên dưới engine.
Nhưng NGƯỜI DÙNG không cần học thuật toán để sử dụng sản phẩm.
Nguyên tắc:
COMPLEXITY INSIDE.
CLARITY OUTSIDE.
Không khóa sản phẩm vào:
“Người 30–40 tuổi, thu nhập cao, không có thời gian nghiên cứu đầu tư.”
Hãy audit sản phẩm dựa trên ít nhất 4 trạng thái cuộc đời.
PERSONA A — STARTING
18–24 tuổi.
Sinh viên hoặc mới đi làm.
Có ít tài sản nhưng có thời gian và tiềm năng tăng thu nhập.
Câu hỏi chính:
“Tôi phải làm gì hôm nay để 3–5 năm sau có nhiều lựa chọn hơn?”
An Tâm AI cần giúp họ:
hình thành thói quen tài chính;
hiểu tiền đi đâu;
tiết kiệm khoản đầu tiên;
tránh quyết định tài chính tệ;
đầu tư vào kỹ năng;
sử dụng thời gian tốt hơn;
tìm cách tăng thu nhập;
bắt đầu tích lũy tài sản.
PERSONA B — BUILDING
23–30 tuổi.
Đã có thu nhập ổn định.
Cân bằng:
công việc / học tập / side project / gia đình / tiết kiệm / đầu tư.
Câu hỏi:
“Thu nhập của tôi đang tăng, nhưng tôi nên phân bổ tiền và thời gian như thế nào để tiến nhanh hơn?”
PERSONA C — STABILIZING
30–40 tuổi.
Thu nhập tương đối tốt nhưng trách nhiệm tài chính tăng.
Có thể có:
nhà,
gia đình,
con,
khoản vay,
tài sản đầu tư.
Câu hỏi:
“Nếu có biến cố xảy ra, cuộc sống hiện tại của tôi có đủ an toàn không?”
PERSONA D — GROWING WEALTH
Đã có lượng tài sản nhất định.
Không muốn trading liên tục.
Quan tâm:
phân bổ;
bảo vệ downside;
stress-test;
mục tiêu dài hạn;
rebalance;
quản trị tài sản.
Như vậy:
An Tâm AI phải hữu ích từ “¥0 tài sản đầu tư” cho đến khi người dùng đã có portfolio.
Hãy kiểm tra xem codebase đã thể hiện được hành trình sau chưa:
UNDERSTAND
Hiểu tình hình hiện tại.
↓
CONTROL
Kiểm soát dòng tiền.
↓
PROTECT
Tạo vùng an toàn.
↓
GROW
Tăng khả năng tạo thu nhập.
↓
INVEST
Biến tiền dư thành tài sản.
↓
PREPARE
Kiểm thử các biến cố tương lai.
↓
LIVE
Dùng tài chính để có nhiều quyền lựa chọn hơn trong cuộc sống.
Đây quan trọng hơn việc có thật nhiều feature.
Audit toàn bộ codebase xem sản phẩm hiện tại giải quyết bao nhiêu trong 7 job sau.
JOB 01 — KNOW
“Cho tôi biết tình hình của mình đang ổn hay không.”
Output người dùng cần:
tiền đang có;
thu nhập;
chi tiêu;
tiết kiệm;
nợ;
tài sản;
runway;
tiến độ mục tiêu.
Không biến dashboard thành Bloomberg Terminal.
JOB 02 — SPEND
“Giúp tôi tiêu tiền mà không phải cảm thấy mỗi ngày đều đang làm kế toán.”
An Tâm AI nên biến dữ liệu thành câu trả lời:
“Tháng này bạn đang tiêu nhiều hơn bình thường ở đâu?”
“Khoản nào thực sự đáng giữ?”
“Khoản nào không tạo nhiều giá trị?”
Không phán xét người dùng.
JOB 03 — SAVE
“Giúp tôi tạo khoảng cách giữa thu nhập và chi tiêu.”
Không chỉ bảo:
“Hãy tiết kiệm 20%.”
Phải cho thấy:
Nếu thay đổi một số hành vi,
bao lâu người dùng đạt:
quỹ khẩn cấp;
khoản mua lớn;
mục tiêu học tập;
du lịch;
mua nhà;
vốn khởi nghiệp.
JOB 04 — EARN
Đây là một USP quan trọng.
Phần lớn app tài chính chỉ tối ưu:
“Tiền bạn đang có.”
An Tâm AI phải quan tâm:
“Khả năng kiếm tiền trong tương lai.”
Audit xem codebase đã kết nối được:
TIME
↓
SKILL
↓
WORK
↓
INCOME
↓
SAVINGS
↓
ASSETS
hay chưa.
Ví dụ:
Người dùng có 15 giờ rảnh mỗi tuần.
An Tâm AI không chỉ nói:
“Bạn đang sử dụng điện thoại quá nhiều.”
Mà giúp họ nhìn:
“Nếu 5 giờ/tuần được dùng để nâng kỹ năng X, bạn có thể hoàn thành lộ trình trong 4 tháng.”
Không hứa hẹn mức thu nhập không có cơ sở.
Phải biến nó thành kế hoạch hành động.
JOB 05 — INVEST
“Sau khi có tiền dư, tôi nên bắt đầu thế nào?”
Không đưa người mới vào portfolio optimizer ngay lập tức.
Flow nên có logic:
Emergency fund
→ Short-term commitments
→ Debt
→ Investable surplus
→ Goal
→ Risk capacity
→ Portfolio
→ Explain
→ Stress-test.
JOB 06 — PREPARE
“Nếu chuyện xấu xảy ra thì sao?”
Ví dụ:
mất việc;
giảm 20% thu nhập;
chi phí thuê nhà tăng;
thị trường giảm;
lãi suất thay đổi;
phát sinh khoản chi lớn.
Người dùng cần hiểu:
“Kế hoạch của tôi thay đổi như thế nào?”
chứ không phải:
“Expected Shortfall = 17.6%.”
JOB 07 — LIVE
“Tất cả những thứ này giúp cuộc sống của tôi tốt hơn như thế nào?”
Đây phải là layer cao nhất.
Không tối đa Net Worth bằng mọi giá.
Mục tiêu cuối cùng:
nhiều quyền lựa chọn hơn;
ít áp lực tài chính hơn;
có khả năng theo đuổi việc có ý nghĩa;
có khả năng nghỉ ngơi;
học tập;
đổi nghề;
chăm sóc gia đình;
khởi nghiệp;
theo đuổi mục tiêu dài hạn.
Tự động crawl codebase và lập inventory.
Với MỌI route/màn hình/tính năng quan trọng, tạo record:
SCREEN:
ROUTE:
FILES:
STATUS:
USER SITUATION
Người dùng đến đây trong hoàn cảnh nào?
USER QUESTION
Câu hỏi thực tế trong đầu họ là gì?
USER JOB
Họ muốn hoàn thành việc gì?
CURRENT IMPLEMENTATION
Code hiện tại làm gì?
Không suy đoán.
Dẫn file/component/function cụ thể.
INPUT
Người dùng phải cung cấp gì?
PROCESS
Hệ thống xử lý gì?
Tách:
deterministic logic;
AI;
rules;
local calculation;
external data.
OUTPUT
Người dùng nhận được gì?
SO WHAT?
Sau khi xem output này, họ có biết phải làm gì tiếp không?
Đây là câu hỏi bắt buộc.
HUMAN-CENTRIC CHECK
Đánh giá:
Có bắt đầu từ nhu cầu con người không?
Hay bắt đầu từ công nghệ?
Có dùng ngôn ngữ tự nhiên không?
Có khiến người dùng cảm thấy bị phán xét không?
Có quá nhiều số liệu không?
Có giải thích tại sao không?
Có đưa next action không?
Có phù hợp người không biết tài chính không?
Có phù hợp màn hình nhỏ không?
Cognitive load có cao không?
VALUE CREATED
Một trong các nhóm:
SAVE MONEY
SAVE TIME
REDUCE RISK
MAKE BETTER DECISION
BUILD HABIT
INCREASE EARNING CAPACITY
BUILD WEALTH
REDUCE UNCERTAINTY
IMPROVE LIFE OPTIONS
Nếu không xác định được value:
đánh dấu:
FEATURE WITHOUT CLEAR USER VALUE.
AI ROLE
AI đang thực sự làm gì?
Phân loại:
UNDERSTAND
EXTRACT
EXPLAIN
PERSONALIZE
COMPARE
PLAN
SUMMARIZE
SIMULATE SUPPORT
COACH
Nếu AI chỉ tạo text mà deterministic logic đã làm được:
đánh dấu:
AI WRAPPER RISK.
TRUST
Người dùng có biết:
dữ liệu lấy từ đâu;
số liệu tính như thế nào;
đâu là fact;
đâu là estimate;
đâu là AI interpretation;
mức độ chắc chắn;
dữ liệu có rời thiết bị không?
COMPLETENESS
Phân loại:
0 — Placeholder
1 — Visual only
2 — Functional prototype
3 — End-to-end works
4 — Production-like
5 — Demo-ready + Human-centric
Không chỉ nhìn UI.
Phải kiểm tra cả:
UI
→ interaction
→ state
→ computation
→ persistence
→ error state
→ empty state
→ explanation
→ next action.
COMPETITION VALUE
Feature này có giúp BGK hiểu An Tâm AI khác:
banking app;
expense tracker;
broker;
robo-advisor;
ChatGPT;
productivity app
hay không?
REQUIRED ACTION
KEEP
REFINE
MERGE
REMOVE
COMPLETE
Scan toàn bộ UI copy.
Liệt kê những nơi đang dùng thuật ngữ tài chính/kỹ thuật không cần thiết.
Ví dụ:
Không ưu tiên:
Monte Carlo Simulation
Value at Risk
MPT
Black-Litterman
Expected Return
Volatility
Risk-adjusted Return
Rebalancing Threshold
Scenario Engine
nếu người dùng không cần biết.
Có thể đổi presentation layer thành:
“Thử xem nếu thị trường giảm”
“Nếu bạn mất thu nhập 3 tháng”
“Khoản tiền này có thể dao động bao nhiêu?”
“Danh mục của bạn đang lệch khỏi kế hoạch”
“Bạn có đang phụ thuộc quá nhiều vào một loại tài sản?”
“Khả năng đạt mục tiêu”
“Nếu tiếp tục như hiện tại”
Engine phía dưới vẫn được quyền dùng mô hình phức tạp.
Đây là khu vực quan trọng nhất.
Trong 10–15 giây đầu tiên, một người chưa biết An Tâm AI phải hiểu:
Đây là gì?
Nó giúp tôi việc gì?
Tại sao tôi cần nó?
Tôi bắt đầu từ đâu?
Không mở đầu bằng:
AI Wealth Management.
Quantitative Engine.
Portfolio Optimization.
Robo Advisor.
Ưu tiên thông điệp gần kiểu:
“Biết tiền của bạn đang ở đâu.
Biết bước tiếp theo nên làm gì.”
hoặc:
“An tâm hơn với tiền.
Từng quyết định nhỏ mỗi ngày.”
hoặc concept tương đương nếu codebase hiện tại đã có copy tốt hơn.
Audit onboarding xem người dùng có thể bắt đầu từ tình trạng:
“Tôi chưa có khoản đầu tư nào.”
hay không.
Nếu onboarding bắt người dùng nhập portfolio quá sớm:
flag.
An Tâm AI phải có lý do để mở thường xuyên.
Xác định loop hiện có:
TRIGGER
→ INPUT
→ INSIGHT
→ ACTION
→ PROGRESS
→ RETURN.
Ví dụ:
ghi một khoản chi
→ AI hiểu
→ cập nhật dòng tiền
→ chỉ ra ảnh hưởng
→ gợi ý một hành động nhỏ
→ cập nhật progress.
Hoặc:
hoàn thành 1 giờ học
→ cập nhật mục tiêu kỹ năng
→ tiến độ nghề nghiệp tăng
→ liên hệ đến earning capacity.
Hoặc:
portfolio thay đổi
→ risk state thay đổi
→ giải thích
→ user quyết định.
Đừng tạo gamification vô nghĩa.
Mỗi return loop phải gắn với progress thực.
Nếu sản phẩm có một score tổng hợp, audit cực kỳ kỹ.
Không được để nó trở thành:
“Credit Score giả”.
Score phải giải thích được.
Có thể bao gồm các dimension như:
Cash Flow
Safety Buffer
Debt
Goal Progress
Income Resilience
Investment Diversification
Financial Habits
Nhưng người dùng phải biết:
“Tại sao score thay đổi?”
và:
“Tôi làm gì để cải thiện?”
Một score không actionable = vanity metric.
Giữ các năng lực mạnh hiện tại nếu đã implement:
portfolio construction;
risk profile;
scenario testing;
portfolio comparison;
rebalance;
historical case studies;
quantitative engine;
Monte Carlo;
MPT / Black-Litterman;
deterministic calculation;
privacy-first;
local computation / WASM nếu có.
NHƯNG:
Đừng biến chúng thành toàn bộ identity.
Investment là:
một outcome sau khi người dùng tạo được investable surplus.
Kiểm tra flow:
income
essential expenses
short-term commitments
safety buffer
available capital.
Sau đó mới:
goal
→ risk capacity
→ allocation
→ scenario
→ portfolio action.
Tạo AI ROLE MAP.
Cho mỗi use case:
USER INPUT
↓
AI TASK
↓
DETERMINISTIC ENGINE
↓
OUTPUT
↓
USER ACTION.
Ví dụ:
“Tối ăn lẩu 168 tệ với bạn”
AI:
parse intent + amount + category + context.
Engine:
update ledger + monthly budget.
AI:
explain impact.
User:
confirm / edit.
AI không được giả vờ làm calculation nếu deterministic engine có thể tính chính xác.
Principle:
AI handles ambiguity.
Code handles truth.
Không trình bày:
“Edge Computing Architecture.”
Người dùng cần hiểu:
“Dữ liệu tài chính của bạn không cần rời thiết bị để thực hiện những phép tính này.”
Nếu codebase thật sự hỗ trợ điều đó.
Nếu chưa hỗ trợ:
không được claim.
Audit:
dữ liệu nào local;
dữ liệu nào server;
dữ liệu nào gửi AI provider;
có masking không;
có consent không;
có delete/export không.
Sau khi đọc codebase, đánh giá xem sản phẩm đã thể hiện được 5 điểm khác biệt sau chưa.
MOAT 1 — WHOLE FINANCIAL LIFE
Không chỉ đầu tư.
Cashflow + Saving + Safety + Income + Investment + Life goals.
MOAT 2 — FUTURE, NOT ONLY PAST
App thông thường nói:
“Bạn đã tiêu ¥3.200.”
An Tâm AI phải có thể nói:
“Nếu tiếp tục như hiện tại, mục tiêu của bạn sẽ chậm khoảng X.”
MOAT 3 — EARNING CAPACITY
Đây có thể trở thành một USP mạnh.
Tài sản lớn nhất của người trẻ thường chưa phải portfolio.
Mà là:
khả năng tạo thu nhập tương lai.
MOAT 4 — EXPLAINABLE DECISION ENGINE
Không chỉ đưa recommendation.
Phải giải thích:
WHY
TRADE-OFF
WHAT IF
NEXT STEP.
MOAT 5 — PRIVATE BY DESIGN
Dữ liệu nhạy cảm chỉ được sử dụng ở mức cần thiết.
Không biến privacy thành slogan.
Không được xây sản phẩm chỉ dựa trên hành vi người dùng Việt Nam.
Audit xem UX có đủ generic để demo cho người trẻ ở Trung Quốc không.
Đặc biệt phải hỗ trợ tư duy:
Mobile-first.
Fast onboarding.
Low typing.
High visual feedback.
Action-oriented.
Scenario-based.
Goal-based.
Không hardcode những assumption chỉ đúng với:
VNĐ,
ngân hàng Việt Nam,
chứng khoán Việt Nam,
IELTS,
hệ thống nghề nghiệp Việt Nam
nếu đây là core logic.
Localisation phải tách khỏi product engine.
Nếu có bilingual VI/ZH:
kiểm tra toàn bộ:
overflow;
line wrapping;
spacing;
semantic equivalence;
hardcoded string;
currency;
number formatting;
date formatting.
Không chỉ audit code.
Audit cả nội dung.
Mỗi screen phải trả lời được:
HEADLINE:
Tôi đang xem cái gì?
INSIGHT:
Điều gì đáng chú ý?
WHY:
Tại sao nó quan trọng?
ACTION:
Tôi nên làm gì?
IMPACT:
Nếu làm thì điều gì thay đổi?
Nếu screen chỉ có chart + number:
chưa hoàn thiện.
Giả lập ít nhất 5 user journey hoàn chỉnh.
JOURNEY 1
Sinh viên 21 tuổi.
Chưa đầu tư.
Thu nhập part-time.
Muốn nâng thu nhập.
JOURNEY 2
Nhân viên 25 tuổi.
Thu nhập đầu tiên tương đối ổn.
Muốn tiết kiệm và đầu tư.
JOURNEY 3
Người 29 tuổi.
Muốn dành tiền mua nhà.
JOURNEY 4
Người 35 tuổi.
Có gia đình + portfolio.
Muốn biết nếu mất việc / market crash thì sao.
JOURNEY 5
Người bận rộn.
Có tiền nhưng không muốn học trading.
Muốn hệ thống giúp quản trị tài sản.
Với mỗi journey:
START
→ INPUT
→ FIRST VALUE
→ DAILY VALUE
→ BIG DECISION
→ LONG-TERM VALUE.
Phải xác định:
Code hiện tại support đến đâu.
Sau audit, đề xuất một demo flow 3–5 phút.
Không demo feature theo menu.
Demo một con người.
Ví dụ:
“Linh, 24 tuổi, vừa bắt đầu đi làm.”
Cô ấy:
có thu nhập
→ không biết tiền đi đâu
→ An Tâm hiểu dòng tiền
→ xây vùng an toàn
→ cô muốn học một kỹ năng mới
→ hệ thống biến mục tiêu thành kế hoạch
→ thu nhập tăng / khoản dư tăng
→ bắt đầu đầu tư
→ thử một kịch bản market crash
→ thấy mục tiêu dài hạn vẫn an toàn.
Đây mới là câu chuyện An Tâm AI.
Tạo:
docs/AN_TAM_PRODUCT_AUDIT.md
Cấu trúc:
1. Executive Summary
Product thesis hiện tại
Codebase đang thể hiện được bao nhiêu
Các điểm mạnh thực tế
Những khoảng trống lớn nhất
Không dùng marketing bullshit
2. Product Thesis
Viết lại thesis bằng ngôn ngữ người bình thường.
Bao gồm:
TIME
→ CAPABILITY
→ INCOME
→ SAVINGS
→ SAFETY
→ ASSETS
→ FREEDOM.
3. Existing Product Map
Inventory toàn bộ:
routes
screens
features
engines
AI
storage
API
data.
4. User Need Map
Feature ↔ user need.
5. Screen-by-Screen Audit
Dùng template ở trên.
6. Human-Centric Audit
7. AI Role Audit
8. Financial Engine Audit
9. Privacy Audit
10. Content & Language Audit
11. China / Shenzhen Readiness
12. Five User Journeys
13. Daily Use Loop
14. Competitive Differentiation
15. Demo Flow
16. Missing Pieces
P0 / P1 / P2.
17. Recommended Changes
Không redesign toàn bộ.
Ưu tiên minimal changes có impact cao.
Tạo thêm:
docs/PRODUCT_IMPLEMENTATION_LOG.md
Mỗi feature phải có format:
Feature Name
Purpose:
User:
User problem:
Human need:
Route:
Files:
Current implementation:
AI responsibility:
Deterministic responsibility:
Data:
User input:
System output:
User action:
Why this matters:
Human-centric rationale:
Privacy:
Error/empty/loading state:
Mobile:
Chinese localisation:
Tests:
Status:
Remaining gaps:
Next change:
Status chỉ được chọn:
NOT STARTED
PARTIAL
FUNCTIONAL
POLISHED
DEMO READY
Không được tự đánh DEMO READY nếu chưa kiểm chứng flow.
Tạo:
docs/PRODUCT_TRACEABILITY_MATRIX.md
Format:
USER NEED
→ PRODUCT CAPABILITY
→ SCREEN
→ COMPONENT
→ ENGINE / API
→ TEST
→ STATUS.
Mục đích:
Không được tồn tại feature chỉ vì “nghe hay”.
Mỗi feature phải trace về nhu cầu thật.
Tạo:
docs/COMPETITION_READINESS.md
Không cho điểm chung chung.
Phân tích bằng evidence:
PRODUCT COMPLETENESS
Flow nào chạy hoàn chỉnh?
Flow nào fake?
Flow nào dùng mock?
Flow nào có persistence?
Flow nào có engine thật?
INNOVATION
Không dùng “AI” như innovation mặc định.
Innovation phải đến từ cách giải quyết vấn đề.
COMMERCIAL VALUE
Người nào dùng?
Khi nào dùng?
Tần suất?
Value?
Willingness to pay có thể đến từ đâu?
HUMAN VALUE
Sản phẩm giúp cuộc sống người dùng khác đi ở điểm nào?
DEFENSIBILITY
Cái gì khó bị ChatGPT thêm một feature rồi thay thế?
Không dừng ở report.
Sau khi audit:
Chọn tối đa 10 vấn đề impact cao nhất.
Sắp theo:
P0 / P1 / P2.
Fix P0 trực tiếp.
Không làm big rewrite nếu không cần.
Reuse architecture hiện có.
Reuse component hiện có.
Giữ visual language hiện tại nếu đã tốt.
Tăng completeness trước khi tăng feature count.
Ưu tiên:
BROKEN FLOW
MISSING USER VALUE
UNCLEAR CONTENT
MISSING STATE
BAD UX
VISUAL POLISH
NEW FEATURE.
Sau khi thay đổi:
Run:
lint
typecheck
unit tests
integration tests
build.
Nếu có browser automation:
test toàn bộ critical journeys.
Viewport ít nhất:
320×640
360×800
390×844
430×932
desktop 1440×900.
Nếu có tiếng Trung:
test cả Chinese UI.
Không chấp nhận:
“should work”.
Phải report:
TESTED
PASS
FAIL
NOT TESTED.
Trong toàn bộ quá trình hãy liên tục hỏi:
“Người dùng được gì?”
Không hỏi:
“Chúng ta có thể thêm AI gì nữa?”
Không thêm feature chỉ để pitch deck trông công nghệ hơn.
Không dùng thuật ngữ học thuật để che việc sản phẩm chưa giải quyết nhu cầu.
Không biến An Tâm AI thành:
ChatGPT cho tài chính;
expense tracker có chatbot;
robo-advisor clone;
productivity app có biểu đồ tiền;
portfolio simulator có giao diện đẹp.
An Tâm AI phải trở thành một hệ thống giúp con người trả lời:
“Tôi đang ở đâu?”
“Điều gì quan trọng nhất bây giờ?”
“Tôi nên làm gì tiếp?”
“Nếu làm điều đó thì tương lai thay đổi thế nào?”
Và cuối cùng:
“Tài chính có đang giúp tôi sống cuộc đời mình muốn sống hay không?”
Task chỉ hoàn thành khi bạn có thể chứng minh bằng code + test + product flow rằng:
Một người hoàn toàn mới hiểu An Tâm AI trong 15 giây.
Người chưa đầu tư vẫn có lý do sử dụng.
Người trẻ vẫn có giá trị nhận được.
Người đã có tài sản vẫn có công cụ đủ sâu.
Mỗi màn hình trả lời một câu hỏi người dùng thực sự có.
Mỗi insight dẫn được đến action.
AI có nhiệm vụ rõ ràng.
Calculation quan trọng không phụ thuộc hallucination của LLM.
Những claim về privacy đúng với implementation.
UI không bắt người dùng học tài chính trước khi sử dụng.
VI/ZH đều usable nếu project support bilingual.
Có ít nhất một end-to-end story đủ mạnh để demo cuộc thi.
Không có critical feature chỉ tồn tại dưới dạng mock nếu pitch nói rằng nó hoạt động thật.
Documentation phản ánh đúng implementation.
An Tâm AI thể hiện rõ thesis:
Không chỉ quản lý tiền.
Mà giúp một con người từng bước xây dựng năng lực tạo ra tiền, giữ được tiền, bảo vệ tiền, làm tiền tăng trưởng và dùng nó để có nhiều quyền lựa chọn hơn trong cuộc sống.
BẮT ĐẦU BẰNG VIỆC ĐỌC CODEBASE.
Không lập kế hoạch từ assumptions.
Trước khi sửa bất kỳ thứ gì, hãy xuất:
A. CODEBASE REALITY CHECK
B. CURRENT PRODUCT THESIS FOUND IN CODE
C. FEATURE INVENTORY
D. TOP 10 GAPS
Sau đó mới bắt đầu implementation.

