# Chiến lược AI (LLM) và bảo vệ dữ liệu

> File này chốt: dùng mô hình ngôn ngữ nào, gửi gì cho nó, chặn tấn công ra sao, lỗi thì xử lý thế nào, và AI Workspace đa agent + MCP server chạy ra sao. Dev đọc để code phần AI (trước đây gọi là "Hỏi An Tâm", nay là màn **AI Workspace** `/ai-workspace`).
> Trạng thái 📐 — AI Workspace code ở Wave 3 (08/10–12/10), MCP server ở Wave 4 (13/10–14/10) ([project-timeline.md](../project-timeline.md)).

## 1. Nguyên tắc

**AI hiểu câu hỏi, code tính con số.** LLM chỉ làm một việc: đọc câu hỏi tự nhiên (đã che hết con số) và trả về loại câu hỏi. Mọi phép tính, kế hoạch, giải thích, quyền hạn đều do code.

## 2. Chọn mô hình

Yêu cầu: (1) cam kết bằng văn bản không dùng dữ liệu để huấn luyện; (2) dữ liệu không rời hạ tầng đang dùng (Cloudflare); (3) mô hình mã nguồn mở, chạy được tại chỗ cho ngân hàng; (4) giỏi tiếng Việt, Trung, Anh; (5) trả JSON đúng khuôn; (6) rẻ.

| Phương án | Kết luận | Lý do |
|---|---|---|
| **Cloudflare Workers AI + mô hình mã nguồn mở** | ✅ **Dùng chính** | Chạy ngay trong Worker (`env.AI`), cùng nhà cung cấp hạ tầng, cam kết không huấn luyện trên dữ liệu khách hàng |
| **Chạy tại máy / tại ngân hàng** (Ollama + Qwen3 8B) | ✅ **Chế độ an toàn tối đa** | Dữ liệu không rời máy; đổi bằng một biến môi trường |
| API trực tiếp của DeepSeek | ❌ Không dùng | Chính sách riêng tư 2026 có điều khoản dùng dữ liệu để huấn luyện; dữ liệu lưu tại Trung Quốc đại lục; thêm một bên xử lý dữ liệu |
| API đóng (Claude, GPT) | ❌ Không dùng (quyết định của team) | Muốn chủ quyền dữ liệu và chạy được tại chỗ. *Lưu ý khi bị hỏi: điều khoản API thương mại của các bên này mặc định cũng không huấn luyện trên dữ liệu API.* |

Vẫn dùng được mô hình DeepSeek, nhưng chạy qua Workers AI thay vì API của DeepSeek.

**Cam kết của Cloudflare (trích nguyên văn):**
> *"Cloudflare does not use your Customer Content to (1) train any AI models made available on Workers AI or (2) improve any Cloudflare or third-party services, and would not do so unless we received your explicit consent."*

**Giá tham khảo trên Workers AI (tra ngày 27/09/2026):**

| Mô hình | Vào / 1 triệu token | Ra / 1 triệu token | Vai trò |
|---|:-:|:-:|---|
| Qwen3-30B | $0.051 | $0.335 | Mặc định |
| Gemma 4 26B | $0.100 | $0.300 | Dự phòng |
| DeepSeek V4 Flash | $0.440 | $1.320 | Tùy chọn chất lượng cao |

Mỗi câu hỏi khoảng 400 token vào + 80 token ra → Qwen3-30B khoảng **$47 cho 1 triệu câu hỏi**. Miễn phí 10.000 Neurons/ngày.

Trước 16/10: chạy 50 câu hỏi mẫu có đáp án (tiếng Việt, Trung, Anh, gồm cả câu lừa) qua Qwen3-30B và DeepSeek V4 Flash; chọn mô hình đúng nhiều hơn. Lưu kết quả ở `tests/fixtures/intent-benchmark.json` làm bằng chứng.

## 3. Luồng xử lý: LLM không bao giờ thấy con số

```text
"Tôi có 300 triệu, muốn mua nhà sau 3 năm, lỡ mất việc thì sao?"
   │
[1] Che số (code)            → "Tôi có <AMT_1>, muốn mua nhà sau <DUR_1>, lỡ mất việc thì sao?"
    shared/agent/sanitize.ts    số thật giữ riêng: AMT_1 = 300.000.000, DUR_1 = 36 tháng
                                xóa email, số điện thoại, số tài khoản
   │
[2] Phân loại câu hỏi (LLM)  → { intents: ["goal_feasibility","stress_test"], goalKind: "home",
    shared/agent/intent.ts      amountRef: "AMT_1", horizonRef: "DUR_1", shock: "job_loss" }
    quá 3 giây / sai khuôn / có chữ số → bỏ, dùng [2b] phân loại bằng từ khóa
   │
[3] Lập kế hoạch (code)      → [đọc hồ sơ, tính khả năng đạt mục tiêu, thử mất việc, tính số tháng an toàn]
    shared/agent/planner.ts
   │
[4] Chạy hàm tính (code)     → shared/engine/*; chỉ có hàm đọc và hàm đề xuất, không có hàm ghi
    shared/agent/tools.ts
   │
[5] Giải thích (code)        → shared/engine/narrate.ts
   │
[6] Hành động đề xuất        → chờ người dùng xác nhận (kèm mã chống trùng), ghi nhật ký
```

## 4. Khuôn trả về của LLM

```ts
export const IntentSchema = z.object({
  intents: z.array(z.enum([
    'stress_test', 'goal_feasibility', 'career_overlap', 'budget_check',
    'explain_score', 'income_growth', 'life_decision', 'what_if_allocate',
    'ticker_request', 'out_of_scope',
  ])).min(1).max(3),
  goalKind: z.enum(['home', 'emergency', 'education', 'retirement', 'other']).optional(),
  shock: z.enum(['job_loss', 'market_drop', 'income_cut', 'surprise_cost']).optional(),
  lifeOption: z.enum(['study', 'care', 'startup', 'switch', 'sabbatical']).optional(),
  sector: z.enum(['tech', 'finance', 'real_estate', 'manufacturing', 'consumer',
    'healthcare', 'public_education', 'other']).optional(),
  amountRef: z.string().regex(/^AMT_\d+$/).optional(),
  horizonRef: z.string().regex(/^DUR_\d+$/).optional(),
}).strict();
```
- `life_decision` → chạy B1 kèm B2 và B4; `what_if_allocate` → chạy B4 ([breakthroughs.md](breakthroughs.md)).
- `ticker_request` → trả lời mẫu: *"An Tâm không gợi ý mã chứng khoán cụ thể; chúng tôi giúp bạn đo mức tập trung rủi ro theo nhóm tài sản."*
- `out_of_scope` → không gọi hàm nào, gợi ý 3 câu hỏi mẫu.

## 5. Vì sao khó bị tấn công

| Lớp bảo vệ | Cách làm | Chặn được |
|---|---|---|
| Đầu vào LLM | Chỉ câu hỏi hiện tại, đã che số và thông tin cá nhân | Lệnh độc giấu trong ghi chú giao dịch / tên mục tiêu; lộ dữ liệu |
| Đầu ra LLM | Khuôn đóng, danh sách giá trị cố định, cấm chữ số | Bịa số, chèn lệnh vào kết quả |
| Quyền hạn | Không tồn tại hàm ghi | "Chuyển tiền", "xóa dữ liệu", "tự duyệt" |
| Con người | Xác nhận + mã chống trùng + nhật ký | Gửi lại, bấm đúp, chối trách nhiệm |

An toàn đến từ **cách thiết kế**, không phụ thuộc vào việc lọc từ khóa — nên lệnh ẩn bằng tiếng Trung hay tiếng Anh trong câu tiếng Việt cũng không có tác dụng.

## 6. Khi có sự cố

| Tình huống | Hệ thống làm | Người dùng thấy |
|---|---|---|
| LLM trả đúng trong 3 giây | Dùng kết quả LLM | Bình thường |
| Quá 3 giây / lỗi mạng / hết hạn mức | Phân loại bằng từ khóa | Bình thường + dòng nhỏ "Chế độ phân tích cơ bản" |
| Sai khuôn / có chữ số | Bỏ kết quả, ghi cảnh báo, dùng từ khóa | Như trên |
| Không hiểu câu hỏi | `out_of_scope` | 3 câu hỏi mẫu |

Không bao giờ trả lỗi 500. Không lưu câu hỏi gốc: `agent_steps` chỉ lưu câu đã che số, kết quả phân loại, tên hàm đã gọi và số do engine tính, thời gian xử lý, tên mô hình.

## 7. Chạy tại chỗ (cho ngân hàng muốn dữ liệu không rời máy chủ của họ)

- Một giao diện chung `IntentParser` với 3 cách chạy: `WorkersAIParser`, `OllamaParser` (gọi `http://localhost:11434/api/chat`, `format: "json"`), `RuleParser` (từ khóa).
- Chọn bằng biến môi trường `INTENT_PROVIDER = workers-ai | ollama | rules`. Phần còn lại không đổi.
- Mô hình gợi ý: Qwen3 8B hoặc Gemma 4 bản nhỏ, chạy được trên laptop 16GB RAM.
- Giới hạn: bản triển khai trên Cloudflare không gọi được `localhost`; chế độ này dùng khi chạy `wrangler dev` hoặc khi ngân hàng tự cài engine.

## 8. AI Workspace đa agent 📐 — Wave 3 (08/10–12/10)

Quyết định giữ nguyên: **Workers AI (Qwen3-30B)**, LLM chỉ phân loại ý định và lập kế hoạch trên dữ liệu đã che số; mọi con số do engine tính; LLM lỗi thì rơi về từ khóa/mẫu (`shared/engine/narrate.ts`). "Đa agent" là **vai trò do planner (code) phân bước**, không phải 5 LLM tự do nói chuyện với nhau.

| Agent | Phụ trách | Tool engine (chỉ đọc) | Hành động có thể đề xuất (phân công dự kiến, chốt khi code Wave 3) |
|---|---|---|---|
| **Planner** | Nhận lệnh, chia bước cho các agent còn lại | `shared/agent/planner.ts` | — |
| **Calendar** | Khung trống, sắp lịch tuần | `scheduler.ts` (`freeSlots`, `autoSchedule`) | Tạo sự kiện trong lịch phụ "An Tâm", gửi email xác nhận (Gmail) |
| **Cashflow** | Ngân sách, hóa đơn, dòng tiền | `budget.ts`, `bills.ts`, `spending.ts` | Cập nhật Sheet "An Tâm – Ngân sách", nhắc hóa đơn |
| **Skill** | Kế hoạch học, cơ hội thu nhập | `humanCapital.ts`, `earn.ts` | Chặn giờ học, ghi Notion |
| **Goal** | Mục tiêu, quỹ an toàn, lựa chọn cuộc đời | `safety.ts`, `goals.ts`, `lifeChoice.ts` | Cập nhật mục tiêu, báo cáo tổng kết |

```text
Lệnh tự nhiên (POST /api/agent/runs) | lời gọi MCP | cron automation
   → agent_runs (running)
[1] Che số & PII             shared/agent/sanitize.ts
[2] Ý định                   shared/agent/intent.ts (zod) — WorkersAIParser, quá 3 giây → RuleParser
[3] Planner sinh các bước    shared/agent/planner.ts   → mỗi bước ghi agent_steps
[4] Tool engine chỉ đọc      shared/agent/tools.ts → shared/engine/*
[5] Đề xuất hành động        shared/agent/actions.ts (ACTION_TYPES: payloadSchema, preview, risk, integration)
                             kiểm payload, tạo preview trước/sau → agent_actions (pending, hết hạn 24h)
   → agent_runs (awaiting_approval) + audit
[6] Người dùng duyệt         POST /api/agent/actions/:id/approve + Idempotency-Key
                             UPDATE … WHERE status='pending' (không đổi dòng nào → 409), batch chung với audit
[7] Executor                 worker/agents/executor.ts: executing → lấy token → Google/Notion/nội bộ
                             sự kiện lịch ghi calendar_events kèm action_id, google_event_id
[8] Kết quả                  done + audit + afterChange() | failed + audit + hoàn tác phần ghi nội bộ
```

- **Từ chối / Yêu cầu điều chỉnh:** ghi audit; yêu cầu điều chỉnh thì chạy lại planner kèm ghi chú.
- **Tự duyệt:** chỉ hành động nội bộ rủi ro thấp mà quy tắc automation có `requires_approval=0` (approver = `auto`), vẫn ghi audit.
- **Giao diện:** 5 agent card, ô ra lệnh, timeline (poll `GET /api/agent/runs/:id`), kế hoạch tuần, công cụ & MCP, danh sách chờ phê duyệt — [redesign-ui.md](redesign-ui.md) §4.8.
- **File worker:** `worker/agents/{llm,runner,executor}.ts` (`WorkersAIParser` timeout 3s → rules, `runAgent`, `executeAction`); binding `ai: {binding: "AI"}`, biến `INTENT_PROVIDER` (mục 7).
- **Test:** prompt gửi tới LLM không chứa số tiền; duyệt 2 lần chỉ thực thi 1 lần; audit append-only.

## 9. An Tâm MCP server 📐 — Wave 4 (13/10–14/10)

An Tâm tự làm **một remote MCP server** trên chính Worker để "thân thiện với AI": cùng một URL `/mcp` dùng được cho Claude (Custom Connector, kèm plugin Claude Code `.claude-plugin/plugin.json` + `.mcp.json`), ChatGPT (Apps/Connectors ở developer mode), Gemini CLI (`settings.json` mcpServers).

- Cloudflare Agents SDK `createMcpHandler` + `@cloudflare/workers-oauth-provider` (KV `OAUTH_KV`), đăng nhập bằng phiên An Tâm. Route `/mcp`, `/oauth/*`, `/.well-known/*` chạy worker trước (`run_worker_first`).
- **Tool đọc** (chạy trực tiếp): `get_overview`, `get_ledger`, `get_goals`, `get_calendar_week`, `evaluate_life_choice`, `what_if_allocate`, `list_pending_actions`.
- **Tool ghi:** **chỉ có `propose_action`** → tạo bản ghi `pending` với source `mcp`. **Không có tool approve** — không agent ngoài nào tự ý thay đổi dữ liệu; người dùng vẫn duyệt trong An Tâm.
- *Lưu ý khi pitch:* vì agent ngoài (Claude/ChatGPT/Gemini) là LLM của bên thứ ba do **người dùng tự chọn kết nối**, dữ liệu trả qua MCP là dữ liệu người dùng chủ động chia sẻ với trợ lý của họ; LLM của chính An Tâm vẫn theo nguyên tắc ở mục 1–2.
- **Test:** tool ghi chỉ tạo pending.
- Nếu trễ: cắt MCP cho Gemini/ChatGPT trước, giữ Claude.

## 10. Nguồn

- Cloudflare — [Your Data and Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- Cloudflare — [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- Cloudflare — [Workers AI Changelog](https://developers.cloudflare.com/changelog/product/workers-ai/)
- Cloudflare — [Responsible AI](https://www.cloudflare.com/trust-hub/responsible-ai/)
- DeepSeek — [Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)
- Meetily — [DeepSeek API Data Retention Policy 2026](https://meetily.ai/llm-privacy/deepseek) (phân tích độc lập)
