# 08 · AI Workspace · MCP · Agents (`/ai-workspace`)

## Lưới (1672px, 12 cột)
- H1: tiêu đề + mô tả (8) · hộp "Nhiều AI Agent phối hợp…" + minh họa agent (4)
- H2: "Đội ngũ Agent của bạn" 5 thẻ ngang (Planner, Calendar, Cashflow, Skill, Goal) + nút "Quản lý Agent"
- H3 trái (8): Ra lệnh (ô lệnh → lời nhắc đã gửi, trả lời AI, chip agent) → Kế hoạch tuần tới (WeekGrid 08–20h + tabs Lịch trình/Tài chính/Học kỹ năng/Công việc) → Công cụ & MCP (Google Calendar, Sheets, Notion, Gmail) → thanh nút (Chỉnh sửa kế hoạch, Yêu cầu điều chỉnh, Từ chối, Phê duyệt và triển khai)
- H3 phải (4): Nhật ký hoạt động & quy trình (Timeline, poll) → hộp "Chờ phê duyệt" → "Hành động sẽ được thực hiện sau khi phê duyệt" (lưới 2 cột, đánh số)

## Luồng dữ liệu
| Khối | Hook | Endpoint | Engine | Bảng |
|---|---|---|---|---|
| Thẻ agent | useAgents | GET /api/agents | — | agent_steps, agent_runs |
| Ra lệnh / trả lời / chip | useLatestRun, useStartRun | POST /api/agent/runs, GET /api/agent/runs/latest | shared/agent/{sanitize,intent,planner} + worker/agents/{llm,runner} | agent_runs, agent_steps, agent_actions, audit_log |
| Timeline | useAgentRun (poll 1.5s khi running/executing) | GET /api/agent/runs/:id | — | agent_steps |
| Kế hoạch tuần | useAgentRun + useCalendarWeek(tuần tới) | GET /api/calendar?week= | scheduler (planTasks) | calendar_events + payload action calendar.create_events |
| Công cụ & MCP | useIntegrations | GET /api/integrations | — | integrations |
| Chờ phê duyệt / 6 hành động | useAgentRun | approve-batch / reject / request-changes (Idempotency-Key) | worker/agents/executor | agent_actions, calendar_events, budgets, goals, audit_log |

## Hành động → khối đổi
- Gửi lệnh mới → run mới, timeline chạy, kế hoạch + danh sách hành động mới, thẻ agent đổi "việc gần nhất".
- Phê duyệt và triển khai → lịch có sự kiện thật (lưới tuần tới đổi từ "đề xuất" sang thật), ngân sách/mục tiêu cập nhật, hành động cần Gmail/Notion báo "Cần kết nối …".
- Từ chối → hành động "Đã từ chối". Yêu cầu điều chỉnh → chạy lại planner kèm ghi chú.
- Chỉnh sửa kế hoạch → sửa giờ từng buổi (PATCH /api/calendar/proposals/:id).
