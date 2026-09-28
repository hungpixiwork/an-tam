// Chứng chỉ quỹ mở: fmarket (NAV / chứng chỉ quỹ, VND). Lọc đúng trường `code` vì tìm kiếm trả cả mã gần giống.

import type { MarketProvider } from '../types';
import { getJson, perKey } from '../http';

interface FmarketRow { code: string; nav: number; productNavChange?: { navToPrevious?: number | null; updateAt?: number } }

export const fmarket: MarketProvider = {
  id: 'fmarket',
  kinds: ['fund'],
  fetch: (keys) =>
    perKey(keys, async (symbol) => {
      const j = await getJson<{ data?: { rows?: FmarketRow[] } }>('https://api.fmarket.vn/res/products/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          types: ['NEW_FUND', 'TRADING_FUND'], issuerIds: [], sortOrder: 'DESC', sortField: 'navTo6Months', page: 1, pageSize: 20,
          isIpo: false, fundAssetTypes: [], bondRemainPeriods: [], searchField: symbol, isBuyByReward: false, thirdAppIds: [],
        }),
      });
      const r = j.data?.rows?.find((x) => x.code?.toUpperCase() === symbol);
      if (!r || !r.nav) return null;
      const chg = r.productNavChange?.navToPrevious ?? null;
      return {
        symbol, kind: 'fund' as const, price: r.nav,
        prevClose: chg !== null ? Math.round((r.nav / (1 + chg / 100)) * 100) / 100 : null, changePct: chg,
        asOf: new Date(r.productNavChange?.updateAt ?? Date.now()).toISOString(), source: 'fmarket',
      };
    }),
};
