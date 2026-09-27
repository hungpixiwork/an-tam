// Envelope chung và kiểu dùng ở nhiều màn (topbar, auth).

import type { Salutation } from '../domain';

export interface ApiOk<T> { success: true; data: T }
export interface ApiErr { success: false; error: { code: string; message: string } }
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface Me {
  id: string;
  email: string;
  fullName: string;
  salutation: Salutation;
  avatarSeed: number;
  memberStatus: string;
  /** Đã hoàn tất màn "Bắt đầu" (nhập hoặc bỏ qua). */
  onboarded: boolean;
  lifeStage?: string;
}

export interface SetupStatus {
  profile: boolean;
  holdings: boolean;
  goals: boolean;
  transactions: boolean;
}

export interface NotificationItem {
  id: string;
  severity: 'danger' | 'warning' | 'action';
  title: string;
  createdAt: string;
}

export interface SearchResult {
  type: 'page' | 'goal' | 'lesson';
  title: string;
  subtitle: string;
  to: string;
}
