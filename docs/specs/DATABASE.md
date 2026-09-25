# Cơ sở dữ liệu (Cloudflare D1)

Schema nguồn: [`migrations/`](../../migrations/) (`0001_init.sql`, `0002_real_data.sql`). Dữ liệu danh mục dùng chung: [`seeds/catalog.sql`](../../seeds/catalog.sql).

**Không có dữ liệu demo.** Tài khoản mới bắt đầu trống; người dùng tự nhập qua màn "Bắt đầu" (`/bat-dau`), Sổ thu chi, Danh mục, Mục tiêu. Seed chỉ chứa danh mục dùng chung (kịch bản mô phỏng, câu hỏi thói quen, bài học), không chứa dữ liệu cá nhân.

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
       ├─< transactions (sổ thu chi)
       ├─< net_worth_snapshots (PK user_id + month)
       ├─< simulation_runs
       ├─< habit_answers >── habit_scenarios (dùng chung)
       ├─< safety_plans ─< plan_tasks
       ├─< ai_events
       └─< ai_alerts
simulation_presets, habit_scenarios, lessons — dữ liệu dùng chung (seeds/catalog.sql)
```

## Bảng
| Bảng | Ý nghĩa | Ghi chú |
|---|---|---|
| `users` | tài khoản | `email` UNIQUE NOCASE; `salutation` ∈ anh/chị/bạn; `avatar_seed` sinh avatar pixel; `onboarded_at` NULL = chưa qua màn "Bắt đầu" |
| `sessions` | phiên đăng nhập | chỉ lưu `token_hash` (SHA-256), không lưu token gốc |
| `financial_profiles` | **số nền** thu nhập / chi tiêu tháng (người dùng ước lượng), số tháng dự phòng mục tiêu, điểm rủi ro tự đánh giá | tạo rỗng khi đăng ký; engine chỉ dùng số nền khi Sổ thu chi chưa có tháng trọn (xem ENGINE.md › Sổ thu chi) |
| `transactions` | sổ thu chi | `kind` income/expense · `amount` > 0 · `category` ∈ `TRANSACTION_CATEGORIES` · `occurred_on` `YYYY-MM-DD` |
| `holdings` | các khoản tài sản | `category` cash/fund/stock/bond/other · `volatility` low/mid/high · `role`, `risk_group` suy ra từ loại (`HOLDING_DEFAULTS`) |
| `net_worth_snapshots` | ảnh chụp tài sản theo tháng | tháng hiện tại được **ghi đè** mỗi lần người dùng sửa dữ liệu và mỗi ngày (cron); sang tháng mới, dòng tháng trước thành số chốt. Biểu đồ luôn lấy tháng hiện tại từ số sống |
| `goals` | mục tiêu | `monthly_contribution` = số người dùng đang để dành / tháng |
| `simulation_presets` | kịch bản phổ biến | `params_json` = `SimulationParams` |
| `simulation_runs` | lịch sử chạy mô phỏng | `result_json` = `SimulationReport` |
| `habit_scenarios` / `habit_answers` | câu hỏi thói quen / câu trả lời | `options_json` = `[{key,label,risk 0..10}]`; 1 câu trả lời / câu hỏi |
| `safety_plans` / `plan_tasks` | kế hoạch đã áp dụng + việc cần làm | chỉ 1 plan `applied`; plan cũ → `archived` |
| `ai_events` | nhật ký "AI theo dõi" | type: alert/simulation/reminder/analysis. Mỗi lần sửa dữ liệu tài chính ghi 1 dòng `analysis` ("Mức an tâm 72 → 75"); thay đổi cùng loại trong 30 phút được gộp |
| `ai_alerts` | cảnh báo | UNIQUE (user_id, rule_key) WHERE status='open'; đã xử lý thì không mở lại trong 7 ngày |
| `lessons` | bài học cộng đồng | kind: lesson/story/history |
| `user_settings` | quyền riêng tư + thông báo | boolean lưu 0/1 |

## Luồng ghi dữ liệu
Mọi route ghi dữ liệu tài chính (goals, holdings, transactions, profile, onboarding) gọi `afterChange()` trong
[`worker/lib/refresh.ts`](../../worker/lib/refresh.ts) sau khi ghi:
1. `loadUserState` → state mới (thu / chi hiệu lực đã tính từ sổ).
2. `syncAlerts` → mở / đóng cảnh báo.
3. Upsert `net_worth_snapshots` của tháng hiện tại.
4. Ghi / gộp dòng `ai_events` với điểm an tâm trước → sau.

Bộ số liệu mockup ("Nguyễn Văn Minh", điểm 82) chỉ còn là fixture test ở `tests/demo-data.ts`.

## Migration
```bash
npm run db:migrate          # local
npm run db:migrate:remote   # production
npm run db:seed             # danh mục dùng chung (idempotent) — local
npm run db:seed:remote      # danh mục dùng chung — production
npm run db:reset            # xóa D1 local, migrate + seed lại
```
Thay đổi schema = thêm file `migrations/000N_*.sql` mới, không sửa file cũ.
