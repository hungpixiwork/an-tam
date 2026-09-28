// Tỷ giá (VND / 1 ngoại tệ): Vietcombank giá chuyển khoản (chính), open.er-api.com (phụ). Bitcoin: CoinGecko.

import type { Quote } from '../../../shared/types/market';
import type { MarketProvider } from '../types';
import { getJson, getText, unixToIso, vnDateToIso } from '../http';

const num = (s: string) => Number(s.replace(/,/g, ''));

export const vietcombank: MarketProvider = {
  id: 'vietcombank',
  kinds: ['fx'],
  async fetch(keys) {
    const xml = await getText('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=10', { headers: { Accept: 'application/xml, text/xml' } });
    const t = xml.match(/<DateTime>(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)<\/DateTime>/);
    const asOf = t
      ? vnDateToIso(+t[3], +t[1], +t[2], (+t[4] % 12) + (t[7] === 'PM' ? 12 : 0), +t[5], +t[6])
      : new Date().toISOString();
    const out: Quote[] = [];
    for (const code of keys) {
      const m = xml.match(new RegExp(`CurrencyCode="${code}"[^>]*Transfer="([\\d,.]+)"`));
      if (m) out.push({ symbol: code, kind: 'fx', price: num(m[1]), asOf, source: 'vietcombank' });
    }
    return out;
  },
};

export const erApi: MarketProvider = {
  id: 'er-api',
  kinds: ['fx'],
  async fetch(keys) {
    const j = await getJson<{ result: string; time_last_update_unix: number; rates: Record<string, number> }>('https://open.er-api.com/v6/latest/USD');
    const vnd = j.rates?.VND;
    if (j.result !== 'success' || !vnd) throw new Error('er-api: không có VND');
    return keys.flatMap((code) => {
      const r = j.rates[code];
      return r ? [{ symbol: code, kind: 'fx' as const, price: Math.round((vnd / r) * 100) / 100, asOf: unixToIso(j.time_last_update_unix), source: 'er-api' }] : [];
    });
  },
};

const COIN_ID: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum' };

export const coingecko: MarketProvider = {
  id: 'coingecko',
  kinds: ['crypto'],
  async fetch(keys) {
    const ids = keys.map((k) => COIN_ID[k]).filter(Boolean);
    if (!ids.length) return [];
    const j = await getJson<Record<string, { vnd: number; vnd_24h_change?: number; last_updated_at?: number }>>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=vnd&include_24hr_change=true&include_last_updated_at=true`,
    );
    return keys.flatMap((k) => {
      const r = j[COIN_ID[k]];
      return r?.vnd
        ? [{ symbol: k, kind: 'crypto' as const, price: r.vnd, changePct: r.vnd_24h_change ?? null, asOf: r.last_updated_at ? unixToIso(r.last_updated_at) : new Date().toISOString(), source: 'coingecko' }]
        : [];
    });
  },
};

export const CRYPTO_SYMBOLS = Object.keys(COIN_ID);
