import { memo } from 'react';

const PALETTES = [
  { bg1: '#1FA37A', bg2: '#0E6B58', shirt: '#FFFFFF', hair: '#1F2937', skin: '#F8D1B1' },
  { bg1: '#2F7BEA', bg2: '#1F63C7', shirt: '#EBF3FF', hair: '#374151', skin: '#F2C19E' },
  { bg1: '#8B5CF6', bg2: '#6D28D9', shirt: '#F5F3FF', hair: '#1E1B4B', skin: '#FDE3C8' },
  { bg1: '#F5A524', bg2: '#D97706', shirt: '#FFFBEB', hair: '#451A03', skin: '#F6C6A0' },
  { bg1: '#10B981', bg2: '#047857', shirt: '#ECFDF5', hair: '#18181B', skin: '#FAD5BC' },
  { bg1: '#3B82F6', bg2: '#1D4ED8', shirt: '#EFF6FF', hair: '#312E81', skin: '#F5C2A4' },
];

/** Avatar vector hiện đại sắc nét, mượt mà thay thế avatar pixel thô cũ. */
export const PixelAvatar = memo(function PixelAvatar({ seed, className }: { seed: number; className?: string }) {
  const s = Math.abs(Math.floor(seed || 0));
  const p = PALETTES[s % PALETTES.length];
  const gradId = `av-grad-${s % 1000}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className ? `overflow-hidden shrink-0 ${className}` : 'overflow-hidden shrink-0'}
      aria-label="Ảnh đại diện"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.bg1} />
          <stop offset="100%" stopColor={p.bg2} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${gradId})`} />
      <ellipse cx="32" cy="62" rx="20" ry="14" fill={p.shirt} />
      <path d="M27 44 L32 50 L37 44 Z" fill="#E2E8F0" opacity="0.6" />
      <circle cx="32" cy="31" r="14" fill={p.skin} />
      <path
        d="M18 29 C18 19, 23 15, 32 15 C41 15, 46 19, 46 29 C46 30, 44 26, 42 25 C39 24, 35 25, 32 23 C28 25, 24 24, 21 26 C19 28, 18 29, 18 29 Z"
        fill={p.hair}
      />
      <circle cx="27.5" cy="31" r="1.5" fill="#1E293B" />
      <circle cx="36.5" cy="31" r="1.5" fill="#1E293B" />
      <path d="M29 36 Q32 39 35 36" stroke="#9A3412" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75" />
    </svg>
  );
});
