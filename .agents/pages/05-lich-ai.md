# Trang 5 — Lịch AI & kế hoạch tự động `/lich-ai`

## Bố cục (1672px)
- Trái ~978fr: HeroBanner ngắn (quote) → khối lịch: Hôm nay · ‹ › · "Th 2, 28 Thg 9 – CN, 4 Thg 10, 2026" · Ngày/Tuần/Tháng · Bộ lọc → WeekGrid 07–22h (48px/giờ) + chú giải 5 loại.
- Phải ~420fr xếp dọc: Đồng bộ Google Calendar · AI lập kế hoạch (Beta, nút "Tạo lịch tự động") · Đề xuất tự động (4 Toggle) · Đề xuất từ AI tuần này (thẻ + ApprovalBar).

## Luồng dữ liệu
| Khối | Hook | Endpoint | Engine / lib | Bảng |
|---|---|---|---|---|
| Lưới tuần/ngày | `useCalendarWeek` | `GET /api/calendar?week=YYYY-MM-DD` | — | `calendar_events` |
| Lưới tháng | `useCalendarMonth` | `GET /api/calendar/month?month=` | — | `calendar_events` |
| Google | `useSyncCalendar`, `useDisconnectGoogle`, `useIntegrationStatus` (topbar) | `GET /api/integrations`, `GET …/google/connect` (302 PKCE / 503 chưa cấu hình), `…/callback`, `POST /api/calendar/sync`, `DELETE /api/integrations/google` | `worker/integrations/{tokens,google/oauth,google/calendar,google/sync}.ts` | `integrations`, `oauth_states` (0012) |
| AI lập kế hoạch | `useAutoSchedule` | `POST /api/calendar/auto-schedule?week=` | `shared/engine/scheduler.ts` (freeSlots → tasksFromState → planTasks) | đọc events, goals, income_profiles, automation_rules, recurring_bills (nếu có) → ghi `agent_actions` type `calendar.create_events` |
| Quy tắc | `useAutomationRules`, `useToggleRule` | `GET/PUT /api/automation-rules/:key` | — | `automation_rules` |
| Đề xuất | `useApproveProposal`, `useRejectProposal`, `useEditProposal` | `POST /api/calendar/proposals/:id/{approve,reject}` (Idempotency-Key), `PATCH /api/calendar/proposals/:id` | `batchWithAudit` | `agent_actions`, `calendar_events` (source 'agent'), `audit_log` |

## Hành động → khối đổi
- Duyệt → sự kiện ✦ xuất hiện trên lưới, thẻ đề xuất biến mất, ghi nhật ký; nếu đã nối Google → đẩy lên lịch phụ "An Tâm".
- Tạo lịch tự động → đề xuất mới theo quy tắc đang bật (không tạo trùng đề xuất đang chờ).
- Tắt quy tắc → lần tạo sau bỏ loại việc đó.

## Quy tắc engine
- Nhắc hóa đơn: hạn từ `recurring_bills` hoặc sự kiện "Đóng …/Thanh toán …" → nhắc trước 2 ngày ~9:00.
- Học kỹ năng: `focus_skill` + `hours_per_week` → 3 buổi tối T2/T4/T6 (60–90 phút), né giờ bận.
- Tổng kết tuần: Chủ nhật 9:00 nếu chưa có. Follow-up: buổi gặp "khách" đã qua ≥3 ngày chưa có follow-up.
- Mục tiêu: cả 7 ngày không có việc tài chính → 30 phút rà soát mục tiêu ưu tiên.

## Đối chiếu
- r1: tên thứ "Thứ 2" → "Th 2"; sự kiện 1 giờ mất dòng giờ (40px/h) → 48px/h + tiêu đề 1 dòng khi thấp; ApprovalBar xuống dòng → ra full-width.
- r3 (ảnh cuối `shots/05-r3.png`): còn lệch nhỏ — dòng phụ đề hero xuống 2 dòng; màu một vài sự kiện theo ngữ nghĩa thay vì đúng màu mockup.
