import { useState, type FormEvent } from 'react';
import { Bot, Loader2, Send, ShieldCheck } from 'lucide-react';
import type { AgentRunView } from '@shared/types/api';
import { useLocale } from '@/app/locale';
import { cx } from '@/components/ui';
import { AGENT_META, isAgentKey } from './meta';

/** Câu trả lời của Planner ghép từ các ý định đã phân loại (không lưu văn bản tự do). */
function useReply(run: AgentRunView | null) {
  const { t } = useLocale();
  if (!run) return null;
  if (!run.actions.length) return t('workspace.reply.none');
  const parts = run.intents.map((i) => t(`workspace.reply.${i}`));
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} ${t('workspace.reply.and')} ${parts[parts.length - 1]}` : parts[0];
  return `${t('workspace.reply.intro')} ${joined}. ${t('workspace.reply.outro')}`;
}

/** Ra lệnh cho đội ngũ AI: ô lệnh → lời nhắc (đã che) → trả lời → chip agent đang phối hợp. */
export function CommandCard({ run, onSubmit, pending }: { run: AgentRunView | null; onSubmit: (prompt: string) => void; pending: boolean }) {
  const { t } = useLocale();
  const [text, setText] = useState('');
  const reply = useReply(run);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 3 || pending) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <section aria-labelledby="cmd-title" className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
      <h2 id="cmd-title" className="mb-3 flex items-center gap-2.5 text-[18px] font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
          <Bot className="h-5 w-5" aria-hidden />
        </span>
        {t('workspace.command.title')}
      </h2>

      <div className="space-y-3 sm:pl-11">
        {run && <p className="rounded-xl border border-[#DCE9F8] bg-[#F3F8FE] px-4 py-2.5 text-[14px] text-ink">{run.promptMasked}</p>}

        {reply && (
          <div className="flex items-start gap-3 sm:-ml-11">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            <p className="min-w-0 max-w-[640px] rounded-xl bg-slate-50 px-4 py-2.5 text-[14px] leading-relaxed text-ink">{reply}</p>
          </div>
        )}

        {run && run.agents.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12.5px] font-medium text-ink-soft">{t('workspace.command.coordinating')}</span>
            {run.agents.filter(isAgentKey).map((k) => {
              const m = AGENT_META[k];
              return (
                <span key={k} className={cx('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold', m.chip)}>
                  <m.icon className="h-3.5 w-3.5" aria-hidden />
                  {t(`workspace.agent.${k}`)}
                </span>
              );
            })}
          </div>
        )}

        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="agent-cmd" className="sr-only">{t('workspace.command.label')}</label>
          <input
            id="agent-cmd"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={t('workspace.command.placeholder')}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[13.5px] text-ink placeholder:text-ink-mute focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
          />
          <button
            type="submit"
            disabled={pending || text.trim().length < 3}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent-600 px-4 text-[13.5px] font-semibold text-white hover:bg-accent-700 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {t('workspace.command.send')}
          </button>
        </form>
        <p className="flex items-center gap-1.5 text-[12px] text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-success-500" aria-hidden />
          {t('workspace.command.privacy')}
          {run?.intentSource === 'llm' && <span className="ml-1 text-ink-mute">· {t('workspace.reply.ai')}</span>}
        </p>
      </div>
    </section>
  );
}
