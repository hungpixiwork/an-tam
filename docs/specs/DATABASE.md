# Cơ sở dữ liệu (Cloudflare D1)

Schema nguồn: [`migrations/0001_init.sql`](../../migrations/0001_init.sql). Dữ liệu dùng chung: [`seed.sql`](../../seed.sql).

## Nguyên tắc
1. **Tiền = `INTEGER` VND.** Không dùng `REAL` cho tiền.
2. **Tháng = `TEXT 'YYYY-MM'`**, thời điểm = ISO-8601 UTC (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`).
3. Mọi bảng dữ liệu cá nhân có `user_id REFERENCES users(id) ON DELETE CASCADE` → xóa tài khoản xóa sạch dữ liệu (D1 bật foreign key mặc định).
4. **Không lưu chỉ số dẫn xuất** (điểm an tâm, xác suất đạt mục tiêu, số tiền cần để dành…). Engine tính khi đọc.
5. Ngoại lệ có chủ đích: `simulation_runs.result_json` lưu lại **ảnh chụp kết quả** tại thời điểm chạy để trang kết quả không đổi khi dữ liệu thay đổi.

## Sơ đồ quan hệ
```
users ─┬─< sessions
       ├── financial_profiles (1-1)
       ├── user_settings (1-1)
       ├─< holdings
       ├─< goals
       ├─< net_worth_snapshots (PK user_id + month)
       ├─< simulation_runs
       ├─< habit_answers >── habit_scenarios (dùng chung)
       ├─< safety_plans ─< plan_tasks
       ├─< ai_events
       └─< ai_alerts
simulation_presets, habit_scenarios, lessons — dữ liệu dùng chung (seed.sql)
```

## Bảng
| Bảng | Ý nghĩa | Ghi chú |
|---|---|---|
| `users` | tài khoản | `email` UNIQUE NOCASE; `salutation` ∈ anh/chị/bạn; `avatar_seed` sinh avatar pixel; `is_demo_data` |
| `sessions` | phiên đăng nhập | chỉ lưu `token_hash` (SHA-256), không lưu token gốc |
| `financial_profiles` | thu nhập, chi tiêu tháng, số tháng dự phòng mục tiêu, điểm rủi ro tự đánh giá | |
| `holdings` | các khoản tài sản | `category` cash/fund/stock/bond/other · `volatility` low/mid/high · `risk_group` · `is_main` |
| `net_worth_snapshots` | ảnh chụp cuối tháng | tháng hiện tại **không** lưu — tính sống từ `holdings` |
| `goals` | mục tiêu | `monthly_contribution` = số người dùng đang để dành / tháng |
| `simulation_presets` | kịch bản phổ biến | `params_json` = `SimulationParams` |
| `simulation_runs` | lịch sử chạy mô phỏng | `result_json` = `SimulationReport` |
| `habit_scenarios` / `habit_answers` | câu hỏi thói quen / câu trả lời | `options_json` = `[{key,label,risk 0..10}]`; 1 câu trả lời / câu hỏi |
| `safety_plans` / `plan_tasks` | kế hoạch đã áp dụng + việc cần làm | chỉ 1 plan `applied`; plan cũ → `archived` |
| `ai_events` | nhật ký "AI theo dõi" | type: alert/simulation/reminder/analysis |
| `ai_alerts` | cảnh báo | UNIQUE (user_id, rule_key) WHERE status='open'; đã xử lý thì không mở lại trong 7 ngày |
| `lessons` | bài học cộng đồng | kind: lesson/story/history |
| `user_settings` | quyền riêng tư + thông báo | boolean lưu 0/1 |

## Dữ liệu demo
Khi đăng ký, Worker nạp bộ dữ liệu demo từ [`shared/demo.ts`](../../shared/demo.ts) (hồ sơ "Nguyễn Văn Minh"):
- Thu nhập 80,5 tr · chi tiêu 22,5 tr · để dành cho mục tiêu 40 tr → **dòng tiền tự do +18 tr**.
- Tài sản 1,24 tỷ: Tiền mặt 174 · Quỹ mở 343 · Cổ phiếu 397 · Trái phiếu 223 · Khác 103 (triệu).
- 4 mục tiêu: Mua nhà 2 tỷ, Quỹ học cho con 500 tr, Nghỉ hưu 6 tỷ, Quỹ dự phòng 250 tr (hạn tính tương đối theo năm hiện tại).
- 11 snapshot tháng trước → +6% tài sản, +12% dự phòng, +8% đầu tư so với 3 tháng trước.
- 3 sự kiện AI mẫu + cảnh báo được engine tạo ngay khi đăng ký.
Kết quả engine trên bộ dữ liệu này: **điểm an tâm 82 "Ổn định"**, mua nhà 73%, gợi ý "chậm 8 tháng" khi thị trường giảm 20% (có test).

## Migration
```bash
npm run db:migrate          # local
npm run db:migrate:remote   # production
npm run db:seed             # dữ liệu dùng chung (idempotent)
npm run db:reset            # xóa D1 local, migrate + seed lại
```
Thay đổi schema = thêm file `migrations/000N_*.sql` mới, không sửa file cũ.
