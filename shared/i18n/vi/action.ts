// Hành động 1 chạm: nút Áp dụng / Hoàn tác, mô tả trước → sau, dải liên kết trên trang CRUD.
const messages: Record<string, string> = {
  "action.apply": "Áp dụng",
  "action.applied": "Đã áp dụng",
  "action.done": "Đã cập nhật",
  "action.undo": "Hoàn tác",
  "action.undone": "Đã hoàn tác",
  "action.failed": "Chưa áp dụng được",
  "action.open": "Mở trang",
  "action.not_set": "Chưa đặt",
  "action.reserve": "{months} tháng · {amount}",
  "action.save_monthly": "để dành {amount}/tháng tới {month}",
  "action.budget_line": "ngân sách {month}, bớt {saving}",
  "action.move": "chuyển {amount} sang {to}",
  "action.per_month": "{amount}/tháng",
  "action.within": "trong {n} tháng",
  "action.start_line": "tháng bắt đầu",
  "action.reminders": "{n} lần nhắc lúc {time}",
  "action.strip_label": "Việc cho quyết định lớn",
  "action.strip_for": "Cho quyết định",
  "action.task_apply": "Làm ngay",
};

export default messages;
