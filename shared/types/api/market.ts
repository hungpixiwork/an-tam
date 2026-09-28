import type { AlertRule, Bar, Breadth, NewsItem, Quote } from '../market';

export type { AlertRule, Bar, Breadth, NewsItem, Quote, QuoteKind } from '../market';

/** GET /api/market — bảng giá các mã liên quan tới người dùng. */
export interface MarketQuoteRow extends Quote {
  /** Người dùng đang giữ mã này. */
  held: boolean;
  /** Giá cũ hơn ngưỡng (ví dụ nguồn lỗi, ngoài giờ giao dịch lâu) hoặc chỉ là giá mẫu. */
  stale: boolean;
}

export interface MarketData {
  quotes: MarketQuoteRow[];
  breadth: Breadth | null;
  news: NewsItem[];
  /** Lần lấy giá gần nhất (ISO) — hiện 1 lần "cập nhật lúc HH:mm"; null nếu chỉ có giá mẫu. */
  updatedAt: string | null;
}

/** GET /api/market/history/:symbol?days=60 */
export interface MarketHistoryData {
  symbol: string;
  bars: Bar[];
  technical: {
    sma20: number | null;
    sma50: number | null;
    rsi14: number | null;
    /** Mức giảm từ đỉnh trong khoảng dữ liệu, 0..1. */
    drawdown: number | null;
    /** Độ biến động ngày (độ lệch chuẩn lợi nhuận ngày), 0..1. */
    volatility: number | null;
  };
}

export interface AlertRuleInput {
  symbol: string;
  direction: 'down' | 'up';
  thresholdPct: number;
}

export type AlertRuleList = AlertRule[];

/** GET /api/market/sources — nguồn dữ liệu, giấy phép và dòng ghi nguồn (một nơi duy nhất). */
export interface MarketSource {
  id: string;
  name: string;
  license: 'official-free' | 'unofficial' | 'paid';
  attribution: string;
}
