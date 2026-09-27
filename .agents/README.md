# Hồ sơ dự án An Tâm — WeBank FinTechathon 2026

> **Trước mỗi quyết định lớn, biết chắc mình có kham nổi không.**  
> *Know if you can afford your next big life decision — before you make it.*

An Tâm nhìn cùng lúc tiền bạn đang có, công việc đang nuôi bạn, và những kế hoạch lớn bạn muốn làm — rồi cho bạn biết kế hoạch nào an toàn, kế hoạch nào cần chuẩn bị thêm.

Thư mục này chứa toàn bộ tài liệu chuẩn bị nộp bài (hạn **20/10/2026**).

## Ref UI — nguồn sự thật về giao diện

File [ref-ui.pdf](ref-ui.pdf) chứa 9 trang mockup chuẩn. Mọi trang code phải khớp layout, sections và data flow trong file này. Bảng mapping chi tiết: [specs/redesign-ui.md](specs/redesign-ui.md).

## Kế hoạch redesign theo 9 mockup (duyệt 27/09/2026) 📐

Hướng làm: **tái cấu trúc giao diện, giữ engine/API đang chạy và mở rộng thêm**, không viết lại. Đặc tả từng màn (route, khối, endpoint, hàm engine): [specs/redesign-ui.md](specs/redesign-ui.md)

- **Giao diện:** sidebar 11 mục; 5 trang mới `/quy-an-toan`, `/lich-ai`, `/lua-chon`, `/ai-workspace`, `/nhat-ky-ai`; trang cũ gộp và redirect (`/muc-tieu`, `/ke-hoach` → `/quy-an-toan`; `/ai-theo-doi` → `/nhat-ky-ai`; `/thoi-quen` → tab trong Sổ thu chi).
- **Tích hợp thật:** Google Calendar/Gmail/Sheets (OAuth trực tiếp, app Google Cloud ở chế độ Testing), Notion, SePay + VietQR; An Tâm tự làm **remote MCP server** `/mcp` cho Claude/ChatGPT/Gemini — tool ghi chỉ tạo đề xuất chờ duyệt.
- **AI Workspace đa agent:** 5 agent (Planner/Calendar/Cashflow/Skill/Goal) trên Workers AI, dữ liệu đã che số; mọi hành động ghi ra ngoài qua phê duyệt + `Idempotency-Key` + `audit_log` append-only — [specs/llm-strategy.md](specs/llm-strategy.md) §8.
- **Backend:** migrations `0008`–`0014`; engine mới `budget`, `bills`, `split`, `safety`, `humanCapital` (B2), `concentration` (B4), `lifeChoice` (B1), `scheduler`, `automation`, `resources` — [specs/ba.md](specs/ba.md) §9–10.
- **Lịch:** Wave 0 (28–29/09) → Wave 5 khóa tính năng 16/10; việc thủ công (Google Cloud, Notion, SePay, Cloudflare) phải xong trước Wave 1 — [project-timeline.md](project-timeline.md).

## Team & phân vai

| Vai | GitHub | Nhiệm vụ chính |
|---|---|---|
| **Hung** — Dev chính, Backend & AI | `hungpixi` | Engine tính toán, API, AI agents (Cloudflare Agents SDK), MCP integrations, Google Calendar API, database, CI/CD |
| **Uyên** — Frontend & Domain Expert | `HoangHaUyen` | Giao diện React theo ref UI, responsive, i18n, logic tài chính, demo flow, pitch content. Background: Finance FTU (GPA 3.9), CFA L1, Python/SQL/Power BI |

**Quy tắc code cùng nhau:**
- Mọi thay đổi vào `main` phải qua Pull Request + 1 approval (trừ hungpixi bypass khi cần gấp).
- Branch naming: `feat/ten-feature`, `fix/ten-bug`, `ui/ten-trang`.
- Commit message tiếng Việt hoặc tiếng Anh đều được, miễn rõ ràng.

## Đọc theo thứ tự

| # | File | Dùng để | Ai đọc |
|:-:|---|---|---|
| 1 | [ref-ui.pdf](ref-ui.pdf) | 9 trang mockup chuẩn — nguồn sự thật UI | Cả team |
| 3 | [specs/redesign-ui.md](specs/redesign-ui.md) | Kế hoạch redesign: từng màn → route → endpoint → engine, shell, UI kit | Dev |
| 4 | [specs/ba.md](specs/ba.md) | Sản phẩm là gì, cho ai, chạy thế nào | Cả team |
| 5 | [specs/breakthroughs.md](specs/breakthroughs.md) | 4 tính năng đột phá và công thức | Dev |
| 6 | [specs/llm-strategy.md](specs/llm-strategy.md) | Dùng AI nào, dữ liệu an toàn ra sao, AI Workspace đa agent, MCP | Dev |
| 7 | [codebase-audit.md](codebase-audit.md) | Từng trang: có gì, thiếu gì, ai làm, hạn nào; mapping trang cũ → mới | Dev |
| 8 | [project-timeline.md](project-timeline.md) | Milestone, phân vai, Wave 0–5, việc thủ công | Cả team |
| 9 | [scoring-rubric.md](scoring-rubric.md) | Thang điểm, checklist chấm máy | Dev, trưởng nhóm |
| 10 | [judge-review.md](judge-review.md) | Giám khảo sẽ bắt lỗi gì, Q&A | Người pitch |
| 11 | [ideas.md](ideas.md) | Ý tưởng gốc và ý nào được dùng | Cả team |

## Quy ước chung

- ✅ **Đã có trong code**, luôn kèm đường dẫn file.
- 📐 **Đã chốt thiết kế, chưa code**, luôn kèm hạn.
- **ƯỚC TÍNH**: con số giả định của mô hình, người dùng thấy được và chỉnh được.
- Mỗi nội dung chỉ viết ở một file; file khác chỉ dẫn link tới.
- Không đưa vào hồ sơ nộp bất cứ điều gì chưa có trong code, trừ khi ghi rõ 📐 và hạn.
