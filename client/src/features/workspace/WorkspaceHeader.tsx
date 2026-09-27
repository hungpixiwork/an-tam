import { Bot } from 'lucide-react';
import { useLocale } from '@/app/locale';
import { cx } from '@/components/ui';
import { AGENT_META } from './meta';

const ORBIT: { key: keyof typeof AGENT_META; pos: string }[] = [
  { key: 'cashflow', pos: 'left-[30%] top-0' },
  { key: 'skill', pos: 'right-2 top-0' },
  { key: 'calendar', pos: 'left-0 top-[46%]' },
  { key: 'goal', pos: 'right-0 top-[46%]' },
];

/** Tiêu đề trang + hộp "Nhiều AI Agent phối hợp…" với minh họa agent. */
export function WorkspaceHeader() {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-8">
        <h1 className="text-[28px] font-extrabold leading-tight text-ink sm:text-[32px]">{t('workspace.title')}</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t('workspace.subtitle')}</p>
      </div>
      <div className="relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#DCE9F8] bg-[#F3F8FE] px-5 py-3 lg:col-span-4">
        <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
          <strong className="font-bold text-accent-600">{t('workspace.note_strong')}</strong> {t('workspace.note_rest')}
        </p>
        <div className="relative hidden h-[76px] w-[150px] shrink-0 sm:block" aria-hidden>
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-md">
            <Bot className="h-7 w-7" />
          </span>
          {ORBIT.map(({ key, pos }) => {
            const Icon = AGENT_META[key].icon;
            return (
              <span key={key} className={cx('absolute flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-line', pos)}>
                <Icon className="h-4 w-4 text-ink-soft" />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
