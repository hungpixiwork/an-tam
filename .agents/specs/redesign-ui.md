# Redesign giao diện theo 9 mockup — đặc tả từng màn

> File này là bảng tra cho dev khi dựng lại giao diện theo 9 mockup mới (kế hoạch redesign đã duyệt ngày 27/09/2026). Mỗi màn ghi: route, các khối, endpoint lấy dữ liệu, hàm engine, trạng thái.
> Tất cả đều 📐 (đã chốt, chưa code). Lịch làm theo Wave 0–5: [project-timeline.md](../project-timeline.md). Sản phẩm, API, dữ liệu: [ba.md](ba.md).

## 1. Nguyên tắc

- **Tái cấu trúc giao diện, giữ engine/API đang chạy và mở rộng thêm** — không viết lại từ đầu.
- Mỗi màn có **một GET tổng hợp** (dashboard) + các lệnh ghi chi tiết.
- Mọi con số do engine tính (`shared/engine/*`, hàm thuần, tiền là số nguyên VND, "hôm nay" cố định trong test). LLM chỉ phân loại ý định và lập kế hoạch trên dữ liệu đã che số ([llm-strategy.md](llm-strategy.md)).
- Mọi hành động ghi ra bên ngoài (Google, Notion) đi qua hàng chờ phê duyệt → `audit_log` (mục 5).
- Mọi lệnh approve/reject và mọi POST liên quan tới tiền bắt buộc header `Idempotency-Key`.

## 2. Shell chung 📐 (Wave 0)

| Thành phần | Nội dung | File |
|---|---|---|
| **Sidebar** | Logo + tagline; 11 mục: Tổng quan, Sổ thu chi, Quỹ an toàn, Tăng thu nhập, Mục tiêu & Lựa chọn, Lịch AI, Mô phỏng, Danh mục, AI Workspace, Nhật ký AI, Cài đặt; thẻ minh họa cuối sidebar (thẻ promo Học tài chính → `/cong-dong`) | `components/layout/Sidebar.tsx`, `app/nav.ts` (`NAV`, `titleFor`) |
| **Topbar** | Ô tìm kiếm có placeholder theo từng trang; nút "Kết nối Google Calendar" / "Đã đồng bộ"; badge "Dữ liệu riêng tư & bảo mật" → `/nhat-ky-ai#privacy`; chuông; chọn ngôn ngữ; avatar + vai trò | `components/layout/Topbar.tsx` |
| **Router** | Route mới + redirect (mục 3); giữ `safeLazy`, `RouteErrorBoundary` | `app/router.tsx`, `layouts/AppShell.tsx` |

### Bảng route

| Nav | Route | Loại |
|---|---|---|
| Tổng quan | `/` | giữ |
| Sổ thu chi | `/thu-chi` | giữ (thêm tab Thói quen) |
| Quỹ an toàn | `/quy-an-toan` | **mới** (gộp Kế hoạch an toàn + mục tiêu tiết kiệm) |
| Tăng thu nhập | `/tang-thu-nhap` | giữ |
| Mục tiêu & Lựa chọn | `/lua-chon` | **mới** |
| Lịch AI | `/lich-ai` | **mới** |
| Mô phỏng | `/mo-phong` | giữ (chỉ đổi shell + UI kit) |
| Danh mục | `/danh-muc` | giữ |
| AI Workspace | `/ai-workspace` | **mới** |
| Nhật ký AI | `/nhat-ky-ai` | **mới** (gộp AI theo dõi) |
| Cài đặt | `/cai-dat` | giữ (chỉ đổi shell + UI kit) |

## 3. Redirect và trang gộp

| Route cũ | Chuyển sang | Ghi chú |
|---|---|---|
| `/muc-tieu` | `/quy-an-toan` | Mục tiêu tiết kiệm từ GoalsPage |
| `/ke-hoach` | `/quy-an-toan` | SafetyPlanPage gộp vào |
| `/ai-theo-doi` | `/nhat-ky-ai` | AiMonitorPage gộp vào |
| `/thoi-quen` | `/thu-chi?tab=thoi-quen` | HabitsPage thành tab |
| `/cong-dong` | giữ route | Chỉ còn lối vào từ thẻ promo cuối sidebar |

## 4. Từng màn

### 4.1. Tổng quan — `/` 📐 (Wave 3, agent J)
| Khối | Endpoint (trường) | Engine |
|---|---|---|
| Hero chào + quote | `GET /api/auth/me` | — |
| 4 KPI: Điểm An Tâm, Số tháng an toàn, Dòng tiền (thu/chi + sparkbar), Tỷ lệ tiết kiệm | `GET /api/overview` (`cashflow6m`, `savingsRateVsPeers`) | `peace.ts` (`peaceScore`, số tháng an toàn, `savingsCapacity`) |
| "Hôm nay AI đề xuất" 3 thẻ (Ưu tiên cao / Tiết kiệm / Phát triển bản thân) | `todaySuggestions` | `nba.ts` |
| Google Calendar hôm nay (timeline) | `todayEvents` | — (dữ liệu `calendar_events`) |
| Tài sản hiện tại (stacked bar 4 loại) | `netWorthBreakdown` | cột `cash`/`other`/`debt` của `net_worth_snapshots` |
| Phân bổ nguồn lực (3 ring Tài chính/Thời gian/Kỹ năng) | `resourceRings` | `resources.ts` (`resourceRings`) |
| Lựa chọn cuộc đời (stepper + cảnh báo) | `pinnedLifeChoice` | `lifeChoice.ts` |

### 4.2. Sổ thu chi — `/thu-chi` 📐 (Wave 1, agent A)
| Khối | Endpoint | Engine |
|---|---|---|
| 3 CTA: Thêm giao dịch, Chia đều chi phí, Đặt ngân sách tháng | `POST /api/transactions`, `POST /api/ledger/split` → `{shares, qrUrls}`, `PUT /api/budgets/:month` | `split.ts` (`splitEvenly`, `vietQrUrl`), `budget.ts` |
| 4 KPI: Thu, Chi, Dòng tiền ròng, Ngân sách tháng (% đã chi) | `GET /api/ledger/dashboard?month` | `budget.ts` (`budgetStatus`, `momDeltas`) |
| Combo chart 6 tháng (bar thu/chi + line ròng) | như trên | `momDeltas` |
| Donut cơ cấu chi 7 danh mục | như trên | `categoryBreakdown` |
| Gợi ý AI | như trên | `spending.ts`, `narrate.ts` |
| Giao dịch gần đây | như trên | — |
| Hóa đơn & đăng ký định kỳ (badge sắp đến hạn / tự gia hạn) | CRUD `/api/bills`, `POST /api/bills/:id/paid` | `bills.ts` (`nextDueDate`, `billStatus`, `matchBillTransaction`) |
| Tab Thói quen (dời HabitsPage vào) | `/api/habits` ✅ | `analysis.ts` (`habitsProfile`) ✅ |
| Tài khoản nhận VietQR | `PUT /api/settings/payout-account` | — |

Giao dịch từ SePay vào `transactions` với `source='sepay'`, chống trùng theo `external_id`.

### 4.3. Quỹ an toàn & mục tiêu — `/quy-an-toan` 📐 (Wave 1, agent B)
| Khối | Endpoint | Engine |
|---|---|---|
| Ring "x tháng" đã có / cần thêm | `GET /api/safety` | `safety.ts` (`safetyFund`) |
| Mục tiêu đề xuất 6/12 tháng + "Lên kế hoạch" | `GET /api/safety`, `PUT /api/safety/target` | `safetyFund` (cần thêm, kế hoạch/tháng, ngày dự kiến đạt) |
| "Nếu mất việc hôm nay" stepper (Hiện tại / 6 / 12) | `GET /api/safety` | `jobLossTimeline` |
| Mục tiêu tiết kiệm (tabs Tất cả/Ngắn/Trung/Dài hạn, Thêm mục tiêu, card progress) | `GET /api/goals/summary` ✅, `POST /api/goals` ✅, `PATCH /api/goals/:id` (thêm `icon`, `horizon`) | `goalHorizon`, `goals.ts` ✅ |
| Gợi ý AI (tiết kiệm thêm/tháng, tác động từng mục tiêu) | `GET /api/safety` | `goalAccelerations` (sớm hơn N tháng) |

### 4.4. Tăng thu nhập & kỹ năng — `/tang-thu-nhap` 📐 (Wave 1, agent C — B2)
| Khối | Endpoint | Engine |
|---|---|---|
| Nguồn thu hiện tại (stacked bar Lương/Freelance/Đầu tư, Thêm nguồn thu) | `GET /api/earn/dashboard` | lấy từ `transactions.category` (thêm `freelance`), không cần bảng mới |
| Cơ hội tăng thu nhập (list) | `GET /api/earn/dashboard` | seed `opportunities` |
| Giá trị nghề nghiệp ring (vd 72/100) + thang "Mức độ tiếp xúc AI" | `GET /api/human-capital` | `humanCapital.ts` (HC, mức tiếp xúc AI, `careerScore`), dữ liệu `shared/data/ilo-exposure.ts` |
| Lộ trình kỹ năng → thu nhập (3 cột) | `GET /api/earn/dashboard` | `earn.ts` ✅ |
| Kế hoạch học tuần (7 ngày, trạng thái) | CRUD `/api/skills` | bảng `skill_plan_items` |
| Việc làm/freelance phù hợp (badge độ phù hợp) | `GET /api/earn/dashboard` | seed `opportunities` |
| Hành động đề xuất | `GET /api/earn/dashboard` | `nba.ts` |

### 4.5. Lịch AI — `/lich-ai` 📐 (Wave 2, agent G)
| Khối | Endpoint | Engine |
|---|---|---|
| Week grid 07:00–22:00 (Ngày/Tuần/Tháng, Bộ lọc, 5 loại màu) | `GET /api/calendar?week=`, CRUD `/api/calendar/events` | — |
| Đồng bộ Google Calendar (trạng thái, Đồng bộ ngay) | `POST /api/calendar/sync` | `worker/integrations/google/calendar.ts` |
| "AI lập kế hoạch" → Tạo lịch tự động | `POST /api/calendar/auto-schedule` | `scheduler.ts` (`freeSlots`, `tasksFromState`, `autoSchedule`: hạn sớm nhất trước, có ưu tiên, múi giờ +07:00) |
| Đề xuất tự động (4 toggle: `weekly_review`, `bill_reminder`, `skill_block`, `freelance_followup`) | `GET` / `PUT /api/automation-rules/:key` | `automation.ts` (`dueFirings`), cron `*/15` |
| Đề xuất AI tuần này (Duyệt / Chỉnh sửa / Từ chối) | `/api/agent/actions` (mục 4.8) | luồng phê duyệt |

5 loại sự kiện (`calendar_events.category`): `finance` · `skill` · `work` · `rest` · `personal`. Sự kiện do AI tạo nằm trong lịch phụ "An Tâm" trên Google (scope `calendar.app.created`).

### 4.6. Mục tiêu & Lựa chọn cuộc đời — `/lua-chon` 📐 (Wave 2, agent F — B1)
| Khối | Endpoint | Engine |
|---|---|---|
| Tình huống (3 chỉ số) | `/api/life-choices` (templates, list, CRUD) | — |
| So sánh 2 phương án (radio, gauge điểm khả thi, trạng thái khả thi) | `POST /api/life-choices/compare` | `lifeChoice.ts` (`compareOptions`) |
| Phân tích chi tiết (tác động số tháng an toàn, chi phí ước tính stacked, cơ hội, rủi ro) | `POST /api/life-choices/evaluate` | `evaluateLifeChoice`, `freedomMonths` |
| Kết luận AI | như trên | `narrate.ts` |
| Điều kiện tiên quyết (checklist x/6) | `/api/life-choices` prereqs | bảng `life_choice_prereqs` |
| Kế hoạch hành động 5 bước (mức ưu tiên) | `/api/life-choices` tasks | bảng `life_choice_tasks` |

Điểm khả thi = 40 số tháng an toàn + 30 giữ mục tiêu + 20 ΔHC + 10 điều kiện tiên quyết. Kết quả tính khi đọc, không lưu. Chi tiết: [breakthroughs.md](breakthroughs.md) §B1.

### 4.7. Danh mục & rủi ro tập trung — `/danh-muc` 📐 (Wave 1, agent D — B4)
| Khối | Endpoint | Engine |
|---|---|---|
| 4 KPI (Tài sản ròng, Đầu tư, Tài sản khác, Nợ) | `GET /api/portfolio/risk` | `portfolio.ts` ✅, bảng `liabilities` |
| Donut cơ cấu đầu tư | như trên | `analysis.ts` (`portfolioAnalysis`) ✅ |
| Cổ phiếu công ty (tỷ trọng cao) | như trên | `concentration.ts` (`employerStockWeight`) |
| Gauge rủi ro tập trung (x/100) | như trên | `hhi`, `concentrationIndex` |
| Bar rủi ro theo ngành (nghề nghiệp + tài sản) | như trên | `sectorExposure` |
| "Thử trước khi đầu tư" (loại tài sản/số tiền/thời gian → rủi ro, số tháng an toàn, tiến độ mục tiêu) | `POST /api/portfolio/what-if` | `whatIfAllocate` (cặp trước/sau) |
| Gợi ý AI | như trên | `narrate.ts` |

### 4.8. AI Workspace · MCP · Agents — `/ai-workspace` 📐 (Wave 3, agent H)
| Khối | Endpoint | Engine / Worker |
|---|---|---|
| 5 agent cards (Planner/Calendar/Cashflow/Skill/Goal, trạng thái + hoạt động gần nhất) | `GET /api/agents` | `shared/agent/planner.ts` |
| Ra lệnh cho đội ngũ AI (chat + chips agent phối hợp) | `POST /api/agent/runs` | `sanitize.ts` → `intent.ts` → `planner.ts` → `tools.ts` |
| Kế hoạch tuần tới (grid + tabs Lịch trình/Tài chính/Học kỹ năng/Công việc) | `GET /api/agent/runs/:id` | `scheduler.ts` |
| Nhật ký & quy trình thực thi (timeline, poll) | `GET /api/agent/runs/:id` | `agent_steps` |
| Công cụ & MCP (Calendar/Sheets/Notion/Gmail) | `GET /api/integrations` | `worker/integrations/*` |
| Chờ phê duyệt (danh sách hành động) + Chỉnh sửa / Yêu cầu điều chỉnh / Từ chối / Phê duyệt và triển khai | `GET /api/agent/actions?status=pending`, `POST /api/agent/actions/:id/{approve,reject,request-changes}`, `POST /api/agent/actions/approve-batch` | `actions.ts` (`ACTION_TYPES`), `worker/agents/executor.ts` |

Chi tiết thiết kế đa agent: [llm-strategy.md](llm-strategy.md) §8.

### 4.9. Nhật ký AI, kiểm toán & quyền riêng tư — `/nhat-ky-ai` 📐 (Wave 3, agent I)
| Khối | Endpoint | Engine / Worker |
|---|---|---|
| Bảng nhật ký AI (lọc tác nhân/trạng thái/thời gian; Hoàn thành/Đã phê duyệt/Đã từ chối; người phê duyệt) | `GET /api/audit?agent&status&from&to&cursor` | `worker/lib/audit.ts` |
| Quyền riêng tư (`#privacy`): ẩn danh, cần phê duyệt, Xuất/Xóa dữ liệu | `GET /api/me/export` ✅, `DELETE /api/me` ✅ (tombstone qua `erasure_requests`) | — |
| Ứng dụng & tích hợp (trạng thái, quyền, Quản lý/Xác thực, "Kết nối lại") | `/api/integrations` (list, connect 302, callback, delete, sync), `POST /api/integrations/sepay/{link,verify}` | `worker/integrations/tokens.ts` |
| Tình trạng hệ thống | `GET /api/health` | — |
| Cảnh báo & tóm tắt tuần (từ AI theo dõi cũ) | `GET /api/ai` ✅, `GET /api/ai/digest` ✅ | `alerts.ts`, `digest.ts` ✅ |

Google ở chế độ Testing: refresh token hết hạn sau 7 ngày → UI phải có nút "Kết nối lại".

### 4.10. Mô phỏng `/mo-phong`, Cài đặt `/cai-dat` 📐 (Wave 5)
Không có mockup riêng. Chỉ đổi sang shell và UI kit mới, giữ nguyên chức năng.

## 5. Luồng phê duyệt (dùng chung cho Lịch AI, AI Workspace, MCP)

```text
Agent / MCP client / cron automation đề xuất
  → agent_actions (pending, hết hạn 24h) + audit
  → người dùng Duyệt (Idempotency-Key)  — duyệt 2 lần: 409, chỉ thực thi 1 lần
  → executor (executing) gọi Google / Notion / nội bộ
  → done | failed (hoàn tác phần ghi nội bộ) + audit_log (append-only, đã ẩn danh)
  → Nhật ký AI hiển thị dòng đó
```

## 6. Design tokens (Wave 0 — `client/tailwind.config.js`)

| Token | Giá trị theo mockup |
|---|---|
| Nền | Trắng / xám rất nhạt |
| CTA chính | Xanh lá đậm (khoảng `#0F5E3F`) |
| CTA phụ | Xanh dương |
| Badge | Pastel đỏ / cam / xanh / tím |
| Card | Bo 16px, viền mảnh, shadow nhẹ |
| Hero banner | Ảnh minh họa thành phố + nhân vật (`client/public/*.jpg`; ảnh mới đặt ở `client/public/illustrations/`) |
| Chữ | Sans — Be Vietnam Pro / Inter |

## 7. UI kit

**Đã có ✅** (`client/src/components/ui/`): `core.tsx` (Card, Button, Badge, ProgressBar, Toggle, IconTile, Tone) · `data.tsx` (ScoreRing, DonutChart, DeltaBadge, Skeleton/Empty/Error states) · `form.tsx` (MoneyInput, Segmented, Modal) · `PageHero.tsx`.

**Bổ sung 📐** (Wave 0): `KpiCard` · `SectionCard` (link "Xem tất cả →") · `StackedBar` + legend · `Gauge` (nửa vòng) · `Stepper` · `Timeline` · `Tabs` · `ListRow` (icon, tiêu đề, phụ đề, giá trị, badge, menu ⋯) · `ApprovalBar` · `QuoteCard` · `HeroBanner` · `WeekGrid`. Mở rộng `PageHero` thay vì viết trùng.

## 8. Kiểm tra giao diện

- `agent-browser` mở từng route, đối chiếu với mockup, tối đa 1 screenshot mỗi màn.
- `playwright-cli` `setViewportSize` ở 1440 / 1024 / 768 / 390: không tràn ngang.
- Dữ liệu demo (`seeds/demo-user.sql`, Wave 5) khớp số liệu mockup: thu 28,5tr, chi 21tr, quỹ dự phòng 84tr / 4,2 tháng, tài sản ròng 520tr, cổ phiếu công ty 35%, MBA 300tr.
