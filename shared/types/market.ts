// Mẫu dữ liệu chuẩn của tầng dữ liệu thị trường — mọi nguồn (SJC, SSI, VNDirect, fmarket...) đều đổi về các kiểu này.

export type QuoteKind = 'gold_vn' | 'gold_world' | 'index' | 'stock' | 'fund' | 'fx' | 'crypto';

/** Giá mới nhất của một mã. Đơn vị: VND (vàng SJC: VND/lượng; quỹ: VND/chứng chỉ; tỷ giá: VND/1 ngoại tệ),
 *  trừ vàng thế giới (USD/ounce) và chỉ số (điểm). */
export interface Quote {
  symbol: string;
  kind: QuoteKind;
  price: number;
  prevClose?: number | null;
  /** % so với phiên / ngày trước, ví dụ -1.25 = giảm 1,25%. */
  changePct?: number | null;
  /** Thời điểm nguồn công bố giá (ISO). */
  asOf: string;
  source: string;
}

/** Nến ngày (chỉ cần giá đóng cửa cho chỉ báo). */
export interface Bar {
  symbol: string;
  /** YYYY-MM-DD giờ Việt Nam. */
  day: string;
  close: number;
}

/** Độ rộng thị trường HOSE. */
export interface Breadth {
  day: string;
  indexValue: number | null;
  indexChangePct: number | null;
  advancers: number | null;
  decliners: number | null;
  asOf: string;
  source: string;
}

export interface NewsItem {
  id: string;
  symbol: string | null;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: 'good' | 'bad' | 'neutral' | null;
}

/** Luật cảnh báo giá người dùng tự đặt. */
export interface AlertRule {
  id: string;
  symbol: string;
  direction: 'down' | 'up';
  thresholdPct: number;
  createdAt?: string;
}
