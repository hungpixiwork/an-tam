import { PixelCanvas, rng } from '../canvas';
import { bands, cloud, roundTree, sun } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 80;
const H = 96;
const SCALE = 2;

/** Đường chân đồi: y theo x, dao động nhẹ. */
const ridge = (x: number, base: number, amp: number, freq: number, phase: number) => base - amp * Math.sin(x * freq + phase);

function build(): PixelLayer[] {
  const r = rng(5);
  const c = new PixelCanvas(W, H, SCALE);
  const clouds = new PixelCanvas(W, H, SCALE);

  bands(c, 0, 0, W, 54, ['#D3E9F8', '#DFF0F9', '#ECF5F1', '#F7F1DC']);
  sun(c, 50, 44, 5);
  cloud(clouds, 6, 12, 14);
  cloud(clouds, 52, 20, 10);

  // Ba lớp đồi xa → gần
  for (let x = 0; x < W; x++) {
    c.vline(x, Math.round(ridge(x, 50, 3, 0.09, 1)), 60, P.hillFar);
    c.vline(x, Math.round(ridge(x, 58, 3, 0.07, 3)), 66, P.hillMid);
    c.vline(x, Math.round(ridge(x, 64, 2, 0.05, 0.5)), H, P.hillNear);
  }
  c.rect(0, 70, W, H - 70, P.grass1);
  c.dither(0, 69, W, 2, P.hillNear);
  // Broken patches of light add texture while keeping the distant hills quiet.
  for (let x = 2; x < W; x += 7) {
    const y = Math.round(ridge(x, 67, 2, 0.05, 0.5)) + r.int(1, 4);
    c.hline(x, x + r.int(1, 3), y, x % 2 ? P.grass2 : P.hillMid);
  }

  // Con đường uốn lượn từ chân khung về phía mặt trời
  for (let y = H - 1; y >= 56; y--) {
    const t = (H - 1 - y) / (H - 57);
    const cx = 44 + Math.sin(t * Math.PI * 1.7 + 0.4) * 13 * (1 - t) + 2 * t;
    const half = Math.max(0.5, 15 * Math.pow(1 - t, 1.4));
    c.hline(Math.round(cx - half), Math.round(cx + half), y, P.path);
    c.px(Math.round(cx + half), y, P.pathShade).px(Math.round(cx - half), y, P.pathShade);
    if (y % 4 === 0) {
      c.finePx(cx - half - 0.5, y + 0.5, P.sunGlow);
      c.finePx(cx + half + 0.5, y + 0.5, P.pathShade);
    }
  }
  // Tiny stepping stones catch the warm light along the bend.
  for (const [x, y] of [[40, 89], [48, 83], [38, 76], [50, 69], [45, 63]] as const) {
    if (c.get(x, y) === P.path) {
      c.hline(x, x + 1, y, P.sunGlow);
      c.finePx(x + 0.5, y + 0.5, P.sun);
    }
  }

  // Cây
  roundTree(c, r, 20, 58, 3, [P.leaf1, P.leaf2, P.leaf3, P.leaf4]);
  roundTree(c, r, 64, 60, 3.5, [P.leaf1, P.leaf2, P.leaf3, P.leaf4]);
  roundTree(c, r, 10, 84, 9);
  roundTree(c, r, 74, 78, 7);

  // Hoa, cỏ
  const flowers = [
    [3, 91], [5, 89], [7, 92], [15, 94], [18, 91], [21, 93],
    [72, 91], [75, 88], [77, 93], [68, 95],
  ] as const;
  for (const [x, y] of flowers) {
    if (c.get(x, y) !== P.grass1) continue;
    const petal = (x + y) % 3 === 0 ? P.shirtYellow : '#FFFFFF';
    c.px(x, y, petal).px(x + 1, y, P.grass2).px(x, y + 1, P.leafHighlight);
    c.finePx(x + 0.5, y + 0.5, P.sun);
  }
  for (const [x, y] of [[11, 87], [24, 90], [30, 95], [64, 92], [70, 96], [79, 88]] as const) {
    if (c.get(x, y) !== P.grass1) continue;
    c.px(x, y, P.grassShadow).px(x + 1, y - 1, P.grass2);
    c.finePx(x + 0.5, y - 0.5, P.leaf3);
  }

  return [{ paths: c.toPaths() }, { paths: clouds.toPaths(), className: 'px-drift-slow' }];
}

let cache: PixelLayer[] | null = null;

export function WindingPath({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W * SCALE} height={H * SCALE} layers={cache} className={className} preserve="xMidYMax slice" label="Con đường xanh dẫn về phía mặt trời" />;
}
