import { memo } from 'react';
import type { PixelPath } from './canvas';
import './pixel.css';

export interface PixelLayer {
  paths: PixelPath[];
  /** Class CSS cho animation (px-drift, px-twinkle, px-steam...). */
  className?: string;
}

interface Props {
  width: number;
  height: number;
  layers: PixelLayer[];
  className?: string;
  /** Mặc định neo góc dưới-phải và phủ kín khung. */
  preserve?: string;
  label: string;
}

/** Khung SVG cho pixel art: viewBox khớp lưới path đầu ra, luôn sắc nét ở mọi kích thước. */
export const PixelScene = memo(function PixelScene({ width, height, layers, className, preserve = 'xMaxYMax slice', label }: Props) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={preserve}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={className}
    >
      {layers.map((layer, i) => (
        <g key={i} className={layer.className}>
          {layer.paths.map((p) => (
            <path key={p.fill} fill={p.fill} d={p.d} />
          ))}
        </g>
      ))}
    </svg>
  );
});
