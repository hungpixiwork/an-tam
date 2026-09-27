# Thang điểm tự chấm, checklist chấm máy và bộ test

> Team dùng file này để tự chấm bài mỗi ngày trước 20/10: mỗi nhóm điểm cần bằng chứng gì, máy chấm sẽ quét gì, cần viết những test nào để không bao giờ lỗi 500.
> Cuộc thi chưa công bố trọng số chi tiết. Thang 100 dưới đây là **chuẩn nội bộ**, xây từ các tiêu chí WeBank đã công bố.

## 1. Thang 100 điểm

| Nhóm | Điểm | Giám khảo muốn thấy | An Tâm trả lời bằng |
|---|:-:|---|---|
| Vấn đề thật | 15 | Nỗi đau có số liệu, người dùng rõ, tác động tài chính | [ba.md](specs/ba.md) §1, §3 |
| Đổi mới | 15 | Khác biệt, cách làm mới, vì sao là lúc này, vì sao công cụ cũ không làm được | Mục 2 bên dưới |
| **AI tham gia tài chính** | **20** | Hiểu ý định → lập kế hoạch → lập luận tài chính → gọi công cụ → kiểm tra quyền → xác nhận → giải thích | [ba.md](specs/ba.md) §4, [llm-strategy.md](specs/llm-strategy.md) |
| **Kỹ thuật** | **15** | Kiến trúc, backend, database, API, độ ổn định, test | Mục 3, 4, 5 |
| Bảo mật tài chính | 10 | Kiểm soát quyền, chống ảo giác, chống tiêm lệnh, nhật ký kiểm toán, an toàn giao dịch | [judge-review.md](judge-review.md) §4 |
| Sản phẩm | 10 | Dễ hiểu, luồng demo mượt, dùng được thật, đủ trạng thái | [codebase-audit.md](codebase-audit.md) |
| Kinh doanh | 10 | Ai trả tiền, chi phí, cách đi thị trường, mở rộng | [ba.md](specs/ba.md) §12 |
| Demo | 5 | Câu chuyện con người, demo trực tiếp, bằng chứng, Q&A | [ba.md](specs/ba.md) §13, [judge-review.md](judge-review.md) §5 |

Hai nhóm in đậm là nơi phải thắng. Nhóm "AI tham gia tài chính" không chấp nhận một lớp vỏ bọc quanh LLM: phải thấy được từng bước, và con người luôn là người duyệt cuối.

## 2. Nhóm "Đổi mới" (15 điểm) — trả lời bằng gì

| Tiêu chí | Bằng chứng | Trạng thái |
|---|---|:-:|
| Khác biệt | Tính cả tiền lẫn nghề trong một bảng; khẩu hiệu *"Trước mỗi quyết định lớn, biết chắc mình có kham nổi không"* | 📐 |
| Cách làm mới | Hỏi về một quyết định cuộc đời → engine trả lời kham nổi hay không, cần điều kiện gì → người dùng xác nhận hành động (B1) | 📐 10/10 |
| Vì sao là lúc này | AI tạo sinh đang thay đổi giá trị của nghề — dữ liệu ILO 2025 (B2) | 📐 08/10 |
| Vì sao công cụ cũ không làm được | Robo-advisor bỏ qua nghề và phản ứng cảm xúc; app chi tiêu chỉ nhìn quá khứ (B3, B4) | 📐 07–13/10 |

Chi tiết: [breakthroughs.md](specs/breakthroughs.md).

## 3. Điều kiện "xong" trước 20/10

Trạng thái ngày 27/09/2026. Chỉ đánh dấu [x] khi chỉ ra được file.

- [x] Triển khai trên Cloudflare Workers — `wrangler.jsonc`
- [x] Frontend thật: React 19, TypeScript, Vite — `client/src/` *(còn phải kiểm tra ở màn hình 320px)*
- [x] Backend thật: Worker, Hono, Zod — `worker/index.ts`, `worker/routes/*`
- [x] Database thật: Cloudflare D1 — `migrations/0001`–`0007`
- [x] Lỗi trả về JSON có cấu trúc — `app.onError` trong `worker/index.ts`
- [x] Unit test: 95/95 chạy qua, 13 file — `tests/`
- [ ] AI hiểu câu hỏi (hiện mới có quy tắc) — hạn 10/10
- [ ] Một luồng tài chính hoàn chỉnh có bước xác nhận và mã chống trùng — hạn 10/10
- [ ] Nhật ký kiểm toán không sửa được — hạn 03/10
- [ ] Tài khoản demo và dữ liệu mẫu tái lập được — hạn 17/10
- [ ] Test hợp đồng cho mọi route và test đầu-cuối luồng demo — hạn 16/10

## 4. Máy chấm tự động thường quét gì

Cuộc thi chưa công bố chi tiết máy chấm; đây là mức tối thiểu theo thông lệ chấm repository và API.

| # | Tiêu chí | Ở đâu | Trạng thái | Hạn |
|:-:|---|---|:-:|:-:|
| 1 | README chạy lại được bằng lệnh | `README.md`, `npm run setup` | 🟡 | 17/10 |
| 2 | Kiểm tra sống, có ping database | `GET /api/health` | 🔴 | 03/10 |
| 3 | Mô tả API máy đọc được | `GET /api/openapi.json` | 🔴 | 03/10 |
| 4 | Dữ liệu mẫu và tài khoản demo | `seeds/demo-user.sql` | 🟡 | 17/10 |
| 5 | File mẫu biến môi trường | `.dev.vars.example` | 🔴 | 03/10 |
| 6 | Kiểm tra kiểu, test, độ phủ | `npm run typecheck`, `npm test`, `vitest --coverage` | 🟡 | 13/10 |
| 7 | CI tự động | `.github/workflows/ci.yml` | 🔴 | 03/10 |
| 8 | Lỗi không lộ stack trace | `worker/index.ts` | 🟢 | — |
| 9 | Không lỗi 500 với đầu vào xấu | `tests/contract.test.ts`, `tests/fuzz.test.ts` | 🔴 | 13/10 |
| 10 | Giới hạn số lần gọi (đăng nhập, AI) | Cloudflare Rate Limiting | 🔴 | 13/10 |
| 11 | Không lộ bí mật | `.gitignore`, rà lịch sử commit | 🟢 | — |
| 12 | Giấy phép | `LICENSE` (MIT) | 🔴 | 03/10 |

## 5. Bộ test cần viết (theo thứ tự ưu tiên)

1. **Hợp đồng mọi route:** không đăng nhập → 401; dữ liệu sai → 400; id không có hoặc của người khác → 404. **Không route nào trả 500.** Sinh tự động từ danh sách route.
2. **Đầu vào xấu:** `null`, mảng rỗng, chuỗi 10.000 ký tự, số âm, `1e308`, ký tự Unicode lạ vào mọi POST/PUT/PATCH.
3. **Tính chất engine:** với đầu vào ngẫu nhiên hợp lệ — số tháng trụ được ≥ 0; điểm trong [0, 100]; cùng đầu vào cùng kết quả; không ra `NaN`/`Infinity`.
4. **Chống trùng:** gửi cùng mã hai lần cùng lúc → chỉ một bản ghi.
5. **AI:** bộ câu lừa tiếng Việt/Trung/Anh; LLM chậm → chuyển sang từ khóa; sai khuôn → bị loại.
6. **Nhật ký:** mỗi lần xác nhận sinh đúng một dòng; sửa/xóa bị chặn.
7. **Đầu-cuối luồng demo** (Playwright): đăng ký → khởi đầu → hỏi → xác nhận → xem nhật ký.
8. **4 tính năng đột phá:** test riêng từng cái, liệt kê ở [breakthroughs.md](specs/breakthroughs.md).

## 6. Nguồn chính thức

- [Chứng khoán Thời báo (STCN)](https://www.stcn.com/article/detail/4168818.html): nhánh quốc tế 2026 dùng chung bộ tiêu chuẩn năng lực và các chiều chấm điểm cho cả 6 chủ đề.
- [Peoplecen — WeBank](https://www.peoplecen.com/html/2026/jinr_0915/28806.html): AI as a Financial Participant; kiểm soát quyền, chống ảo giác, chống tiêm lệnh; chấm máy + chuyên gia chấm ẩn danh; chung kết 48 giờ tại Thâm Quyến.
- [IEEE CIS Shenzhen](https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/): mở đăng ký 31/8, hạn nộp 20/10/2026, rà soát 21–22/10, chấm online 23–28/10, công bố vào chung kết 31/10, chung kết 21–23/11/2026.
