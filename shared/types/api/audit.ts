// Nhật ký kiểm toán (audit_log) — chỉ thêm, không sửa / xóa, có chuỗi hash.

export type AuditActor = 'user' | 'agent' | 'system' | 'mcp' | 'webhook';
export type AuditStatus = 'completed' | 'approved' | 'rejected' | 'failed';
export type AuditApprover = 'auto' | 'user';

/** Một dòng cần ghi. `summaryMasked` KHÔNG được chứa số tiền / PII — dùng `maskSummary` nếu không chắc. */
export interface AuditEntry {
  userId: string;
  actor: AuditActor;
  /** Tên agent (planner, calendar, cashflow, skill, goal...) khi actor là agent / mcp. */
  agent?: string | null;
  /** Khóa hành động, ví dụ 'action.approve', 'calendar.create_event', 'settings.export'. */
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summaryMasked: string;
  /** Nhãn loại dữ liệu đã dùng, ví dụ "Dữ liệu giao dịch (đã ẩn danh)". */
  dataLabel?: string | null;
  status: AuditStatus;
  approver?: AuditApprover | null;
  runId?: string | null;
  actionId?: string | null;
  /** Mặc định: sinh UUID. */
  id?: string;
  /** ISO-8601 UTC. Mặc định: thời điểm hiện tại. */
  at?: string;
}

/** Dòng audit trả về cho client (màn Nhật ký AI). */
export interface AuditLogItem {
  id: string;
  at: string;
  actor: AuditActor;
  agent: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  dataLabel: string | null;
  status: AuditStatus;
  approver: AuditApprover | null;
  runId: string | null;
  actionId: string | null;
}

export interface AuditPage {
  items: AuditLogItem[];
  nextCursor: string | null;
  /** Các tác nhân đã từng xuất hiện trong nhật ký (cho bộ lọc). */
  agents: string[];
}

/** Kết quả kiểm tra chuỗi hash của nhật ký. */
export interface AuditVerify {
  ok: boolean;
  count: number;
  brokenAt: string | null;
  lastAt: string | null;
  checkedAt: string;
}
