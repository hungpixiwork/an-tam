import { API_ENDPOINTS } from './endpoints';
import { AnTamError, AuthError, QuotaError } from './errors';
import type { LedgerDashboardResponse, OverviewResponse, ProposeActionRequest, ProposeActionResponse } from '../types/api';

export interface AnTamClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export class AnTamClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetch: typeof fetch;

  constructor(options: AnTamClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://an-tam.ai').replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetch = options.fetchFn || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : fetch);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers || {});
    headers.set('Accept', 'application/json');

    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }

    if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await this.fetch(url, { ...init, headers });

    if (!res.ok) {
      if (res.status === 401) throw new AuthError();
      if (res.status === 429) throw new QuotaError();
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json() as { message?: string; error?: string };
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch {
        // fallback to text error
      }
      throw new AnTamError(errorMsg, res.status);
    }

    return (await res.json()) as T;
  }

  /** Lấy tổng quan tài chính (Điểm An Tâm, Quỹ an toàn, Dòng tiền) */
  async getOverview(rangeMonths: 6 | 12 = 12): Promise<OverviewResponse> {
    return this.request<OverviewResponse>(`${API_ENDPOINTS.OVERVIEW}?range=${rangeMonths}`);
  }

  /** Lấy sổ thu chi theo tháng (YYYY-MM) */
  async getLedger(month?: string): Promise<LedgerDashboardResponse> {
    const q = month ? `?month=${month}` : '';
    return this.request<LedgerDashboardResponse>(`${API_ENDPOINTS.LEDGER_DASHBOARD}${q}`);
  }

  /** Đề xuất hành động thông minh chờ người dùng duyệt 1-chạm (Human-in-the-loop) */
  async proposeAction(req: ProposeActionRequest): Promise<ProposeActionResponse> {
    return this.request<ProposeActionResponse>(API_ENDPOINTS.AGENT_ACTIONS, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /** Đánh giá quyết định lớn trong đời (học tập, nghỉ việc, mua nhà) */
  async evaluateLifeChoice(params: Record<string, unknown>): Promise<unknown> {
    return this.request(API_ENDPOINTS.LIFE_CHOICES_EVALUATE, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** Chạy mô phỏng kịch bản đầu tư What-If */
  async whatIfAllocate(params: { preset: string; amount: number; holdingMonths: number }): Promise<unknown> {
    return this.request(API_ENDPOINTS.PORTFOLIO_WHAT_IF, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** Chạy phân tích đa Agent Desk cho một mã cổ phiếu / vàng */
  async runDesk(symbol: string): Promise<unknown> {
    return this.request(API_ENDPOINTS.DESK_RUN(symbol.toUpperCase()), {
      method: 'POST',
    });
  }
}
