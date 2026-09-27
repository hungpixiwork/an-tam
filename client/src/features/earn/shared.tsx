// Tiện ích dùng chung cho các khối trang Tăng thu nhập.

import { Info, type LucideIcon } from 'lucide-react';
import { BarChart3, Bot, LayoutTemplate, Sparkles } from 'lucide-react';
import type { SkillTag } from '@shared/types/api';
import type { ExtTone } from '@/components/ui';

/** 5000000 → "5"; 2500000 → "2,5" (vi) / "2.5". */
export const millions = (v: number, locale: string) => {
  const s = String(Math.round((v / 1e6) * 10) / 10);
  return locale === 'vi' ? s.replace('.', ',') : s;
};

/** Số giờ 1.5 → "1,5" (vi). */
export const decimal = (v: number, locale: string) => (locale === 'vi' ? String(v).replace('.', ',') : String(v));

export const TAG_STYLE: Record<SkillTag, { icon: LucideIcon; tone: ExtTone; cell: string }> = {
  data: { icon: BarChart3, tone: 'violet', cell: 'bg-[#F4F0FF] border-[#E4DAFD]' },
  ai_automation: { icon: Bot, tone: 'green', cell: 'bg-[#FFF6E9] border-[#FBE3BD]' },
  nocode: { icon: LayoutTemplate, tone: 'blue', cell: 'bg-[#EEF8F1] border-[#D3EEDC]' },
  other: { icon: Sparkles, tone: 'amber', cell: 'bg-slate-50 border-line' },
};

/** Biểu tượng ⓘ có chú thích khi rê chuột / đọc màn hình. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="inline-flex cursor-help text-ink-mute" title={text} aria-label={text} role="img">
      <Info className="h-4 w-4" aria-hidden />
    </span>
  );
}
