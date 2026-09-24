import { PixelCanvas, rng } from '../canvas';
import { bush, roundTree, skyline } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 128;
const H = 44;

function house(c: PixelCanvas) {
  const f = new PixelCanvas(W, H);
  f.rect(51, 13, 4, 7, P.roofDark);
  f.rect(34, 24, 25, 14, P.wall).rect(53, 24, 6, 14, P.wallShade);
  f.poly([[29, 25], [46.5, 11], [64, 25]], P.roof);
  f.line(31, 24, 46, 12, P.roofLight);
  f.hline(31, 62, 25, P.roofDark);
  for (let row = 0; row < 4; row++) {
    const y = 17 + row * 2;
    const inset = Math.abs(2 - row) * 3;
    f.hline(46 - (row + 1) * 3, 46 - inset, y, row % 2 ? P.roofShade : P.roofLight);
    f.hline(47 + inset, 47 + (row + 1) * 3, y, row % 2 ? P.roofShade : P.roofLight);
  }
  f.rect(43, 30, 6, 8, P.door).px(47, 34, P.sun);
  f.px(45, 32, P.woodLight).hline(44, 47, 37, P.woodDark);
  f.rect(36, 28, 5, 4, P.windowFrame).rect(37, 29, 3, 2, P.window);
  f.rect(52, 28, 5, 4, P.windowFrame).rect(53, 29, 3, 2, P.window);
  f.vline(38, 28, 31, P.windowFrame).vline(54, 28, 31, P.windowFrame);
  f.rect(44, 19, 5, 4, P.windowFrame).rect(45, 20, 3, 2, P.window);
  f.vline(46, 19, 22, P.windowFrame);
  f.outline(P.outline);
  c.draw(f);
}

function calendar(c: PixelCanvas, pop: PixelCanvas) {
  const f = new PixelCanvas(W, H);
  f.rect(80, 12, 28, 24, P.paper).rect(81, 35, 28, 1, P.paperShade).vline(108, 13, 35, P.paperShade);
  f.rect(80, 12, 28, 6, P.calHead).hline(80, 107, 17, P.calHeadDark);
  for (const x of [85, 101]) f.vline(x, 10, 13, P.ink);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const hit = row === 1 && col === 3;
      f.rect(83 + col * 5, 21 + row * 5, 3, 3, hit ? P.clockRed : P.calCell);
    }
  }
  f.hline(82, 105, 19, P.paperShade);
  f.px(105, 32, P.clockRed).px(86, 32, P.calHead);
  f.outline(P.outline);
  c.draw(f);
  // Đồng hồ đỏ nhô ra góc (lớp riêng để nhún nhẹ)
  const k = new PixelCanvas(W, H);
  k.disc(108, 34, 6, P.clockRed);
  k.disc(108, 34, 4, P.clockFace);
  k.vline(108, 31, 34, P.ink).hline(108, 110, 34, P.ink);
  k.outline(P.outline);
  pop.draw(k);
}

function build(): PixelLayer[] {
  const r = rng(11);
  const base = new PixelCanvas(W, H);
  const pop = new PixelCanvas(W, H);

  skyline(base, r, { x0: 4, x1: 124, base: 38, minH: 4, maxH: 16, body: '#EFE5CF', shade: '#DCCFB7', win: '#F6EEDD', profile: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI) });
  base.ellipse(64, 41, 62, 4, P.grass1);
  base.hline(8, 120, 38, P.grass2);
  base.rect(0, 40, W, 4, P.grass1);
  roundTree(base, r, 17, 39, 6);
  roundTree(base, r, 70, 39, 4, [P.leaf1, P.leaf2, P.leaf3, P.leaf4]);
  house(base);
  calendar(base, pop);
  bush(base, 22, 41, 11);
  bush(base, 60, 41, 9);
  bush(base, 112, 41, 12);

  return [{ paths: base.toPaths() }, { paths: pop.toPaths(), className: 'px-bob' }];
}

let cache: PixelLayer[] | null = null;

export function HouseCalendar({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W} height={H} layers={cache} className={className} preserve="xMidYMax meet" label="Ngôi nhà và tờ lịch hẹn giờ" />;
}
