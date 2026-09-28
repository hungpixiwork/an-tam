// Vàng: SJC (chính), PNJ (phụ) cho vàng miếng trong nước; gold-api.com cho vàng thế giới.
// Giá vàng trong nước lưu là giá MUA VÀO của tiệm (số tiền bạn nhận được nếu bán), VND/lượng.

import type { Quote } from '../../../shared/types/market';
import type { MarketProvider } from '../types';
import { getJson, perKey, vnDateToIso } from '../http';

interface SjcRow { TypeName: string; BranchName: string; BuyValue: number; SellValue: number }

export const sjc: MarketProvider = {
  id: 'sjc',
  kinds: ['gold_vn'],
  async fetch(keys) {
    if (!keys.includes('SJC')) return [];
    const j = await getJson<{ success: boolean; latestDate?: string; data: SjcRow[] }>('https://sjc.com.vn/GoldPrice/Services/PriceService.ashx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://sjc.com.vn/', 'X-Requested-With': 'XMLHttpRequest' },
      body: 'method=GetCurrentGoldPricesByBranch&BranchId=1',
    });
    const row = j.data?.find((r) => r.TypeName.startsWith('Vàng SJC 1L'));
    if (!j.success || !row) throw new Error('SJC: không thấy dòng Vàng SJC 1L');
    const m = j.latestDate?.match(/(\d{1,2}):(\d{2}) (\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const asOf = m ? vnDateToIso(+m[5], +m[4], +m[3], +m[1], +m[2]) : new Date().toISOString();
    return [{ symbol: 'SJC', kind: 'gold_vn', price: row.BuyValue, asOf, source: 'sjc' }];
  },
};

export const pnj: MarketProvider = {
  id: 'pnj',
  kinds: ['gold_vn'],
  async fetch(keys) {
    if (!keys.includes('SJC')) return [];
    const j = await getJson<{ data: { masp: string; giamua: number; giaban: number }[]; updateDate?: string }>(
      'https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00',
    );
    const row = j.data?.find((r) => r.masp === 'SJC');
    if (!row) throw new Error('PNJ: không thấy SJC');
    // Đơn vị nghìn đồng / chỉ → × 1.000 × 10 chỉ = VND / lượng
    return [{ symbol: 'SJC', kind: 'gold_vn', price: row.giamua * 10_000, asOf: new Date().toISOString(), source: 'pnj' }];
  },
};

export const goldApi: MarketProvider = {
  id: 'gold-api',
  kinds: ['gold_world'],
  /** XAU = vàng, XAG = bạc thế giới, USD / ounce. */
  fetch: (keys) =>
    perKey(keys.filter((k) => k === 'XAU' || k === 'XAG'), async (symbol) => {
      const j = await getJson<{ price: number; updatedAt: string }>(`https://api.gold-api.com/price/${symbol}`);
      const q: Quote = { symbol, kind: 'gold_world', price: j.price, asOf: j.updatedAt ?? new Date().toISOString(), source: 'gold-api' };
      return q;
    }),
};
