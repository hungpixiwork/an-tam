// "Các lựa chọn khác": tình huống đã lưu khác (chuyển sang xem) + mẫu chưa thử (mở form tạo từ mẫu).

import { ArrowRight, BarChart3, Heart, Rocket, Shuffle, Sun, type LucideIcon } from 'lucide-react';
import type { LifeChoice, LifeChoiceTemplate } from '@shared/types/api';
import { useLifeChoiceTemplates } from '@/lib/queries/choices';
import { useLocale } from '@/app/locale';

const KIND_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  study: { icon: BarChart3, tone: 'text-accent-600 bg-[#EDF4FF]' },
  switch: { icon: Shuffle, tone: 'text-accent-600 bg-[#EDF4FF]' },
  startup: { icon: Rocket, tone: 'text-rose-500 bg-rose-50' },
  care: { icon: Heart, tone: 'text-rose-500 bg-rose-50' },
  sabbatical: { icon: Sun, tone: 'text-amber-500 bg-amber-50' },
  custom: { icon: BarChart3, tone: 'text-accent-600 bg-[#EDF4FF]' },
};

function Row({ kind, title, body, badge, action, onClick }: { kind: string; title: string; body: string; badge: string; action: string; onClick: () => void }) {
  const { icon: Icon, tone } = KIND_ICON[kind] ?? KIND_ICON.custom;
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 items-start gap-3 rounded-xl border border-line p-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <strong className="text-[13px] text-ink">{title}</strong>
          <span className="rounded-md bg-[#FFF3DC] px-1.5 py-0.5 text-[11px] font-semibold text-[#B86E00]">{badge}</span>
        </span>
        <small className="mt-0.5 line-clamp-2 block text-[11.5px] text-ink-soft">{body}</small>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 self-center text-[12px] font-bold text-accent-600">{action}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
    </button>
  );
}

export function Alternatives({ currentId, choices, onPick, onTemplate }: {
  currentId: string; choices: LifeChoice[]; onPick: (id: string) => void; onTemplate: (key: LifeChoiceTemplate['key']) => void;
}) {
  const { t } = useLocale();
  const templates = useLifeChoiceTemplates();
  const others = choices.filter((c) => c.id !== currentId);
  const usedKinds = new Set(choices.map((c) => c.kind));
  const fresh = (templates.data ?? []).filter((tpl) => !usedKinds.has(tpl.key)).slice(0, Math.max(0, 3 - others.length));
  if (!others.length && !fresh.length) return null;
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="alt-title">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <h2 id="alt-title" className="text-[17px] font-bold text-ink">{t('choices.alternatives.title')}</h2>
        <span className="text-[12px] text-ink-soft">{t('choices.alt.subtitle')}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {others.map((c) => (
          <Row key={c.id} kind={c.kind} title={c.title} body={c.description} badge={t('choices.alt.saved')} action={t('choices.scenario.details')} onClick={() => onPick(c.id)} />
        ))}
        {fresh.map((tpl) => (
          <Row key={tpl.key} kind={tpl.key} title={tpl.title} body={tpl.description} badge={t('choices.alt.try')} action={t('choices.alt.create')} onClick={() => onTemplate(tpl.key)} />
        ))}
      </div>
    </section>
  );
}
