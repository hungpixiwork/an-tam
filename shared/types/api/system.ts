// Tình trạng hệ thống.

export interface HealthStatus {
  ok: boolean;
  db: 'up' | 'down';
  version: string;
  time: string;
}
