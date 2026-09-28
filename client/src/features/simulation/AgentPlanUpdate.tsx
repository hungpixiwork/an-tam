// "Cập nhật lại kế hoạch ở Lựa chọn cuộc đời": gửi đúng mô phỏng đang xem cho Agent (hàng đợi Agents SDK theo người dùng),
// Agent chạy engine → đề xuất lùi tháng bắt đầu + việc mới (chờ duyệt). Duyệt → ghi vào lựa chọn → sang trang Lựa chọn.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Loader2 } from 'lucide-react';
import { ApprovalBar, FormAlert } from '@/components/ui';
import { useAgentRun, useApproveBatch, useRejectActions, useStartDecisionRun, type DecisionRequest } from '@/lib/queries';
import { useLocale } from '@/app/locale';

function RunStatus({ runId, choiceId }: { runId: string; choiceId: string }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const run = useAgentRun(runId);
  const approve = useApproveBatch();
  const reject = useRejectActions();
  const r = run.data;
  if (!r || r.status === 'running') {
    return <p className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-soft" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t('simulation.agent.running')}</p>;
  }
  const action = r.actions.find((a) => a.type === 'life_choice.update_plan');
  return (
    <div className="mt-3 rounded-xl border border-[#D9E7FB] bg-[#F5F9FF] p-3" aria-live="polite">
      <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />{r.reply ?? t('simulation.agent.done')}</p>
      {r.status === 'failed' && <p className="mt-1 text-[12px] text-danger-600">{t('simulation.agent.failed')}</p>}
      {action && (
        <div className="mt-2">
          <p className="text-[12.5px] font-bold text-ink">{action.title}</p>
          {action.preview?.before && action.preview.after && (
            <p className="text-[12px] text-ink-soft">{t('simulation.agent.start_change', { from: action.preview.before, to: action.preview.after })}</p>
          )}
          <ul className="mt-1 list-disc pl-5 text-[12px] text-ink-soft">
            {action.preview?.lines.slice(0, 5).map((l) => <li key={l}>{l.replace(/^\+ /, '')}</li>)}
          </ul>
          {action.status === 'pending' ? (
            <ApprovalBar
              className="mt-2"
              busy={approve.isPending || reject.isPending}
              labels={{ approve: t('simulation.agent.approve'), reject: t('simulation.agent.reject') }}
              onApprove={() => approve.mutate([action.id], { onSuccess: () => navigate(`/lua-chon?id=${encodeURIComponent(choiceId)}`) })}
              onReject={() => reject.mutate([action.id])}
            />
          ) : (
            <p className="mt-1 text-[12px] font-semibold text-ink-soft">{t(`simulation.agent.status_${action.status === 'done' ? 'done' : action.status === 'rejected' ? 'rejected' : 'other'}`)}</p>
          )}
          <FormAlert error={approve.error ?? reject.error} />
        </div>
      )}
    </div>
  );
}

export function AgentPlanUpdate({ request, choiceId, choiceTitle }: { request: DecisionRequest; choiceId: string; choiceTitle: string }) {
  const { t } = useLocale();
  const start = useStartDecisionRun();
  const [runId, setRunId] = useState<string | null>(null);
  const submit = () =>
    start.mutate(
      { prompt: t('simulation.agent.prompt', { title: choiceTitle }), decision: { ...request, choiceId } },
      { onSuccess: (r) => setRunId(r.runId) },
    );
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={submit}
        disabled={start.isPending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B5E44] px-3 py-2 text-[13.5px] font-bold text-white shadow-sm hover:bg-[#094D38] disabled:opacity-60"
      >
        {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {t('simulation.agent.cta')}<ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      <FormAlert error={start.error} />
      {runId && <RunStatus runId={runId} choiceId={choiceId} />}
    </div>
  );
}
