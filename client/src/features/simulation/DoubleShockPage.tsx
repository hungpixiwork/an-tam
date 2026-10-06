// 03 · Mô phỏng cú sốc kép cho một lựa chọn cuộc đời (bố cục theo mockup).
// Nạp dữ liệu 1 lần (GET /simulations/context) → engine decisionSimulation chạy ngay trong trình duyệt:
// kéo thanh trượt / đổi Bull-Base-Bear không gọi server. "Lưu kết quả" và Agent vẫn tính lại ở server.

import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GraduationCap, Lightbulb, Repeat, Save } from 'lucide-react';
import type { DecisionMode, DecisionShock, DecisionShockParams } from '@shared/types/api/decision';
import { analyzeDecisionSimulation } from '@shared/engine/decisionSimulation';
import { Button, ErrorState, FormAlert, PageSkeleton, Select } from '@/components/ui';
import { useDecisionContext, useRunSimulation, type DecisionRequest } from '@/lib/queries';
import type { ApiError } from '@/lib/api';
import { useLocale } from '@/app/locale';
import { ShockPresets, ShockSetup } from './ShockSetup';
import { CashflowChart, ChoiceImpact, EstimatedImpact, GoalImpact, StepsList } from './ShockImpact';
import { AgentPlanUpdate } from './AgentPlanUpdate';

export default function DoubleShockPage({ choiceId: requested, initialMode, onChangeChoice, onNoChoice }: {
  choiceId: string | undefined; initialMode: DecisionMode; onChangeChoice: (id: string) => void; onNoChoice: () => ReactNode;
}) {
  const { t } = useLocale();
  const context = useDecisionContext(requested);
  const [mode, setMode] = useState<DecisionMode>(initialMode);
  const [shock, setShock] = useState<DecisionShock>('industry');
  const [params, setParams] = useState<DecisionShockParams | null>(null);
  const [picking, setPicking] = useState(false);
  const run = useRunSimulation();
  const [savedId, setSavedId] = useState<string | null>(null);

  const ctx = context.data;
  const current = params ?? ctx?.shocks.find((x) => x.shock === shock)?.params ?? null;
  // Tham số trễ một nhịp khi kéo nhanh → thanh trượt luôn mượt, kết quả bắt kịp ngay sau đó
  const deferred = useDeferredValue(current);
  const r = useMemo(
    () => (ctx && deferred ? analyzeDecisionSimulation(ctx.state, ctx.choice, ctx.option, { mode, shock, params: deferred }, ctx.extras) : null),
    [ctx, deferred, mode, shock],
  );

  if (context.isPending) return <PageSkeleton />;
  if (context.error) {
    if ((context.error as ApiError).status === 404) return <>{onNoChoice()}</>;
    return <ErrorState error={context.error} onRetry={() => context.refetch()} />;
  }
  const choiceId = ctx!.choice.id;
  const d = { title: ctx!.choice.title };
  const option = ctx!.option;
  const choices = { data: ctx!.choices };
  const request: DecisionRequest | null = current ? { choiceId, mode, shock, params: current } : null;

  const pickShock = (s: DecisionShock) => { setShock(s); setParams(null); setSavedId(null); };
  const save = () => request && run.mutate(request, { onSuccess: (x) => setSavedId(x.runId) });

  return (
    <div className="space-y-2.5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold leading-tight text-ink md:text-[26px]">{t('simulation.title')}</h1>
          <p className="hidden text-[13.5px] text-ink-soft md:mt-1 md:block">{t('simulation.subtitle')}</p>
        </div>
        <Link
          to={`/lua-chon?id=${encodeURIComponent(choiceId)}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-bold text-accent-700 shadow-sm hover:bg-accent-50 md:h-10 md:rounded-xl md:px-3.5 md:text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
          {t('simulation.back')}
        </Link>
      </div>

      {/* ── Choice Summary Bar ── */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line-subtle bg-white px-3 py-2.5 shadow-sm md:gap-4 md:rounded-2xl md:px-4 md:py-3 md:shadow-card" aria-label={t('simulation.choice.label')}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF4FF] text-accent-600 md:h-12 md:w-12">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-ink-soft md:text-[12.5px]">{t('simulation.choice.label')}:</p>
          <p className="truncate text-[15px] font-extrabold text-ink md:text-[17px]">{d.title}</p>
          {option.title !== d.title && <p className="text-[11.5px] text-ink-soft md:text-[12px]">{t('simulation.choice.option', { title: option.title })}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {picking && (choices.data?.length ?? 0) > 1 ? (
            <Select
              value={choiceId}
              onChange={(id) => { setPicking(false); onChangeChoice(id); }}
              label={t('simulation.choice.change')}
              options={(choices.data ?? []).map((c) => ({ value: c.id, label: c.title }))}
              className="max-w-[200px] md:max-w-[260px]"
            />
          ) : (
            <Button variant="white" size="sm" icon={Repeat} onClick={() => ((choices.data?.length ?? 0) > 1 ? setPicking(true) : undefined)} disabled={(choices.data?.length ?? 0) < 2}>
              {t('simulation.choice.change')}
            </Button>
          )}
        </div>
      </section>

      <ShockPresets value={shock} onPick={pickShock} />

      {current && (
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <ShockSetup params={current} onChange={(p) => { setParams(p); setSavedId(null); }} mode={mode} onMode={setMode} onReset={() => setParams(null)} />
          {r ? <EstimatedImpact r={r} /> : <div className="rounded-xl border border-line bg-white p-4 shadow-sm" role="status">{t('simulation.loading')}</div>}
        </div>
      )}

      {r && request && (
        <>
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
            <div className="min-w-0 space-y-2.5">
              <CashflowChart r={r} />
              <GoalImpact r={r} />
            </div>
            <ChoiceImpact r={r} />
            <StepsList r={r}>
              <AgentPlanUpdate request={request} choiceId={choiceId} choiceTitle={d.title} />
            </StepsList>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#F4F0FF] px-3.5 py-2.5 text-[12px] text-violet-800 md:rounded-2xl md:px-4 md:text-[12.5px]">
            <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{t('simulation.footer')}</span>
            <Button variant="white" size="sm" icon={Save} onClick={save} disabled={run.isPending}>{t('simulation.save')}</Button>
            {savedId && <Link to={`/mo-phong/ket-qua/${savedId}`} className="font-bold text-accent-700 hover:underline">{t('simulation.saved')}</Link>}
            <Link to={`/lua-chon?id=${encodeURIComponent(choiceId)}`} className="inline-flex items-center gap-1 font-bold text-accent-700 hover:underline">{t('simulation.back')}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
          </div>
          <FormAlert error={run.error} />
          <p className="text-[11px] leading-snug text-ink-mute">{r.basis}</p>
        </>
      )}
    </div>
  );
}
