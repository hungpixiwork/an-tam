import { Check, CircleCheck, Info, Loader2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AgentInfo } from '@shared/types/api';
import { useLocale } from '@/app/locale';
import { IconTile, cx } from '@/components/ui';
import { AGENT_META, ago } from './meta';

/** "Đội ngũ Agent của bạn": 5 thẻ ngang — trạng thái + việc gần nhất (GET /api/agents). */
export function AgentTeam({ agents }: { agents: AgentInfo[] }) {
  const { t } = useLocale();
  return (
    <section aria-labelledby="agent-team" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="agent-team" className="flex items-center gap-2 text-[17px] font-bold text-ink">
          {t('workspace.team.title')}
          <span title={t('workspace.team.info')} className="text-ink-mute">
            <Info className="h-4 w-4" aria-label={t('workspace.team.info')} />
          </span>
        </h2>
        <Link to="/nhat-ky-ai" className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-1.5 text-[13px] font-semibold text-accent-700 hover:bg-accent-100">
          <Settings className="h-4 w-4" aria-hidden />
          {t('workspace.team.manage')}
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {agents.map((a) => {
          const m = AGENT_META[a.key];
          return (
            <li key={a.key} className="min-w-0 rounded-xl border border-line p-3.5">
              <div className="flex items-start gap-3">
                <IconTile icon={m.icon} tone={m.tone} size="lg" className="!rounded-full" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">{t(`workspace.agent.${a.key}`)}</p>
                  <span
                    className={cx(
                      'mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold',
                      a.status === 'idle' ? 'bg-slate-100 text-ink-soft' : 'bg-success-50 text-success-600',
                    )}
                  >
                    {a.status === 'working' ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Check className="h-3 w-3" aria-hidden />}
                    {t(`workspace.status.${a.status}`)}
                  </span>
                  <p className="mt-1.5 text-[12.5px] text-ink-soft">{t(`workspace.role.${a.key}`)}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
                <CircleCheck className={cx('mt-0.5 h-4 w-4 shrink-0', a.lastActivity ? 'text-success-500' : 'text-ink-mute')} aria-hidden />
                {a.lastActivity ? (
                  <span className="min-w-0">
                    {a.lastActivity.title} <span className="whitespace-nowrap">({ago(a.lastActivity.at, t)})</span>
                  </span>
                ) : (
                  <span>{t('workspace.last.none')}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
