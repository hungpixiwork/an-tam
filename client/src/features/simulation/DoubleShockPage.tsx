// 03 · Mô phỏng cú sốc kép cho một lựa chọn cuộc đời (bố cục theo mockup).
// Kéo thanh trượt → POST /simulations/preview (debounce) → engine decisionSimulation (Bull/Base/Bear, 24 tháng).

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GraduationCap, Lightbulb, Repeat, Save } from 'lucide-react';
import type { DecisionMode, DecisionShock, DecisionShockParams } from '@shared/types/api/decision';
import { Button, ErrorState, FormAlert, PageSkeleton, Select } from '@/components/ui';
import { useDecisionPreview, useLifeChoice, useLifeChoices, usePresets, useRunSimulation, type DecisionRequest } from '@/lib/queries';
import { useLocale } from '@/app/locale';
import { ShockPresets, ShockSetup } from './ShockSetup';
import { CashflowChart, ChoiceImpact, EstimatedImpact, GoalImpact, StepsList } from './ShockImpact';
import { AgentPlanUpdate } from './AgentPlanUpdate';

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function DoubleShockPage({ choiceId, initialMode, onChangeChoice }: { choiceId: string; initialMode: DecisionMode; onChangeChoice: (id: string) => void }) {
  const { t } = useLocale();
  const presets = usePresets();
  const choices = useLifeChoices();
  const detail = useLifeChoice(choiceId);
  const [mode, setMode] = useState<DecisionMode>(initialMode);
  const [shock, setShock] = useState<DecisionShock>('industry');
  const [params, setParams] = useState<DecisionShockParams | null>(null);
  const [picking, setPicking] = useState(false);
  const run = useRunSimulation();
  const [savedId, setSavedId] = useState<string | null>(null);

  const presetOf = (s: DecisionShock) => presets.data?.shocks.find((x) => x.shock === s)?.params ?? null;
  const current = params ?? presetOf(shock);
  const request: DecisionRequest | null = current ? { choiceId, mode, shock, params: current } : null;
  const preview = useDecisionPreview(useDebounced(request));

  if (presets.isPending || detail.isPending) return <PageSkeleton />;
  if (presets.error || detail.error) return <ErrorState error={presets.error ?? detail.error} onRetry={() => { presets.refetch(); detail.refetch(); }} />;
  const d = detail.data;
  const option = d.options.find((o) => o.selected) ?? d.options[0];
  const r = preview.data;

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
          {option && d.options.length > 1 && <p className="text-[12px] text-ink-soft">{t('simulation.choice.option', { title: option.title })}</p>}
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
      {preview.error && <ErrorState error={preview.error} onRetry={() => preview.refetch()} />}

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
