# Chiến lược AI (LLM) và bảo vệ dữ liệu

> File này chốt: dùng mô hình ngôn ngữ nào, gửi gì cho nó, chặn tấn công ra sao, lỗi thì xử lý thế nào. Dev đọc để code phần "Hỏi An Tâm".
> Trạng thái 📐 — code trong tuần 04/10–10/10 ([project-timeline.md](../project-timeline.md)).

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
[3] Lập kế hoạch (code)      → [đọc hồ sơ, tính khả năng đạt mục tiêu, thử mất việc, tính runway]
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

## 8. Nguồn

- Cloudflare — [Your Data and Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- Cloudflare — [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- Cloudflare — [Workers AI Changelog](https://developers.cloudflare.com/changelog/product/workers-ai/)
- Cloudflare — [Responsible AI](https://www.cloudflare.com/trust-hub/responsible-ai/)
- DeepSeek — [Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)
- Meetily — [DeepSeek API Data Retention Policy 2026](https://meetily.ai/llm-privacy/deepseek) (phân tích độc lập)
