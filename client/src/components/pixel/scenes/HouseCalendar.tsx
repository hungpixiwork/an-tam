import { PixelCanvas, rng } from '../canvas';
import { bush, roundTree, skyline } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 128;
const H = 44;
const SCALE = 2;

function house(c: PixelCanvas) {
  const f = new PixelCanvas(W, H, SCALE);
  f.rect(51, 13, 4, 7, P.roofDark).rect(52, 13, 2, 5, P.roofLight);
  f.rect(33, 24, 27, 15, P.outline);
  f.rect(34, 24, 25, 14, P.wall).rect(53, 24, 6, 14, P.wallShade);
  f.poly([[29, 25], [46.5, 11], [64, 25]], P.roof);
  f.line(31, 24, 46, 12, P.roofLight);
  f.line(47, 12, 62, 24, P.roofShade);
  f.hline(31, 62, 25, P.roofDark);
  for (let row = 0; row < 5; row++) {
    const y = 15 + row * 2;
    const inset = (4 - row) * 3;
    const tone = row % 2 ? P.roofShade : P.roofLight;
    f.hline(46 - inset, 46, y, tone);
    f.hline(47, 47 + inset, y, tone);
    if (row < 4) f.px(48 - inset, y + 1, P.roofDark).px(46 + inset, y + 1, P.roofDark);
  }
  f.vline(35, 25, 36, '#FFF9EC').hline(35, 51, 37, '#FFF9EC').vline(57, 25, 36, P.wallShade);
  f.hline(33, 60, 38, P.woodDark).hline(35, 58, 39, P.woodLight);
  f.rect(43, 30, 6, 8, P.door).vline(48, 31, 36, P.woodDark).px(47, 34, P.sun);
  f.hline(44, 46, 37, P.woodDark);
  f.rect(35, 27, 7, 6, P.woodDark).rect(36, 28, 5, 4, P.windowFrame).rect(37, 29, 3, 2, P.window);
  f.rect(51, 27, 7, 6, P.woodDark).rect(52, 28, 5, 4, P.windowFrame).rect(53, 29, 3, 2, P.window);
  f.vline(38, 28, 31, P.windowFrame).hline(36, 40, 33, P.woodLight);
  f.vline(54, 28, 31, P.windowFrame).hline(52, 56, 33, P.woodLight);
  f.rect(43, 18, 7, 6, P.woodDark).rect(44, 19, 5, 4, P.windowFrame).rect(45, 20, 3, 2, P.window);
  f.vline(46, 19, 22, P.windowFrame);
  f.hline(43, 49, 24, P.woodLight);
  f.finePx(37.25, 29, P.cloud).finePx(53.25, 29, P.cloud).finePx(45.25, 20, P.cloud);
  f.outline(P.outline);
  c.draw(f);
}

function calendar(c: PixelCanvas, pop: PixelCanvas) {
  const f = new PixelCanvas(W, H, SCALE);
  f.rect(81, 13, 28, 24, P.paperShade);
  f.rect(80, 12, 28, 24, P.paper).rect(81, 35, 28, 1, P.paperShade).vline(108, 13, 35, P.paperShade);
  f.vline(82, 19, 33, '#F8F3E9');
  f.rect(80, 12, 28, 6, P.calHead).hline(80, 107, 17, P.calHeadDark);
  for (const x of [85, 101]) {
    f.rect(x, 10, 2, 5, P.ink).px(x, 10, P.woodLight).px(x, 15, P.calHeadDark);
  }
  f.hline(82, 105, 20, P.paperShade);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const hit = row === 1 && col === 3;
      const x = 83 + col * 5;
      const y = 22 + row * 4;
      f.rect(x, y, 3, 2, hit ? P.clockRed : P.calCell);
      if (!hit) f.finePx(x + 0.25, y + 0.25, P.paper);
    }
  }
  f.rect(96, 25, 3, 2, P.clockRed).finePx(96.25, 25, P.sun);
  f.px(105, 32, P.clockRed).px(86, 32, P.calHead);
  f.outline(P.outline);
  c.draw(f);
  // Đồng hồ đỏ nhô ra góc (lớp riêng để nhún nhẹ)
  const k = new PixelCanvas(W, H, SCALE);
  k.disc(108, 34, 6, P.clockRed);
  k.disc(108, 34, 4.5, P.clockFace);
  k.finePx(106.25, 32.25, P.paper).finePx(109.25, 35.25, P.calCell);
  k.vline(108, 31, 34, P.ink).hline(108, 110, 34, P.ink);
  k.finePx(107.25, 31.5, P.ink).finePx(109.5, 34.25, P.ink);
  k.outline(P.outline);
  pop.draw(k);
}

function build(): PixelLayer[] {
  const r = rng(11);
  const base = new PixelCanvas(W, H, SCALE);
  const pop = new PixelCanvas(W, H, SCALE);

  skyline(base, r, { x0: 4, x1: 124, base: 38, minH: 4, maxH: 16, body: '#EFE5CF', shade: '#DCCFB7', win: '#F6EEDD', profile: (t) => 0.5 + 0.5 * Math.sin(t * Math.PI) });
  base.ellipse(64, 41, 62, 4, P.grass1);
  base.hline(8, 120, 38, P.grass2);
  base.rect(0, 40, W, 4, P.grass1);
  base.ellipse(46, 39, 19, 1.5, P.grassShadow);
  base.ellipse(94, 37, 17, 1, P.paperShade);
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
  return <PixelScene width={W * SCALE} height={H * SCALE} layers={cache} className={className} preserve="xMidYMax meet" label="Ngôi nhà và tờ lịch hẹn giờ" />;
}
