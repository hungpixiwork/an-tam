// Định giá tài sản theo giá thị trường: có mã + số lượng + giá VND → value = round(quantity × price).

import type { QuoteKind } from '../../shared/types/market';

/** Nhóm có giá tính bằng VND (vàng thế giới tính USD, chỉ số tính điểm → không dùng để định giá). */
const VND_KINDS: QuoteKind[] = ['gold_vn', 'stock', 'fund', 'fx', 'crypto'];

export interface PriceForValue { symbol: string; kind: QuoteKind; price: number; as_of: string }

/** SQL lấy giá cho các mã người dùng đang giữ (dùng trong db.batch của loadUserState). */
export const holdingPricesQuery = (db: D1Database, userId: string) =>
  db.prepare(
    `SELECT symbol, kind, price, as_of FROM market_prices
     WHERE symbol IN (SELECT UPPER(symbol) FROM holdings WHERE user_id = ? AND symbol IS NOT NULL)`,
  ).bind(userId);

export function marketValue(
  h: { value: number; symbol?: string | null; quantity?: number | null },
  prices: Map<string, PriceForValue>,
): { value: number; priceAsOf: string | null } {
  const p = h.symbol ? prices.get(h.symbol.toUpperCase()) : undefined;
  if (!p || !h.quantity || h.quantity <= 0 || !VND_KINDS.includes(p.kind)) return { value: h.value, priceAsOf: null };
  return { value: Math.round(h.quantity * p.price), priceAsOf: p.as_of };
}
