import { CATEGORY_KEYWORDS, VALUE_TAG_KEYWORDS } from './keywords';
import type { SpendingTag, TransactionKind } from '../types/domain';

export interface ParsedTransaction {
  amount: number;
  category: string;
  kind: TransactionKind;
  note: string;
  occurredOn: string;
  valueTag?: SpendingTag;
  confidence: number; // 0..1
}

/**
 * Bóc tách tự nhiên một câu tiếng Việt thành bản ghi giao dịch chuẩn mực.
 * Ví dụ: "sáng nay ăn bún bò 45k" -> { amount: 45000, category: 'food', kind: 'expense', note: 'ăn bún bò' }
 * Ví dụ: "nhận lương tháng 10 25 triệu" -> { amount: 25000000, category: 'salary', kind: 'income', note: 'nhận lương tháng 10' }
 */
export function parseVietnameseTransaction(input: string, defaultDate?: string): ParsedTransaction | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // 1. Trích xuất số tiền (Hỗ trợ 45k, 1.5tr, 25 triệu, 500 nghìn, 120.000đ)
  let amount = 0;

  // Pattern triệu: 1.5tr, 25 triệu, 25tr, 25 tr, 2.5 triệu
  const trMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|m)\b/i);
  if (trMatch) {
    amount = Math.round(parseFloat(trMatch[1].replace(',', '.')) * 1_000_000);
  } else {
    // Pattern nghìn/k: 45k, 500 nghìn, 500k, 500 ngàn, 120 k
    const kMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)\b/i);
    if (kMatch) {
      amount = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
    } else {
      // Pattern số nguyên có chấm/phẩy: 50.000, 100,000 hoặc 50000
      const numMatch = text.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d{4,10})\b/);
      if (numMatch) {
        amount = parseInt(numMatch[1].replace(/[.,]/g, ''), 10);
      }
    }
  }

  if (amount <= 0) return null;

  // 2. Xác định Loại: Thu hay Chi
  let kind: TransactionKind = 'expense';
  if (text.includes('lương') || text.includes('nhận') || text.includes('thu nhập') || text.includes('thưởng') || text.includes('bán')) {
    kind = 'income';
  }

  // 3. Phân loại danh mục (Category)
  let category = kind === 'income' ? 'salary' : 'other';
  let matchedKeyword = '';

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        category = cat;
        matchedKeyword = kw;
        if (cat === 'salary') kind = 'income';
        break;
      }
    }
    if (matchedKeyword) break;
  }

  // 4. Nhận diện Value Tag (Ý định chi tiêu)
  let valueTag: SpendingTag | undefined = undefined;
  for (const [tag, keywords] of Object.entries(VALUE_TAG_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        valueTag = tag as SpendingTag;
        break;
      }
    }
    if (valueTag) break;
  }

  // 5. Ghi chú sạch
  const today = defaultDate || new Date().toISOString().slice(0, 10);
  const note = input.replace(/[\d.,]+\s*(?:k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|m|đ|vnd)\b/gi, '').trim();

  return {
    amount,
    category,
    kind,
    note: note || input,
    occurredOn: today,
    valueTag,
    confidence: matchedKeyword ? 0.95 : 0.75,
  };
}
