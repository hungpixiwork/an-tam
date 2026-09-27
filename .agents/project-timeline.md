# Lịch dự án đến ngày nộp 20/10/2026

> File này là lịch làm việc từng tuần và các mốc khóa. Mỗi việc ghi rõ trang giao diện liên quan — xem chi tiết từng trang ở [codebase-audit.md](codebase-audit.md).
> Hạn nộp: **20/10/2026, 23:59 giờ Bắc Kinh**. Nhánh quốc tế, WeBank FinTechathon 2026.

## Điểm xuất phát (27/09)

Code đã có 15 trang, 15 nhóm API, 21 bảng dữ liệu, 15 module tính toán, **95/95 test chạy qua**. Vì vậy không làm lại từ Figma hay dữ liệu giả; 3 tuần dành cho: (1) bổ sung bằng chứng máy chấm cần, (2) AI hỏi–đáp, (3) 4 tính năng đột phá, (4) làm chắc luồng demo.

Phân vai: 1 dev viết toàn bộ code; cả team góp ý trải nghiệm, tâm lý tài chính, nghiệp vụ, pitch và demo.

## Các mốc khóa

| Mốc | Ngày | Xong khi |
|---|:-:|---|
| Khóa đặc tả | 29/09 | Cả team đọc và đồng ý [ba.md](specs/ba.md), [breakthroughs.md](specs/breakthroughs.md), [llm-strategy.md](specs/llm-strategy.md) |
| Nền bằng chứng | 03/10 | Có `/api/health`, `/api/openapi.json`, nhật ký kiểm toán, mã chống trùng, CI, LICENSE |
| Khóa AI | 10/10 | "Hỏi An Tâm" chạy thật; bước xác nhận; Runway mới; B1, B2, lõi B4 chạy thật |
| Khóa tính năng | 16/10 | Luồng demo chạy thật từ đầu đến cuối; không thêm tính năng sau mốc này |
| Khóa phát hành | 19/10 | Gắn tag `v1.0.0-rc`, dữ liệu demo, video dự phòng, README, slide |
| **Nộp bài** | **20/10** | Nộp trên cổng nhánh quốc tế |

## Tuần 0 — Khóa đặc tả (27/09 – 29/09)

- [x] Đối chiếu tuyên bố với code — [judge-review.md](judge-review.md)
- [x] Chốt khẩu hiệu, Thang 5 bậc, 4 tính năng đột phá
- [x] Chốt cách dùng LLM: mô hình mã nguồn mở trên Cloudflare, AI không thấy con số, có chế độ chạy tại chỗ
- [ ] Cả team đọc và đồng ý spec; hỏi ý kiến mentor để kiểm chứng các kết luận ở [judge-review.md](judge-review.md)

## Tuần 1 — Nền bằng chứng (30/09 – 03/10)

| Việc | Trang liên quan |
|---|---|
| `GET /api/health` (ping D1), `GET /api/openapi.json` (sinh từ Zod) | — |
| `migrations/0008_agent_audit.sql`: `audit_log` (chặn sửa/xóa), `idempotency_keys`, `agent_runs`, `agent_steps`, `agent_actions`, cột `sector` | — |
| Mã chống trùng cho `POST /api/plans/apply` và các bước xác nhận | Kế hoạch an toàn |
| Ghi nhật ký cho mọi thay đổi thu chi, tài sản, mục tiêu, kế hoạch | Sổ thu chi, Danh mục, Mục tiêu, Kế hoạch |
| Tab "Nhật ký kiểm toán" | AI theo dõi |
| CI GitHub Actions, `.dev.vars.example`, `LICENSE` | — |
| Test: chống trùng, nhật ký không sửa được | — |

## Tuần 2 — AI và 4 đột phá (04/10 – 10/10)

| Ngày | Việc | Trang liên quan |
|:-:|---|---|
| 04–05/10 | `shared/agent/`: che số, phân loại câu hỏi (Zod), lập kế hoạch, danh sách hàm; 3 cách chạy (Workers AI / Ollama / từ khóa) | Hỏi An Tâm (mới) |
| 05/10 | Runway mới: bỏ hằng số ẩn, trừ hao theo loại tài sản, P10/P50/P90 | Mô phỏng, Tổng quan |
| 06–07/10 | **B4 lõi:** chỉ số tập trung, `whatIfAllocate`, đánh dấu cổ phiếu thưởng | Danh mục |
| 08/10 | **B2 lõi:** vốn con người với bảng ILO; cột mã nghề, năm sinh, tuổi nghỉ hưu | Tăng thu nhập, Khởi đầu |
| 09–10/10 | **B1 lõi:** `study`, `care`, `startup`; kết luận + điều kiện; số tháng tự do | Lựa chọn cuộc đời (mới), Tổng quan |
| 10/10 | API "Hỏi An Tâm", xem các bước, xác nhận/từ chối | Hỏi An Tâm (mới) |
| 10/10 | So sánh Qwen3-30B và DeepSeek V4 Flash trên 50 câu mẫu | — |

## Tuần 3 — Làm chắc và phát hành (11/10 – 19/10)

| Ngày | Việc |
|:-:|---|
| 11–13/10 | Test hợp đồng mọi route (không 500), test đầu vào xấu, giới hạn số lần gọi, độ phủ engine ≥ 80% |
| 11–14/10 | Đột phá P1–P3, **cắt từ dưới lên nếu trễ**: B3 khoảng cách hành vi (12/10) → kịch bản khủng hoảng + Student-t, giờ học thành giá trị (13/10) → tự tính lại khi đổi việc, `switch`/`sabbatical` (14/10) |
| 14–16/10 | Chạy thật luồng demo; thử theo 4 vai: người dùng thường, kiểm toán viên, kẻ tấn công AI, mạng chậm; kiểm 6 trạng thái và màn 320px bằng Playwright → **khóa tính năng** |
| 17–18/10 | `seeds/demo-user.sql` (nhân vật Linh), `npm run setup`, README cuối, đo độ trễ |
| 19/10 | Gắn tag `v1.0.0-rc`, triển khai, quay video 1080p, hoàn thiện slide → **khóa phát hành** |
| **20/10** | **Nộp bài** |

## Sau khi nộp

| Thời gian | Việc |
|---|---|
| 21–22/10 | Rà soát tuân thủ — giữ hệ thống chạy 24/7, theo dõi `/api/health` |
| 23–28/10 | Chấm online — ôn Q&A theo [judge-review.md](judge-review.md) §5 |
| 31/10 | Công bố danh sách vào chung kết, thư mời visa |
| 01–19/11 | Nếu vào chung kết: thử với 10–20 người dùng thật; hiệu chỉnh bảng nghề–ngành; tăng cường bảo vệ AI |
| 20/11 | Có mặt tại Thâm Quyến |
| 21–23/11 | **Chung kết: 48 giờ tối ưu sản phẩm và thuyết trình** |

Nguồn lịch chính thức: [IEEE CIS Shenzhen](https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/).
