import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import type { Locale } from '@shared/i18n';
import { useLocale } from '@/app/locale';
import { cx } from '@/components/ui';

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export function LanguageSelector({
  className,
  variant = 'button',
}: {
  className?: string;
  variant?: 'button' | 'pill';
}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentLang = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  if (variant === 'pill') {
    return (
      <div className={cx('inline-flex items-center rounded-xl border border-line bg-white p-1 shadow-sm', className)}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              locale === l.code
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-ink-soft hover:bg-slate-50 hover:text-ink',
            )}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cx('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      >
        <Globe className="h-4 w-4 text-primary-600" aria-hidden />
        <span className="hidden sm:inline">{currentLang.flag}</span>
        <span>{currentLang.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-50',
                locale === l.code ? 'font-semibold text-primary-700 bg-primary-50/50' : 'text-ink',
              )}
            >
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </span>
              {locale === l.code && <Check className="h-3.5 w-3.5 text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
