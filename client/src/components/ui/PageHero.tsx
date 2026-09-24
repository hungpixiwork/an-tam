import type { ReactNode } from 'react';
import { cx } from './core';
import { Rich } from './data';

/** Chuỗi được render qua <Rich/>: hỗ trợ {em:..} và xuống dòng (kể cả "\n" dạng chữ viết trong JSX attribute). */
const text = (v: ReactNode) => (typeof v === 'string' ? <Rich text={v.replace(/\\n/g, '\n')} /> : v);

/**
 * Banner đầu trang: nền gradient xanh nhạt, chữ bên trái, minh họa pixel art bên phải
 * (mép trái của minh họa mờ dần vào nền để chữ luôn đọc rõ).
 */
export function PageHero({ eyebrow, title, highlight, subtitle, scene, className, sceneWidth = '64%' }: {
  eyebrow?: ReactNode;
  /** Dòng 1 — chữ đậm màu navy. */
  title: ReactNode;
  /** Dòng 2 (tùy chọn) — chữ đậm, có thể chứa phần nhấn màu primary. */
  highlight?: ReactNode;
  subtitle?: ReactNode;
  /** Scene pixel art, nhận className để phủ kín khung. */
  scene?: (className: string) => ReactNode;
  className?: string;
  sceneWidth?: string;
}) {
  return (
    <section className={cx('relative isolate min-h-[180px] overflow-hidden rounded-2xl border border-[#DCEAF6] bg-gradient-to-r from-[#EAF4FB] via-[#E4F0FA] to-[#DCEBF7]', className)}>
      {scene && (
        <div className="absolute inset-y-0 right-0 -z-10 hidden md:block" style={{ width: sceneWidth }} aria-hidden={false}>
          {scene('h-full w-full [mask-image:linear-gradient(to_right,transparent,black_24%)]')}
        </div>
      )}
      <div className="relative max-w-[760px] px-6 py-6 md:px-9 md:py-7">
        {eyebrow && <p className="mb-2 text-[15px] font-medium text-ink">{text(eyebrow)}</p>}
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-[30px]">{text(title)}</h2>
        {highlight && <p className="mt-1 text-[22px] font-bold leading-tight text-ink md:text-[26px]">{text(highlight)}</p>}
        {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{text(subtitle)}</p>}
      </div>
    </section>
  );
}
