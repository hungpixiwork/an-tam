import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoreHorizontal, Quote, type LucideIcon } from 'lucide-react';
import { IconTile, TONE_EXT, cx, type ExtTone } from './core';

/* ───────── Section card ───────── */

export interface SectionAction {
  label: ReactNode;
  to?: string;
  onClick?: () => void;
  /** `link` = chữ xanh "Xem tất cả →"; `pill` = nút viền nhạt "Xem chi tiết →". */
  variant?: 'link' | 'pill';
}

function ActionLink({ action }: { action: SectionAction }) {
  const cls =
    action.variant === 'pill'
      ? 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent-100 bg-white px-3 text-[12.5px] font-semibold text-accent-600 hover:bg-accent-50'
      : 'inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-accent-600 hover:text-accent-700';
  const inner = (
    <>
      {action.label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </>
  );
  if (action.to) {
    return (
      <Link to={action.to} onClick={action.onClick} className={cx(cls, 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600')}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cx(cls, 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600')}>
      {inner}
    </button>
  );
}

export interface SectionCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  iconTone?: ExtTone;
  /** Hiện icon trong ô màu (IconTile) thay vì icon trơn. */
  iconTile?: boolean;
  action?: SectionAction;
  /** Badge/nhãn cạnh tiêu đề ("Beta", "5/6"). */
  badge?: ReactNode;
  /** Vùng tùy biến bên phải header (bộ lọc, tabs…) — hiển thị trước `action`. */
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
}

/** Card có header "Tiêu đề · badge ……… Xem tất cả →" theo mockup. */
export function SectionCard({ title, subtitle, icon: Icon, iconTone = 'green', iconTile, action, badge, extra, children, className, bodyClassName, as: As = 'section' }: SectionCardProps) {
  const headingId = useId();
  return (
    <As aria-labelledby={headingId} className={cx('min-w-0 rounded-2xl border border-line bg-white p-5 shadow-card', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (iconTile ? <IconTile icon={Icon} tone={iconTone} size="sm" /> : <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', TONE_EXT[iconTone].text)} strokeWidth={2.2} aria-hidden />)}
          <div className="min-w-0">
            <h2 id={headingId} className="flex flex-wrap items-center gap-2 text-[17px] font-bold leading-snug text-ink">
              {title}
              {badge}
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
        </div>
        {(extra || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {extra}
            {action && <ActionLink action={action} />}
          </div>
        )}
      </div>
      <div className={bodyClassName}>{children}</div>
    </As>
  );
}

/* ───────── Tabs ───────── */

export interface TabItem<K extends string = string> { key: K; label: ReactNode; count?: number }

export interface TabsProps<K extends string = string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  /** id của panel để gắn aria-controls (tùy chọn). */
  panelId?: string;
  className?: string;
}

/** Tabs gạch chân (mockup Quỹ an toàn "Tất cả (4) | Ngắn hạn (2)"), điều hướng bằng ←/→/Home/End. */
export function Tabs<K extends string = string>({ items, value, onChange, ariaLabel, panelId, className }: TabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].key);
  };
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((item, i) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${baseId}-${item.key}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              '-mb-px inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-3 text-[13.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600',
              active ? 'border-accent-600 text-accent-600' : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="tabular-nums">({item.count})</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── List row ───────── */

const VALUE_TONE = {
  positive: 'text-success-600',
  negative: 'text-danger-600',
  neutral: 'text-ink',
  muted: 'text-ink-soft',
} as const;

export interface ListRowProps {
  icon: LucideIcon;
  iconTone?: ExtTone;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Giá trị bên phải (đã định dạng). */
  value?: ReactNode;
  valueTone?: keyof typeof VALUE_TONE;
  badge?: ReactNode;
  /** Có → hiện nút "⋯". */
  onMenu?: (e: MouseEvent<HTMLButtonElement>) => void;
  menuLabel?: string;
  /** Cả dòng bấm được (điều hướng). */
  to?: string;
  onClick?: () => void;
  /** Nội dung tùy ý cuối dòng (ví dụ chevron). */
  trailing?: ReactNode;
  className?: string;
}

/** Dòng danh sách: icon · tiêu đề/phụ đề · badge · giá trị · ⋯ (giao dịch, hóa đơn, cơ hội…). */
export function ListRow({ icon, iconTone = 'blue', title, subtitle, value, valueTone = 'neutral', badge, onMenu, menuLabel = 'Thêm thao tác', to, onClick, trailing, className }: ListRowProps) {
  const body = (
    <>
      <IconTile icon={icon} tone={iconTone} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{subtitle}</p>}
        {badge && <div className="mt-1 sm:hidden">{badge}</div>}
      </div>
      {badge && <div className="hidden shrink-0 sm:block">{badge}</div>}
      {value !== undefined && <p className={cx('shrink-0 text-right text-[14px] font-bold tabular-nums', VALUE_TONE[valueTone])}>{value}</p>}
    </>
  );
  const interactive = 'rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600 hover:bg-slate-50';
  return (
    <div className={cx('flex items-center gap-2', className)}>
      {to ? (
        <Link to={to} onClick={onClick} className={cx('flex min-w-0 flex-1 items-center gap-3 px-1 py-2', interactive)}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cx('flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-left', interactive)}>
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2">{body}</div>
      )}
      {trailing}
      {onMenu && (
        <button type="button" onClick={onMenu} aria-label={menuLabel} className="shrink-0 rounded-lg p-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600">
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ───────── Quote ───────── */

/** Thẻ trích dẫn trắng với dấu “ lớn (góc hero banner). `text` hỗ trợ xuống dòng bằng \n. */
export function QuoteCard({ text, className }: { text: ReactNode; className?: string }) {
  return (
    <figure className={cx('flex gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-soft', className)}>
      <Quote className="h-6 w-6 shrink-0 rotate-180 fill-accent-600 text-accent-600" aria-hidden />
      <blockquote className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-ink">{text}</blockquote>
    </figure>
  );
}

/* ───────── Menu ⋯ ───────── */

export interface MenuItem { label: ReactNode; onSelect: () => void; disabled?: boolean }

/** Nút "⋯" mở danh sách thao tác nhỏ (Ẩn hôm nay, Đánh dấu xong…). Đóng khi bấm ra ngoài hoặc Esc. */
export function MenuButton({ items, label, className }: { items: MenuItem[]; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className={cx('relative shrink-0', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1 text-ink-soft hover:bg-black/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-[168px] rounded-xl border border-line bg-white p-1 shadow-lift">
          {items.map((it, i) => (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
