// Chia đều chi phí + link ảnh VietQR để bạn bè quét chuyển khoản. Tiền là số nguyên VND.

/** Làm tròn phần mỗi người tới bội số này cho dễ chuyển khoản. */
export const SPLIT_ROUNDING = 1_000;

/**
 * Chia `total` cho `people` người. Người trả tiền (vị trí 0) nhận phần lẻ để tổng luôn khớp đúng;
 * những người còn lại trả số tròn nghìn.
 */
export function splitEvenly(total: number, people: number): number[] {
  if (!Number.isInteger(total) || total <= 0) throw new Error('total must be a positive integer');
  if (!Number.isInteger(people) || people < 1) throw new Error('people must be >= 1');
  if (people === 1) return [total];
  // floor (không round): nếu làm tròn lên, phần người trả có thể thành âm (vd 50.000 / 30 người).
  const each = Math.floor(total / people / SPLIT_ROUNDING) * SPLIT_ROUNDING;
  const others = Array.from({ length: people - 1 }, () => each);
  return [total - each * (people - 1), ...others];
}

export interface PayoutAccount { bankBin: string; accountNo: string; accountName: string }

/** Tên chủ tài khoản kiểu VietQR: bỏ dấu, in hoa. */
export const vietQrName = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/** Ảnh QR chuyển khoản (img.vietqr.io, mẫu compact2) với số tiền và nội dung điền sẵn. */
export function vietQrUrl(account: PayoutAccount, amount: number, addInfo: string): string {
  const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: addInfo.slice(0, 50), accountName: vietQrName(account.accountName) });
  return `https://img.vietqr.io/image/${account.bankBin}-${account.accountNo}-compact2.png?${q.toString()}`;
}
