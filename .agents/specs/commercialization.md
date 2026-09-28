# An Tâm AI — Thương mại hóa / Commercialization

> Cập nhật 28/09/2026. Song ngữ Việt – Anh (nhánh quốc tế của cuộc thi dùng tiếng Anh).
> Updated 28 Sep 2026. Bilingual: the competition's international track is judged in English.

---

## 1. Định vị / Positioning

**VI.** An Tâm không bắt người dùng ghi chép và không bán sản phẩm tài chính. An Tâm trả lời một câu hỏi: *"Quyết định lớn này — nghỉ việc đi học, du học, khởi nghiệp — tôi có kham nổi không? Mục tiêu nào bị lùi? Cần để dành thêm bao nhiêu?"* Thu chi, quỹ dự phòng, nghề nghiệp và tài sản đều là **đầu vào** cho câu trả lời đó.

**EN.** An Tâm does not ask users to log every expense and does not sell financial products. It answers one question: *"Can I afford this big decision (quitting to study, studying abroad, starting a business)? Which goals get delayed? How much more do I need to save?"* Cash flow, safety fund, career and assets are all **inputs** to that answer.

- **Người dùng / Users:** 20–35 tuổi, có mục tiêu học vấn và nghề nghiệp cao, nhiều mục tiêu cùng lúc, không muốn trả tiền cho chuyên gia tư vấn. / Aged 20–35 with high study and career goals, juggling several goals at once, unwilling to pay for a financial adviser.
- **Khác biệt / Difference:** các app hiện có (kể cả các đội dự thi trước) chỉ ghi chép chi tiêu và gợi ý đầu tư. An Tâm đánh giá một *ngã rẽ cuộc đời* bằng dữ liệu thật của chính người dùng. / Existing apps, past competition entries included, log spending and suggest investments. An Tâm evaluates a *life decision* using the user's own real data.

## 2. Nguyên tắc kỹ thuật tạo niềm tin / Trust-by-design

| Nguyên tắc / Principle | Trong code / In code |
|---|---|
| AI hiểu câu hỏi, **code tính con số** / AI reads the question, **code computes every number** | `shared/engine/*` (pure functions); `worker/agents/llm.ts` only classifies intent and restates templates, and any change to the numbers is rejected |
| Che số trước khi gửi AI / Numbers are masked before reaching the AI | `shared/agent/sanitize.ts`: placeholders `AMT_n`, `DUR_n`, `PCT_n` |
| Con người duyệt mọi thao tác ghi / Humans approve every write | `agent_actions` stays `pending` until approved; MCP has **no** approve tool |
| Nhật ký không sửa được / Tamper-evident audit log | `audit_log` HMAC/SHA-256 hash chain; triggers block UPDATE/DELETE |
| Không khuyên mua mã cụ thể / Never recommends buying a ticker | `worker/desk/*` analyses only assets the user already holds (VN securities-advice licensing) |

**Đối chiếu Hướng dẫn an toàn AI ngân hàng – bảo hiểm của NFRA (金发〔2026〕8号) / Mapping to the NFRA banking & insurance AI safety guidance:**

| Yêu cầu / Requirement | An Tâm |
|---|---|
| Việc rủi ro cao: con người quyết định cuối / Human makes the final call on high-risk tasks | Hàng chờ duyệt, có `Idempotency-Key` / Approval queue with `Idempotency-Key` |
| Lưu dữ liệu gốc, đường lập luận, dấu vết người duyệt / Keep source data, reasoning path and approver trace | `agent_steps`, `desk_reports` (analysts → debate → verdict), `audit_log.approver` |
| Không dùng dữ liệu cá nhân nhạy cảm để huấn luyện / No sensitive personal data used for training | Mô hình mở trên Workers AI, chỉ suy luận; dữ liệu đã che số / Open models on Workers AI, inference only, masked input |

## 3. Kiến trúc mở rộng / Scalable architecture

- **Edge serverless:** Cloudflare Workers + D1. Chi phí gần như bằng 0 khi ít người dùng, và tăng theo số lượt dùng. / Near-zero cost at low usage; scales per request.
- **Queue fan-out:** cron chỉ đẩy việc; mỗi thông điệp xử lý 1 người (cập nhật, cảnh báo thị trường). / Cron only enqueues; each message handles one user (refresh, market alerts).
- **Bàn đầu tư theo mã, dùng chung / Per-symbol shared desk:** mỗi mã chạy 1 lần/ngày (Cloudflare Workflows), dùng cho mọi người giữ mã đó. **Chi phí AI tăng theo số mã, không theo số người.** Phần rủi ro theo từng người là code thuần. / Each symbol runs once a day (Cloudflare Workflows) and is shared by everyone holding it. **AI cost scales with the number of symbols, not users.** The per-user risk step is plain code.
- **Chi phí AI / AI cost:** khoảng 47 USD cho 1 triệu câu hỏi (Qwen3-30B trên Workers AI, 400 token vào / 80 token ra). / About USD 47 per 1M questions.
- **Giới hạn và hạn mức / Limits & quotas:** Workers Rate Limiting; bảng `ai_usage` theo ngày; hết lượt thì dùng chế độ phân tích cơ bản, không báo lỗi. / Daily `ai_usage` quota; when it runs out the app falls back to basic analysis, never errors.
- **Mở cho AI khác / Open to other AIs:** máy chủ MCP `/mcp` (OAuth). Claude, ChatGPT, Gemini đọc được dữ liệu và **đề xuất** việc, người dùng duyệt trong app. / MCP server at `/mcp` (OAuth). Claude, ChatGPT and Gemini can read data and **propose** actions; the user approves in the app.

## 4. Mô hình doanh thu / Revenue model

### 4.1 B2B2C với ngân hàng số (chính) / B2B2C with digital banks (primary)
- Ngân hàng nhúng An Tâm vào app hoặc mini program của họ, dưới thương hiệu và giấy phép của họ. / The bank embeds An Tâm in its own app or mini program, under its brand and licence.
- **Giá / Pricing:** phí triển khai một lần + phí theo **số người dùng hoạt động mỗi tháng**; có thể chạy mô hình mở ngay tại ngân hàng (on-prem). / One-off setup fee + fee per **monthly active user**; open models can run on the bank's own servers.
- **Giá trị cho ngân hàng / Value to the bank:** khách chuẩn bị tốt hơn cho quyết định lớn nên ít rủi ro nợ xấu; giữ chân khách trẻ; hiểu nhu cầu (du học, mua nhà) để tư vấn sản phẩm qua quy trình tuân thủ của chính ngân hàng. / Customers prepare better for big decisions, lowering bad-debt risk; young customers stay; the bank understands needs (study abroad, home buying) and offers products through its own compliance process.
- **Dữ liệu / Data:** ngân hàng cung cấp giao dịch và giá có giấy phép, nên An Tâm không phải tự làm bên thứ ba theo TT64/2024 của Việt Nam hay xin quyền dữ liệu ở Trung Quốc. / The bank supplies licensed transaction and price data, so An Tâm need not become a third party under Vietnam's Circular 64/2024 or seek data rights in China.

### 4.2 Người dùng lẻ (phụ) / Direct consumers (secondary)

| Gói / Plan | Giá / Price | Gồm / Includes |
|---|---|---|
| Miễn phí / Free | 0 | 10 lượt AI/ngày, 3 luật cảnh báo, xem kết luận của bàn đầu tư trong cảnh báo / 10 AI turns a day, 3 alert rules, desk verdict inside alerts |
| Plus | 49.000đ/tháng | 200 lượt/ngày, hỏi bàn đầu tư trực tiếp, luật cảnh báo không giới hạn, MCP, tự duyệt việc rủi ro thấp / 200 turns a day, ask the desk directly, unlimited alert rules, MCP, auto-approve low-risk tasks |
| Ngân hàng / Bank | Theo hợp đồng / Contract | Như Plus, hạn mức lớn / As Plus, higher limits |

- **Thanh toán / Payment:** VietQR + webhook SePay tự nâng gói khi nhận đúng mã `ANTAM…`. / VietQR; the SePay webhook upgrades the plan when the `ANTAM…` code arrives.
- **Giá vốn AI của một người Plus / AI cost per Plus user:** tối đa 200 × 30 = 6.000 lượt/tháng ≈ 0,28 USD (~7.000đ), thấp hơn nhiều so với 49.000đ. / At most 6,000 turns a month ≈ USD 0.28 (~7,000 VND), far below the price.

## 5. Nguồn dữ liệu / Data sources

| Loại / Type | Khi thi / Competition | Khi thương mại / Commercial |
|---|---|---|
| Cổ phiếu, chỉ số VN / VN stocks, index | Trang công khai SSI, VNDirect / Public SSI and VNDirect pages | FiinGroup, hợp đồng SSI/DNSE, hoặc ngân hàng đối tác / FiinGroup, SSI/DNSE contract, or the partner bank |
| Chứng chỉ quỹ / Fund NAV | fmarket (công khai) / fmarket (public) | Hợp tác công ty quỹ / Fund manager partnership |
| Vàng SJC / SJC gold | SJC, PNJ | Hợp đồng SJC/PNJ / SJC/PNJ contract |
| Vàng, bạc thế giới / World gold, silver | gold-api.com (được dùng thương mại / commercial use allowed) | như cũ / same |
| Tỷ giá / FX | Vietcombank, open.er-api | ExchangeRate-API Pro (10 USD/tháng / month) |
| Crypto | CoinGecko Demo | CoinGecko Basic (~35 USD/tháng / month) |

- Mọi nguồn khai báo ở **một chỗ** (`worker/market/chains.ts`), đổi nguồn chỉ cần sửa 1 dòng. Giá lấy mỗi giờ, chỉ lấy mã người dùng đang giữ, và không có API trả dữ liệu thô ra ngoài. / All sources are declared in **one place**; swapping one is a one-line change. Prices are fetched hourly, only for held symbols, and no raw-data passthrough API exists.
- **Câu nói với giám khảo / What we tell judges:** "Bản demo dùng dữ liệu tham khảo công khai, cập nhật mỗi giờ, không phải khuyến nghị đầu tư. Khi thương mại, An Tâm dùng nguồn có giấy phép hoặc dữ liệu do ngân hàng đối tác cung cấp." / "The demo uses public reference data refreshed hourly; it is not investment advice. Commercially, An Tâm uses licensed sources or data supplied by the partner bank."

## 6. Lộ trình / Roadmap (📐 = chưa làm / not built yet)

1. 📐 Mỗi người dùng một Agent (Durable Object) tự lên lịch, giữ trạng thái. / Per-user Agent (Durable Object) with its own schedule and state.
2. 📐 Chạy mô hình mở tại ngân hàng; dùng FATE-LLM để nhiều ngân hàng cùng chỉnh bảng nghề–ngành mà không chia sẻ dữ liệu. / Open models on the bank's servers; FATE-LLM so several banks can tune the job–sector table without sharing data.
3. 📐 Gắn engine vào mini program của ngân hàng đối tác (theo cách Weilidai nằm trong WeChat). **Hiện chưa tích hợp WeChat.** / Embed the engine in a partner bank's mini program, the way Weilidai lives inside WeChat. **No WeChat integration exists today.**
4. 📐 Nhập sao kê CSV/PDF và kết nối thêm ngân hàng qua SePay Bank Hub. / CSV/PDF statement import and more banks via SePay Bank Hub.
5. 📐 Kịch bản xuyên biên giới Việt – Trung (du học Thâm Quyến, tỷ giá CNY). Đường thanh toán QR NAPAS – Weixin Pay đã nối từ 08/2026. / Vietnam–China cross-border scenarios (studying in Shenzhen, CNY rates); the NAPAS–Weixin Pay QR link has been live since Aug 2026.

## 7. Không được nói / Do not claim

- Đã tích hợp WeChat, FATE hay FISCO BCOS. / That WeChat, FATE or FISCO BCOS are integrated.
- "Đã có ngân hàng sử dụng" khi chưa có thư xác nhận. / "A bank already uses it" without a signed letter.
- Các nguồn dữ liệu công khai là "đối tác dữ liệu". / That public data sources are "data partners".
