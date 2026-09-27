// Trang 8 — AI Workspace · MCP · Agents (mockup 8).
// Dữ liệu: GET /api/agents, /api/agent/runs/latest|:id (poll), /api/calendar?week, /api/integrations;
// ghi: POST /api/agent/runs, approve-batch / reject / request-changes (Idempotency-Key), PATCH /api/calendar/proposals/:id.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/app/locale';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui';
import { Bot } from 'lucide-react';
import {
  useAgentRun, useAgents, useApproveBatch, useCalendarWeek, useEditProposal, useIntegrationStatus, useRejectActions, useRequestChanges, useStartRun,
} from '@/lib/queries';
import { WorkspaceHeader } from './WorkspaceHeader';
import { AgentTeam } from './AgentTeam';
import { CommandCard } from './CommandCard';
import { WeekPlanCard } from './WeekPlanCard';
import { ActivityLog } from './ActivityLog';

export default function WorkspacePage() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const agents = useAgents();
  const runQ = useAgentRun(runId);
  const run = runQ.data ?? null;
  const week = useCalendarWeek(run?.weekStart ?? new Date(Date.now() + 7 * 3_600_000 + 7 * 86_400_000).toISOString().slice(0, 10));
  const google = useIntegrationStatus();
  const start = useStartRun();
  const approve = useApproveBatch();
  const reject = useRejectActions();
  const request = useRequestChanges();
  const edit = useEditProposal();

  if (agents.isPending || runQ.isPending) return <PageSkeleton />;
  if (agents.error || runQ.error) return <ErrorState error={agents.error ?? runQ.error} onRetry={() => { agents.refetch(); runQ.refetch(); }} />;

  const pendingIds = run?.actions.filter((a) => a.status === 'pending').map((a) => a.id) ?? [];
  const busy = approve.isPending ? 'approve' : reject.isPending ? 'reject' : request.isPending ? 'request' : edit.isPending ? 'edit' : null;
  const fail = (e: unknown) => setMessage(e instanceof Error ? e.message : String(e));

  return (
    <div className="space-y-4">
      <WorkspaceHeader />
      <AgentTeam agents={agents.data} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <CommandCard
            run={run}
            pending={start.isPending}
            onSubmit={(prompt) => {
              setMessage(null);
              start.mutate(prompt, { onSuccess: (r) => setRunId(r.id), onError: fail });
            }}
          />
          {run ? (
            <WeekPlanCard
              run={run}
              weekEvents={week.data?.events ?? []}
              googleConnected={google.google === 'connected'}
              busy={busy}
              message={message}
              onApprove={() =>
                approve.mutate(pendingIds, {
                  onSuccess: (r) => {
                    const done = r.results.filter((x) => x.status === 'done').length;
                    setMessage(t('workspace.done.summary', { done, total: r.results.length }));
                  },
                  onError: fail,
                })
              }
              onReject={() => reject.mutate(pendingIds, { onError: fail })}
              onRequest={(note) => {
                const first = pendingIds[0];
                if (first) request.mutate({ id: first, note }, { onSuccess: (r) => r.runId && setRunId(r.runId), onError: fail });
              }}
              onEdit={(events) => {
                const cal = run.actions.find((a) => a.type === 'calendar.create_events');
                if (cal) edit.mutate({ id: cal.id, events }, { onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-run'] }), onError: fail });
              }}
            />
          ) : (
            <EmptyState icon={Bot} tone="teal" title={t('workspace.command.title')} body={t('workspace.empty')} />
          )}
        </div>
        <div className="min-w-0 xl:col-span-4">{run && <ActivityLog run={run} />}</div>
      </div>
    </div>
  );
}
