# Nền dữ liệu cho 5 tính năng mới — tài liệu bàn giao API

> Dành cho bạn làm giao diện. Mọi số liệu đã có sẵn ở máy chủ; giao diện chỉ gọi API và hiển thị.
> Cập nhật: 28/09/2026. Đọc code gốc khi cần chi tiết — đường dẫn ghi ở từng mục.

## 0. Nguyên tắc chung

- **AI hiểu câu hỏi, code tính con số, người duyệt.** AI chỉ đoán người dùng muốn gì (ý định). Mọi con số do hàm thuần trong `shared/engine/*` tính. Việc ghi dữ liệu do agent đề xuất luôn ở trạng thái *chờ duyệt*, người dùng bấm duyệt mới chạy.
- **Không sửa bố cục trang đã khớp mockup — gắn vào khối có sẵn (skill `safe-feature`).** Thêm 1 dòng trong thẻ, 1 link mở modal, 1 nút chuyển trong thẻ, hoặc 1 bước kết quả. Chụp trước / sau để chứng minh bố cục không đổi.
- **Chữ tiếng Việt dễ hiểu**, theo bảng từ cấm trong skill `an-tam-conventions` (không "Runway", "Cashflow", "KPI"...).
- Không số nào gõ cứng trong giao diện. Luồng: khối → hook → endpoint → engine → D1.
- Mọi API (trừ webhook) cần đăng nhập (cookie phiên). Dạng trả về:
  - thành công: `{ "success": true, "data": ... }`
  - lỗi: `{ "success": false, "error": { "code": "limit_reached", "message": "..." } }` → hiện `message` cho người dùng.
- Hook dùng `api.get/post/...` trong `client/src/lib/api.ts`; khóa cache ở `client/src/lib/queries/keys.ts`. Khi thêm hook mới, đặt cạnh các hook cùng miền và invalidate đúng khóa.

## 1. Hồ sơ tài chính gộp — `GET /api/signals`

- Mục đích: một chỗ đọc thu / chi trung bình, chi cố định / linh hoạt, tiền để dành, tiền dùng được ngay và mức tin cậy của số liệu.
- Kiểu: `FinancialSignals` — [shared/types/api/signals.ts](../../shared/types/api/signals.ts). Tính ở `shared/engine/signals.ts`, route `worker/routes/signals.ts`.
- Hook: **chưa có hook**.
- Giới hạn gói: không.

```json
{ "income": { "avg3": 28150000, "avg6": 27600000, "stability": "on_dinh", "monthsOfData": 5 },
  "expense": { "avg3": 20300000, "fixed": 4129000, "flexible": 16800000, "trend": "deu" },
  "saving": { "monthly": 5350000, "rate": 0.19 },
  "liquid": { "amount": 276000000, "monthsCovered": 4.2 },
  "confidence": { "level": "cao", "reasons": ["Có 5 tháng sổ thu chi"] },
  "sources": { "incomeSource": "ledger", "expenseSource": "ledger", "ledgerMonths": 5 },
  "bankLinked": true }
```

Ghi chú: `stability`: `on_dinh | dao_dong | bap_benh`; `trend`: `tang | giam | deu`; `confidence.level`: `thap | vua | cao`. Nên hiện `confidence.reasons` thành 1 dòng nhỏ "Số liệu dựa trên …".

## 2. Lựa chọn cuộc đời — đánh giá có căn cứ và kịch bản xấu

Route: `worker/routes/lifeChoices.ts`. Kiểu: [shared/types/api/lifeChoices.ts](../../shared/types/api/lifeChoices.ts). Engine: `shared/engine/lifeChoice.ts` (đã dùng `signals` ở mục 1).

| Endpoint | Việc | Vào → Ra |
|---|---|---|
| `GET /api/life-choices` | Danh sách | → `LifeChoice[]` |
| `GET /api/life-choices/:id` | Chi tiết, mỗi phương án có sẵn `evaluation` | → `LifeChoiceDetail` |
| `POST /api/life-choices` | Tạo (có thể kèm `template`) | `LifeChoiceInput` → `{ id }` |
| `POST /api/life-choices/:id/options` | Thêm phương án (tối đa 4) | `LifeChoiceOptionInput` → `null` |
| `POST /api/life-choices/evaluate` | Tính thử 1 phương án, không lưu | `{ choiceId, optionId? }` hoặc `{ option, kind?, incomeUpliftPct?, prereqsDone?, prereqsTotal? }` → `LifeChoiceEvaluation` |
| `POST /api/life-choices/compare` | So 2–4 phương án | `{ choiceId }` hoặc `{ options[], kind?, incomeUpliftPct? }` → `LifeChoiceCompare` |
| `GET /api/life-choices/templates` | Mẫu có sẵn | → `LifeChoiceTemplate[]` |

Trường mới trong `LifeChoiceEvaluation`:
- `basis?: string` — câu nói rõ kết luận dựa trên sổ thu chi thật hay còn ước lượng. Hiện nguyên văn dưới điểm khả thi.
- `worstCase?: { survives: boolean; monthsCovered: number }` — mất thu nhập 3 tháng + tài sản đầu tư giảm 20% sau khi làm phương án. `survives=false` → hiện cảnh báo nhẹ.

```json
{ "feasibility": 46, "verdict": "wait", "monthsBefore": 4.2, "monthsAfter": 0.6, "monthsDelta": -3.6,
  "costs": { "tuition": 342900000, "living": 420000000, "other": 147500000, "total": 910400000 },
  "funding": { "liquid": 276000000, "incomeCover": 0, "shortfall": 634400000 },
  "worstCase": { "survives": false, "monthsCovered": 0 },
  "basis": "Dựa trên 5 tháng sổ thu chi thật của bạn." }
```

- Hook: `useLifeChoices`, `useLifeChoice`, `useLifeChoiceTemplates`, `useCreateLifeChoice`, `useSelectOption`, `useTogglePrereq`, `useAddChoiceTask`, `useToggleChoiceTask`, `useDeleteChoiceTask` — `client/src/lib/queries/choices.ts`. `evaluate` / `compare`: **chưa có hook**.
- Giới hạn gói: không.
- Dữ liệu demo: "Học thạc sĩ 2 năm ở Thâm Quyến" (2 phương án, chi phí đổi từ nhân dân tệ theo tỷ giá thật).

## 3. Thị trường — giá, nguồn, lịch sử, tài sản có mã

Route: `worker/routes/market.ts`. Kiểu: [shared/types/api/market.ts](../../shared/types/api/market.ts), mẫu gốc [shared/types/market.ts](../../shared/types/market.ts).

| Endpoint | Việc | Ra |
|---|---|---|
| `GET /api/market` | Bảng giá: SJC, VNINDEX, USD, CNY + mã người dùng đang giữ (đứng đầu), độ rộng thị trường, 10 tin | `MarketData` |
| `GET /api/market/sources` | Nguồn dữ liệu + dòng ghi nguồn | `MarketSource[]` |
| `GET /api/market/history/:symbol?days=60` | Giá đóng cửa + chỉ báo (5..365 ngày). Chỉ mã đang giữ hoặc mã nền (SJC, XAU, XAG, VNINDEX, USD, CNY), khác → 404 | `MarketHistoryData` |

```json
{ "quotes": [ { "symbol": "SJC", "kind": "gold_vn", "price": 140400000, "changePct": -0.4,
                "asOf": "2026-09-28T01:31:00.000Z", "source": "sjc", "held": true, "stale": false } ],
  "breadth": { "day": "2026-09-26", "indexValue": 1650.2, "advancers": 180, "decliners": 150, "...": "..." },
  "news": [ { "id": "…", "title": "…", "url": "…", "source": "cafef", "sentiment": null } ],
  "updatedAt": "2026-09-28T02:05:00.000Z" }
```

- Đơn vị giá: VND (vàng SJC: VND/lượng; quỹ: VND/chứng chỉ; tỷ giá: VND/1 ngoại tệ); vàng thế giới: USD/ounce; chỉ số: điểm.
- `stale=true` (giá mẫu hoặc quá cũ) → làm mờ số, không hiện như giá mới. `updatedAt` hiện 1 lần "cập nhật lúc HH:mm".
- Ghi nguồn: hiện 1 dòng nhỏ lấy từ `/api/market/sources`, **không** lặp ở từng giá.

**Tài sản có mã + số lượng** (`POST /api/holdings`, `PATCH /api/holdings/:id`, kiểu `Holding` trong [shared/types/domain.ts](../../shared/types/domain.ts)):
- Thêm `symbol` (SJC, FPT, VESAF, BTC, USD…) và `quantity` (lượng vàng, số cổ phiếu, số chứng chỉ quỹ). `null` = bỏ mã.
- Có mã + số lượng + giá VND → `value = quantity × giá mới nhất`, kèm `priceAsOf`. Không có giá → giữ số nhập tay.
- Mã mới chưa có giá → máy chủ lấy giá ngay (tối đa ~5 giây).
- Hook: `useHoldings`, `useSaveHolding`, `useDeleteHolding` — `client/src/lib/queries/portfolio.ts` (kiểu `HoldingInput` ở đó **chưa có** `symbol`/`quantity`, cần thêm). Hook thị trường: **chưa có hook**.
- Giới hạn gói: không.

## 4. Luật cảnh báo giá — `/api/alert-rules`

Route: `worker/routes/alertRules.ts`. Kiểu: `AlertRule`, `AlertRuleInput`, `AlertRuleList` — [shared/types/api/market.ts](../../shared/types/api/market.ts).

| Endpoint | Vào → Ra |
|---|---|
| `GET /api/alert-rules` | → `AlertRule[]` |
| `POST /api/alert-rules` | `AlertRuleInput` → `{ id }` (201) |
| `PATCH /api/alert-rules/:id` | `Partial<AlertRuleInput>` → `null` |
| `DELETE /api/alert-rules/:id` | → `null` |

```json
{ "symbol": "SJC", "direction": "down", "thresholdPct": 3 }
```

- Mục đích: người dùng tự đặt "báo tôi khi mã X giảm / tăng từ n% trở lên" (so với phiên / ngày trước).
- Giới hạn gói: Miễn phí 3 luật; Plus / Ngân hàng 1000. Vượt → lỗi `limit_reached` ("Gói hiện tại đặt được tối đa 3 luật cảnh báo").
- Mỗi thao tác ghi nhật ký (`alert_rule.create/update/delete`).
- Hook: **chưa có hook**.

## 5. Thông báo từ cảnh báo thị trường (dùng `ai_alerts` sẵn có)

Không có bảng mới. Cảnh báo thị trường ghi vào `ai_alerts` + `ai_events` (loại `alert`) — `worker/market/alerts.ts`, luật ở `shared/engine/marketAlerts.ts`.

| Endpoint | Việc | Hook |
|---|---|---|
| `GET /api/notifications` | 10 cảnh báo đang mở (chuông trên thanh đầu trang) | `useNotifications` — `client/src/lib/queries/topbar.ts` |
| `GET /api/ai?range=week\|month` | Cảnh báo + nhật ký AI (trang AI theo dõi) | `useAi` — `client/src/lib/queries/ai.ts` |
| `PATCH /api/ai/alerts/:id` `{ status: "resolved" }` | Đánh dấu đã xử lý | `useResolveAlert` |

Kiểu: `NotificationItem` — [shared/types/api/common.ts](../../shared/types/api/common.ts); `AiAlert` — khai báo trong `client/src/lib/queries/ai.ts`.

`ruleKey` cho biết nguồn cảnh báo (lọc theo tiền tố `market:`):

| ruleKey | Khi nào | Mức |
|---|---|---|
| `market:gold_drop` | Vàng SJC giảm mạnh so với các ngày trước | warning |
| `market:market_red` | VN-Index giảm, ảnh hưởng cổ phiếu / quỹ đang giữ | warning |
| `market:drop:<MÃ>` | Mã đang giữ giảm mạnh | danger |
| `market:fx:<MÃ>` | Tỷ giá tăng khi có mục tiêu cần ngoại tệ (du học, du lịch…) | warning |
| `market:rule:<id luật>` | Chạm luật người dùng tự đặt (mục 4) | action |

```json
{ "id": "…", "ruleKey": "market:rule:9f…", "severity": "action", "title": "Vàng SJC giảm 3,2%",
  "body": "… Bàn đầu tư hôm nay: đi ngang, rủi ro vừa.", "status": "open", "createdAt": "2026-09-28T02:05:11Z" }
```

- Mỗi luật chỉ báo 1 lần / ngày; cảnh báo cùng luật hôm trước còn mở sẽ tự đóng.
- Nếu bàn đầu tư đã có kết luận hôm nay cho mã đó, `body` có thêm 1 câu của bàn.

## 6. Bàn đầu tư — `/api/desk/:symbol`

Route: `worker/desk/routes.ts`. Kiểu: `DeskView` — [shared/types/api/desk.ts](../../shared/types/api/desk.ts) (**chưa** export qua `shared/types/api/index.ts`, import thẳng file).

| Endpoint | Việc | Ra |
|---|---|---|
| `GET /api/desk/:symbol` | Báo cáo gần nhất của mã + góc nhìn rủi ro riêng của người dùng | `DeskView` |
| `POST /api/desk/:symbol/run` | Chạy bàn cho hôm nay (chờ tối đa ~25 giây) | `DeskView` (200) hoặc `status: "running"` (202 → gọi lại GET sau vài giây) |

- Mục đích: nhóm phân tích (kỹ thuật, tin tức, cơ bản, vĩ mô) → tranh luận lạc quan / thận trọng → kết luận (xu hướng, rủi ro, độ tin cậy) → ảnh hưởng tới tài sản và số tháng an toàn của người dùng. **Không bao giờ khuyên mua.**
- `status`: `ready | running | empty`; `stale=true` = báo cáo không phải của hôm nay.
- `risk.suggestedActions` chỉ là gợi ý — tạo việc chờ duyệt qua agent, bàn không tự ghi.
- Giới hạn gói: GET ai cũng xem được. POST cần Plus / Ngân hàng (lỗi 403 `plan_required`). Chỉ mã đang giữ hoặc SJC / VNINDEX (khác → 404).
- Hook: **chưa có hook**.

```json
{ "symbol": "SJC", "status": "ready", "stale": false,
  "report": { "verdict": { "trend": "di_ngang", "risk": "vua", "confidence": 0.55, "reasons": ["…"] },
              "analysts": [ { "key": "technical", "available": false, "note": "Chưa đủ lịch sử giá (cần ít nhất 20 phiên)." } ] },
  "risk": { "stance": "binh_tinh", "impactVnd": -1400000, "weight": 0.027, "monthsSafeBefore": 4.2, "monthsSafeAfter": 4.1, "text": "…" } }
```

## 7. Agent (AI Workspace) — `POST /api/agent/runs`

Route: `worker/routes/agent.ts`, `worker/agents/runner.ts`. Kiểu: `AgentRunView`, `AgentActionView` — [shared/types/api/agent.ts](../../shared/types/api/agent.ts). Loại hành động: `shared/agent/actions.ts`.

Vào: `{ "prompt": "Nếu tôi nghỉ việc 1 năm đi học thì sao?" }`. Ra: `AgentRunView`.

Ý định mới (trong `intents`):
- `life_decision` — quyết định lớn (nghỉ việc đi học, du học, khởi nghiệp, nghỉ dài, đổi nghề) → đánh giá như mục 2, đề xuất `life_choice.create`.
- `set_alert` — "báo tôi khi vàng giảm 3%" → đề xuất `alert_rule.create` (đã kiểm tra số luật còn lại theo gói).
- `ask_desk` — "FPT giảm có sao không?" → lấy báo cáo bàn đầu tư hôm nay (gói Plus thì chạy bàn nếu chưa có).

Loại hành động mới (chờ duyệt, xem `preview` để hiện hộp trước / sau):
- `life_choice.create` — payload `{ title, kind, option: { title, cost, otherCost, durationMonths, monthsWithoutIncome, monthlyIncomeDelta }, reason }` → lưu vào Lựa chọn cuộc đời.
- `alert_rule.create` — payload `{ symbol, label, direction, thresholdPct }` → tạo luật ở mục 4.

Trường mới (không bắt buộc):
- `reply?: string` — câu trả lời ngắn; số do engine tính, AI chỉ diễn đạt lại. Hiện như tin nhắn của An Tâm.
- `aiQuota?: { used, limit }` — chỉ có trong phản hồi POST. Hiện "Đã dùng 3/10 lượt AI hôm nay".

```json
{ "id": "…", "status": "awaiting_approval", "intents": ["set_alert"], "intentSource": "llm",
  "reply": "An Tâm sẽ báo khi vàng SJC giảm từ 3% trở lên. Bạn duyệt để bật nhé.",
  "actions": [ { "id": "…", "type": "alert_rule.create", "status": "pending",
                 "preview": { "after": "Báo khi Vàng SJC giảm từ 3% trở lên", "lines": ["Chỉ báo tin, không tự mua bán"] } } ],
  "aiQuota": { "used": 3, "limit": 10 } }
```

- Hook: `useStartRun`, `useAgentRun`, `usePendingActions`, `useApproveBatch`, `useRejectActions`, `useRequestChanges` — `client/src/lib/queries/agent.ts`.
- Duyệt / từ chối cần header `Idempotency-Key` (hook đã gửi sẵn).
- Giới hạn gói: lượt AI mỗi ngày Miễn phí 10 / Plus 200 / Ngân hàng 1000. Hết lượt → chạy chế độ cơ bản bằng luật, **không báo lỗi**. Có thêm giới hạn tần suất theo người dùng.

## 8. Gói dịch vụ — `/api/plan`

Route: `worker/routes/plan.ts`. Hạn mức: [shared/plans.ts](../../shared/plans.ts) (nguồn duy nhất, client import `PLANS`, `PLAN_LABEL`). **Chưa có type response** trong `shared/types/api` — dạng như dưới.

| Endpoint | Ra |
|---|---|
| `GET /api/plan` | `{ plan: PlanKey; planUntil: string \| null; usageToday: { ai: number }; limits: PlanLimits }` |
| `POST /api/plan/checkout` | `{ code: string; amount: number; qrUrl: string \| null }` (201 mã mới, 200 trả lại mã đang chờ) |

```json
{ "plan": "free", "planUntil": null, "usageToday": { "ai": 3 },
  "limits": { "aiPerDay": 10, "alertRules": 3, "mcp": false, "deskAsk": false, "autoApprove": false, "priceVnd": 0 } }
```

| | Miễn phí | Plus (49.000đ/tháng) | Ngân hàng |
|---|---|---|---|
| Lượt AI / ngày | 10 | 200 | 1000 |
| Luật cảnh báo | 3 | 1000 | 1000 |
| MCP · chạy bàn đầu tư · tự duyệt | không | có | có |

- Thanh toán: người dùng chuyển khoản theo `qrUrl` (VietQR) với nội dung chứa `code` (ANTAM + 6 ký tự). SePay báo tiền về tài khoản nhận → gói Plus được gia hạn 30 ngày. Mã chờ hết hạn sau 3 ngày.
- `qrUrl = null` khi chưa cấu hình tài khoản nhận → hiện "Chưa cấu hình thanh toán", không bịa QR.
- Hook: **chưa có hook** (`client/src/lib/queries/plans.ts` là *kế hoạch an toàn* `/api/plans`, không phải gói).

## 9. MCP — `/mcp`

Code: `worker/mcp/*` (`tools.ts` = danh sách công cụ, `authorize.ts` = trang đồng ý).

- Máy chủ MCP kiểu Streamable HTTP tại `https://<tên miền>/mcp` (dev: `http://localhost:8787/mcp`). Đăng nhập bằng OAuth: `/.well-known/*`, `/register` (ứng dụng tự đăng ký), `/authorize`, `/token`.
- Cách kết nối: trong Claude / ứng dụng hỗ trợ MCP, thêm máy chủ tùy chỉnh bằng URL trên → trình duyệt mở trang "Cho phép kết nối" → đăng nhập An Tâm → bấm Cho phép.
- Giới hạn gói: chỉ Plus / Ngân hàng. Mỗi lần gọi công cụ trừ 1 lượt AI và ghi nhật ký (`mcp.<tên công cụ>`).
- Cần binding `OAUTH_KV`; thiếu → 503 "MCP chưa được cấu hình".

| Công cụ | Việc |
|---|---|
| `get_overview` | Tổng quan tài chính |
| `get_signals` | Hồ sơ gộp (mục 1) |
| `get_ledger` | Sổ thu chi 1 tháng |
| `get_goals` | Mục tiêu tiết kiệm |
| `get_calendar_week` | Lịch 1 tuần |
| `get_market` | Bảng giá (mục 3) |
| `get_price_history` | Lịch sử giá 1 mã |
| `evaluate_life_choice` | Tính thử 1 phương án (mục 2) |
| `what_if_allocate` | Thử phân bổ một khoản tiền |
| `list_pending_actions` | Việc đang chờ duyệt |
| `propose_action` | Đề xuất 1 việc → chỉ lưu *chờ duyệt* (hết hạn sau 24 giờ), người dùng duyệt trong app |
| `run_desk` | Báo cáo bàn đầu tư (mục 6) |

## 10. Nguồn dữ liệu, lịch chạy nền, hàng đợi

- **Nguồn dữ liệu chỉ ghi ở một nơi**: `DATA_SOURCES` trong `worker/market/chains.ts` (tên, giấy phép, dòng ghi nguồn). Chuỗi nguồn chính / dự phòng theo nhóm cũng ở file này (`CHAINS`). Không chép dòng ghi nguồn vào giao diện hay câu cảnh báo — lấy từ `/api/market/sources`.
- **Mỗi giờ (phút 05)**: lấy giá mã nền + mã có người giữ (`worker/market/refresh.ts`); nguồn lỗi thì giữ giá cũ.
- **Cảnh báo theo từng người qua hàng đợi**: sau khi lấy giá, mỗi người có tài sản có mã / vàng / cổ phiếu / quỹ hoặc có luật tự đặt được gửi 1 thông điệp `market.alerts` vào Queue `an-tam-jobs`. Không có Queue (dev) → chạy lần lượt.
- **16:05 hằng ngày (giờ VN)**: bàn đầu tư chạy cho mọi mã đang có người giữ + SJC, VNINDEX (dùng chung cho mọi người), kèm rút kinh nghiệm từ kết luận 5 / 20 phiên trước.
- Dev: `GET /api/market/refresh-dev` lấy giá ngay và chạy cảnh báo cho người đang đăng nhập (`?fetch=0` chỉ chạy lại cảnh báo).

## 11. Chỗ còn thiếu (đã biết)

- **Vàng chưa có lịch sử giá** → nhóm phân tích kỹ thuật bị bỏ qua với SJC (`available: false`, ghi chú "Chưa đủ lịch sử giá"). Giao diện hiện đúng ghi chú đó, không ẩn khối.
- **Trang đăng nhập của MCP không tự quay lại trang đồng ý**: người dùng đăng nhập ở thẻ mới rồi phải quay lại bấm "Tiếp tục".
- **Mã xác thực tài khoản SePay chỉ hiện trong câu báo lỗi** của `POST /api/integrations/sepay/verify` ("…chuyển 2.000đ… với nội dung <mã>"); nên hiện mã ngay sau khi liên kết.
- Chưa có hook cho: signals, market, alert-rules, desk, plan, evaluate / compare.
- `HoldingInput` ở client chưa có `symbol` / `quantity`.

## 12. Dữ liệu demo (`node scripts/seed-demo.mjs`)

- Vàng SJC 0,1 lượng · FPT ~495 cổ phiếu · VESAF ~761 chứng chỉ (số lượng tính theo giá lúc seed; phần lệch bù vào "Tiền chờ đầu tư" → tài sản ròng ~520 triệu, sẽ dao động theo giá).
- Lựa chọn "Học thạc sĩ 2 năm ở Thâm Quyến"; luật cảnh báo SJC giảm 3%.
- Gói Plus: seed đi qua checkout + giả webhook SePay nếu `.dev.vars` có `PLAN_RECEIVER_ACCOUNT` và `SEPAY_WEBHOOK_KEY`; không thì bỏ qua, `SEED_PLAN_SQL=1` để in lệnh D1.
