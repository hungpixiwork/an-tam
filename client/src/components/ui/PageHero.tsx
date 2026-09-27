import type { ReactNode } from 'react';
import { cx } from './core';
import { Rich } from './data';
import { QuoteCard } from './layout';

/** Chuỗi được render qua <Rich/>: hỗ trợ {em:..} và xuống dòng (kể cả "\n" dạng chữ viết trong JSX attribute). */
const text = (v: ReactNode) => (typeof v === 'string' ? <Rich text={v.replace(/\\n/g, '\n')} /> : v);

export interface HeroBannerProps {
  eyebrow?: ReactNode;
  /** Tiêu đề lớn (H2 mặc định; topbar giữ H1 ẩn cho trình đọc màn hình). */
  title: ReactNode;
  /** Dòng nhấn thứ hai — hỗ trợ {em:...} để tô xanh. */
  highlight?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  /** Trích dẫn trong thẻ trắng phía phải. */
  quote?: ReactNode;
  /** Ảnh minh họa bên phải (ví dụ "/hero-lake-city.jpg"). */
  image?: string;
  /** Alt của ảnh; truyền "" nếu ảnh chỉ để trang trí. */
  imageAlt?: string;
  /** `object-position` của ảnh (mặc định "center"). */
  imagePosition?: string;
  /** Scene tùy biến (pixel art) thay cho `image`; nhận className để phủ kín khung. */
  scene?: (className: string) => ReactNode;
  /** Bề rộng vùng minh họa trên màn ≥ md. */
  visualWidth?: string;
  headingLevel?: 'h1' | 'h2';
  /** Nút hành động dưới phần chữ. */
  children?: ReactNode;
  className?: string;
}

const MASK = '[mask-image:linear-gradient(to_right,transparent,black_28%)]';

/**
 * Banner đầu trang theo mockup: nền gradient xanh nhạt, chữ bên trái, ảnh minh họa bên phải
 * (mép trái ảnh mờ dần vào nền để chữ luôn đọc rõ), thẻ trích dẫn nổi trên ảnh.
 */
export function HeroBanner({
  eyebrow, title, highlight, subtitle, description, quote, image, imageAlt = '', imagePosition = 'center',
  scene, visualWidth = '58%', headingLevel = 'h2', children, className,
}: HeroBannerProps) {
  const H = headingLevel;
  const hasVisual = !!(image || scene);
  return (
    <section className={cx('relative isolate min-h-[168px] overflow-hidden rounded-2xl border border-[#DCEAF6] bg-gradient-to-r from-[#EEF6FC] via-[#E8F2FB] to-[#DFEEF8]', className)}>
      {hasVisual && (
        <div className="absolute inset-y-0 right-0 -z-10 hidden md:block" style={{ width: visualWidth }}>
          {scene ? (
            scene(cx('h-full w-full', MASK))
          ) : (
            <img src={image} alt={imageAlt} className={cx('h-full w-full object-cover', MASK)} style={{ objectPosition: imagePosition }} loading="eager" decoding="async" />
          )}
        </div>
      )}
      <div className="relative flex items-start gap-6 px-6 py-6 md:px-8 md:py-7">
        <div className="min-w-0 max-w-[760px] flex-1">
          {eyebrow && <p className="mb-2 text-[15px] font-medium text-ink">{text(eyebrow)}</p>}
          <H className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-[32px]">{text(title)}</H>
          {highlight && <p className="mt-1.5 text-[18px] font-bold leading-snug text-ink md:text-[22px]">{text(highlight)}</p>}
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink md:text-[16px]">{text(subtitle)}</p>}
          {description && <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed text-ink-soft">{text(description)}</p>}
          {children && <div className="mt-4 flex flex-wrap items-center gap-2.5">{children}</div>}
        </div>
        {quote && <QuoteCard text={text(quote)} className="hidden w-[300px] shrink-0 lg:flex xl:mr-[14%]" />}
      </div>
    </section>
  );
}

/**
 * Banner đầu trang cũ (giữ API cho các màn hiện có) — nay là HeroBanner với scene pixel art.
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
  return <HeroBanner eyebrow={eyebrow} title={title} highlight={highlight} subtitle={subtitle} scene={scene} visualWidth={sceneWidth} className={className} />;
}
