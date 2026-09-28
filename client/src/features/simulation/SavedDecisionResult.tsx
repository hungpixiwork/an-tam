// Kết quả mô phỏng cú sốc kép đã lưu (/mo-phong/ket-qua/:runId) — cùng các khối với trang xem trước, chỉ đọc.

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { DecisionSimulationResult } from '@shared/types/api/decision';
import { useLocale } from '@/app/locale';
import { CashflowChart, ChoiceImpact, EstimatedImpact, GoalImpact, StepsList } from './ShockImpact';

export function SavedDecisionResult({ r, createdAt }: { r: DecisionSimulationResult; createdAt: string }) {
  const { t } = useLocale();
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold leading-tight text-ink">{t('simulation.saved_title', { title: r.choiceTitle })}</h1>
          <p className="mt-1 text-[13px] text-ink-soft">{t('simulation.saved_sub', { option: r.optionTitle, date: createdAt.slice(0, 10), shock: t(`simulation.shock.${r.shock}`) })}</p>
        </div>
        <Link to={`/mo-phong?choiceId=${encodeURIComponent(r.choiceId)}&mode=${r.mode}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[13px] font-bold text-accent-700 shadow-sm hover:bg-accent-50">
          <ArrowLeft className="h-4 w-4" aria-hidden />{t('simulation.rerun')}
        </Link>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <EstimatedImpact r={r} />
        <CashflowChart r={r} />
      </div>
      <GoalImpact r={r} />
      <div className="grid gap-2.5 xl:grid-cols-2">
        <ChoiceImpact r={r} />
        <StepsList r={r} />
      </div>
      <p className="text-[11px] leading-snug text-ink-mute">{r.basis}</p>
    </div>
  );
}
