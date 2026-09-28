/** Thay {biến} trong câu; không có khóa → trả lại khóa (giống t() ở shared/i18n/index.ts). */
export function interpolate(msgs: Record<string, string>, key: string, vars?: Record<string, string | number>): string {
  let str = msgs[key];
  if (str === undefined) return key;
  if (vars) for (const [k, v] of Object.entries(vars)) str = str.split(`{${k}}`).join(String(v));
  return str;
}
