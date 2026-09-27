// Che dữ liệu nhạy cảm trong lệnh người dùng TRƯỚC khi lưu / gửi cho mô hình AI.
// Thứ tự: email → số điện thoại → số tài khoản / thẻ → số tiền → mọi con số còn lại.

const UNIT = String.raw`(?:tỷ|tỉ|triệu|tr|nghìn|ngàn|k|đồng|đ|₫|vnđ|vnd|usd|cny|\$|¥)`;
const EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/gu;
const PHONE = /(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/g;
const ACCOUNT = /\b\d(?:[\s-]?\d){9,18}\b/g;
const MONEY = new RegExp(String.raw`(?:[$¥₫]\s*)?\d(?:[\d.,]*\d)?\s*${UNIT}(?![\p{L}\d])|[$¥₫]\s*\d(?:[\d.,]*\d)?`, 'giu');
const NUMBER = /\d(?:[\d.,]*\d)?/g;

export const MASK = { email: '[email]', phone: '[số điện thoại]', account: '[số tài khoản]', money: '[số tiền]', number: '[số]' } as const;

/** Lệnh đã che: không còn chữ số, email, số điện thoại. Giữ nguyên chữ để phân loại ý định. */
export function sanitizePrompt(text: string): string {
  return text
    .replace(EMAIL, MASK.email)
    .replace(PHONE, MASK.phone)
    .replace(ACCOUNT, MASK.account)
    .replace(MONEY, MASK.money)
    .replace(NUMBER, MASK.number)
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500);
}

/** Kiểm tra nhanh: chuỗi đã che còn lộ chữ số hoặc email không. */
export const isMasked = (text: string) => !/\d/.test(text) && !/@[\p{L}\d.-]+\.[\p{L}]{2,}/u.test(text);
