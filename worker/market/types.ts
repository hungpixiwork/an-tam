// Hợp đồng của nhà cung cấp dữ liệu (kiểu OpenBB: provider → mẫu dữ liệu chuẩn → REST / MCP).
// Đổi nguồn = sửa 1 dòng trong chains.ts.

import type { Bar, Breadth, Quote, QuoteKind } from '../../shared/types/market';

/** Ghi chú giấy phép: 'official-free' = API/feed công bố cho người dùng ngoài, miễn phí;
 *  'unofficial' = endpoint nội bộ của trang công khai (có thể đổi / chặn, cần xin phép khi thương mại); 'paid' = trả phí. */
export type ProviderLicense = 'official-free' | 'unofficial' | 'paid';

export interface DataSource {
  id: string;
  name: string;
  license: ProviderLicense;
  /** Dòng ghi nguồn, hiện 1 lần ở trang / mục nguồn dữ liệu. */
  attribution: string;
}

interface ProviderBase {
  /** Khớp một dòng trong DATA_SOURCES (chains.ts) — nơi duy nhất ghi giấy phép + dòng ghi nguồn. */
  id: string;
}

export interface MarketProvider extends ProviderBase {
  kinds: QuoteKind[];
  /** Trả về giá cho các mã lấy được; mã lỗi thì bỏ qua (chuỗi dự phòng thử nguồn sau). */
  fetch(keys: string[]): Promise<Quote[]>;
}

export interface HistoryProvider extends ProviderBase {
  /** Giá đóng cửa ~`days` ngày gần nhất, tăng dần. */
  history(symbol: string, days: number): Promise<Bar[]>;
}

export interface BreadthProvider extends ProviderBase {
  breadth(): Promise<Breadth | null>;
}
