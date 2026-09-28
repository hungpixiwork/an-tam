// Hành động 1 chạm: nút Áp dụng / Hoàn tác, mô tả trước → sau, dải liên kết trên trang CRUD.
const messages: Record<string, string> = {
  "action.apply": "Apply",
  "action.applied": "Applied",
  "action.done": "Updated",
  "action.undo": "Undo",
  "action.undone": "Undone",
  "action.failed": "Could not apply",
  "action.open": "Open page",
  "action.not_set": "Not set",
  "action.reserve": "{months} months · {amount}",
  "action.save_monthly": "save {amount}/month until {month}",
  "action.budget_line": "budget for {month}, {saving} less",
  "action.move": "move {amount} to {to}",
  "action.per_month": "{amount}/month",
  "action.within": "within {n} months",
  "action.start_line": "start month",
  "action.reminders": "{n} reminders at {time}",
  "action.strip_label": "Tasks for your big decision",
  "action.strip_for": "For the decision",
  "action.task_apply": "Do it now",
};

export default messages;
