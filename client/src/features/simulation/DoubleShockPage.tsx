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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight text-ink">{t('simulation.title')}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">{t('simulation.subtitle')}</p>
        </div>
        <Link to={`/lua-chon?id=${encodeURIComponent(choiceId)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[13px] font-bold text-accent-700 shadow-sm hover:bg-accent-50">
          <ArrowLeft className="h-4 w-4" aria-hidden />{t('simulation.back')}
        </Link>
      </div>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 shadow-card" aria-label={t('simulation.choice.label')}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EDF4FF] text-accent-600"><GraduationCap className="h-6 w-6" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-ink-soft">{t('simulation.choice.label')}:</p>
          <p className="text-[17px] font-extrabold text-ink">{d.title}</p>
          {option.title !== d.title && <p className="text-[12px] text-ink-soft">{t('simulation.choice.option', { title: option.title })}</p>}
        </div>
        <p className="hidden max-w-[420px] border-l border-line pl-4 text-[12.5px] text-ink-soft lg:block">{t('simulation.choice.hint')}</p>
        <div className="ml-auto flex items-center gap-2">
          {picking && (choices.data?.length ?? 0) > 1 ? (
            <Select
              value={choiceId}
              onChange={(id) => { setPicking(false); onChangeChoice(id); }}
              label={t('simulation.choice.change')}
              options={(choices.data ?? []).map((c) => ({ value: c.id, label: c.title }))}
              className="max-w-[260px]"
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
          {r ? <EstimatedImpact r={r} /> : <div className="rounded-2xl border border-line bg-white p-4 shadow-card" role="status">{t('simulation.loading')}</div>}
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
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F4F0FF] px-4 py-2.5 text-[12.5px] text-violet-800">
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
