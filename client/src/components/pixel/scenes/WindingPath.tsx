import { PixelCanvas, rng } from '../canvas';
import { bands, cloud, roundTree, sun } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 80;
const H = 96;

/** Đường chân đồi: y theo x, dao động nhẹ. */
const ridge = (x: number, base: number, amp: number, freq: number, phase: number) => base - amp * Math.sin(x * freq + phase);

function build(): PixelLayer[] {
  const r = rng(5);
  const c = new PixelCanvas(W, H);
  const clouds = new PixelCanvas(W, H);

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
  }
  // Tiny stepping stones catch the warm light along the bend.
  for (const [x, y] of [[40, 89], [48, 83], [38, 76], [50, 69], [45, 63]] as const) {
    if (c.get(x, y) === P.path) c.hline(x, x + 1, y, P.sunGlow);
  }

  // Cây
  roundTree(c, r, 20, 58, 3, [P.leaf1, P.leaf2, P.leaf3, P.leaf4]);
  roundTree(c, r, 64, 60, 3.5, [P.leaf1, P.leaf2, P.leaf3, P.leaf4]);
  roundTree(c, r, 10, 84, 9);
  roundTree(c, r, 74, 78, 7);

  // Hoa, cỏ
  for (let k = 0; k < 40; k++) {
    const x = r.int(0, W - 1);
    const y = r.int(72, H - 1);
    if (c.get(x, y) === P.grass1) c.px(x, y, r.pick([P.grass2, P.grass2, '#FFFFFF', P.shirtYellow]));
  }
  for (let k = 0; k < 18; k++) {
    const x = r.int(0, W - 1);
    const y = r.int(76, H - 1);
    if (c.get(x, y) === P.grass1) c.px(x, y, r.pick([P.grassShadow, P.grass2, P.leaf3]));
  }

  return [{ paths: c.toPaths() }, { paths: clouds.toPaths(), className: 'px-drift-slow' }];
}

let cache: PixelLayer[] | null = null;

export function WindingPath({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W} height={H} layers={cache} className={className} preserve="xMidYMax slice" label="Con đường xanh dẫn về phía mặt trời" />;
}
