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
| **Hưng** — Dev chính, tích hợp sản phẩm | `hungpixi` | Frontend, API, database, AI, CI/CD; review code và merge PR của Uyên |
| **Uyên** — Engine đầu tư và chuyên môn tài chính | `HoangHaUyen` | Thiết kế công thức, trực tiếp làm engine đầu tư/mô phỏng và test; xác nhận nguồn dữ liệu, phép tính, kết luận tư vấn. Có thể đề xuất thay đổi trải nghiệm trong issue; Hưng tích hợp UI |

**Quy tắc code cùng nhau:**
- Mỗi issue của Uyên dùng một branch và một PR. Uyên làm và xác nhận engine/tính đúng tài chính; Hưng review code, tích hợp API/DB/UI và merge. Mockup chỉ là ví dụ; Uyên được đề xuất đổi chỉ số, kết quả mô phỏng, câu chữ và tương tác trong issue để Hưng tích hợp. Uyên có thể bắt đầu engine/test khi UI còn đang hoàn thiện.
- PR của Uyên chỉ sửa `shared/data`, `shared/engine`, `tests`, `.agents/tasks` và `docs/finance`; không sửa `client`, route, bố cục hoặc design spec. Mỗi issue ghi đầu vào mẫu, kết quả hiện tại, kết quả đúng kèm phép tính, nguồn và ngày tham khảo, trường hợp thiếu dữ liệu, tiêu chí nghiệm thu. Không đưa hồ sơ tài chính thật lên GitHub.
- Team áp dụng quy trình PR + review trước khi merge. Repo private trên tài khoản cá nhân hiện không bật được branch protection/rulesets; CI và approval chưa thể cưỡng chế trên `main`. Người có quyền `write` vẫn có thể push/merge trực tiếp, nên Hưng giữ trách nhiệm merge theo quy trình team.
- Branch naming: `feat/ten-feature`, `fix/ten-bug`, `ui/ten-trang`, `data/ten-issue`.
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
