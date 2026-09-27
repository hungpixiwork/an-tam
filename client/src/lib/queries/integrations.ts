// Trạng thái tích hợp bên ngoài (Google, Notion, ngân hàng…).
// Wave 0: stub cố định để Topbar hiển thị nút "Kết nối Google Calendar".
// Wave sau thay bằng useQuery(qk.integrations → GET /api/integrations) mà không đổi chữ ký hook.

export type IntegrationState = 'connected' | 'disconnected' | 'error' | 'pending';

export interface IntegrationStatus {
  google: IntegrationState;
  /** ISO time lần đồng bộ Google gần nhất (nếu có). */
  googleSyncedAt?: string | null;
}

const PLACEHOLDER: IntegrationStatus = { google: 'disconnected', googleSyncedAt: null };

export function useIntegrationStatus(): IntegrationStatus {
  return PLACEHOLDER;
}
