// Hành động 1 chạm: nút Áp dụng / Hoàn tác, mô tả trước → sau, dải liên kết trên trang CRUD.
const messages: Record<string, string> = {
  "action.apply": "应用",
  "action.applied": "已应用",
  "action.done": "已更新",
  "action.undo": "撤销",
  "action.undone": "已撤销",
  "action.failed": "未能应用",
  "action.open": "打开页面",
  "action.not_set": "未设置",
  "action.reserve": "{months} 个月 · {amount}",
  "action.save_monthly": "每月存 {amount}，直到 {month}",
  "action.budget_line": "{month} 预算，少花 {saving}",
  "action.move": "转 {amount} 到 {to}",
  "action.per_month": "{amount}/月",
  "action.within": "{n} 个月内",
  "action.start_line": "开始月份",
  "action.reminders": "{time} 提醒 {n} 次",
  "action.strip_label": "重大决定的待办",
  "action.strip_for": "针对决定",
  "action.task_apply": "立即执行",
};

export default messages;
