import { PixelCanvas, rng } from '../canvas';
import { bands, bush, cloud, reflections, skyline, sun } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 256;
const H = 64;
const HORIZON = 44;

/** Người ngồi ghế gỗ, cầm cốc cà phê, nhìn về phía hồ (bên trái). */
function seatedPerson(c: PixelCanvas) {
  const f = new PixelCanvas(W, H);
  // Ghế
  f.poly([[229, 33], [234, 32], [237, 48], [232, 49]], P.wood);
  f.line(233, 32, 237, 47, P.woodLight);
  f.line(236, 49, 238, 57, P.woodDark, 2);
  f.rect(213, 47, 22, 2, P.wood).hline(213, 234, 49, P.woodDark);
  f.hline(216, 231, 48, P.woodLight);
  f.line(215, 50, 213, 57, P.woodDark, 2);
  f.line(230, 50, 232, 57, P.woodDark, 2);
  // Chân
  f.poly([[218, 45], [231, 45], [231, 48], [207, 49], [207, 46]], P.pants);
  f.hline(207, 230, 45, P.pantsShade);
  f.rect(205, 47, 4, 10, P.pants).vline(208, 48, 56, P.pantsShade);
  f.rect(201, 56, 7, 2, '#2B2F3A');
  // Thân áo
  f.poly([[219, 35], [228, 34], [231, 46], [218, 47]], P.shirtLight);
  f.poly([[226, 35], [228, 34], [231, 46], [228, 46]], P.shirtLightShade);
  f.vline(225, 37, 44, P.shirtLightShade).px(224, 39, P.shirtLight).px(224, 42, P.shirtLight);
  // Tay cầm cốc
  f.line(221, 37, 218, 43, P.shirtLight, 3);
  f.line(217, 43, 213, 39, P.shirtLightShade, 2);
  f.rect(207, 35, 4, 5, P.mug).vline(210, 36, 39, P.mugShade).hline(207, 209, 35, P.coffee);
  f.px(208, 36, P.sun);
  f.rect(211, 37, 2, 2, P.skin);
  // Đầu
  f.rect(222, 32, 3, 3, P.skinShade);
  f.disc(224, 28, 4, P.hairDark);
  f.ellipse(221.5, 30, 2.5, 3, P.skin);
  f.px(218, 30, P.skin).px(219, 32, P.skinShade);
  f.px(224, 30, P.skin).px(224, 31, P.skinShade);
  f.px(220, 29, P.ink);
  f.hline(220, 224, 26, P.hairBrown);
  f.outline(P.outline);
  c.draw(f);
}

/** Cây rủ lá ở góc phải trên: tán dày + các dải lá rủ 2 pixel. */
function droopingTree(c: PixelCanvas) {
  const r = rng(7);
  c.rect(250, 0, 6, 60, P.trunk).vline(251, 0, 59, P.trunkDark).vline(254, 6, 59, P.woodLight);
  c.line(250, 14, 238, 6, P.trunkDark, 2);
  c.disc(246, 2, 13, P.leaf0);
  c.disc(231, 0, 10, P.leaf1);
  c.disc(242, -3, 9, P.leaf2);
  c.disc(222, -2, 6, P.leaf1);
  for (let x = 214; x < 256; x += 2) {
    const len = Math.max(3, r.int(8, 22) - Math.max(0, (226 - x) / 1.5));
    const top = 3 + r.int(0, 3);
    for (let y = top; y < top + len; y++) {
      const tone = (y + x) % 5 === 0 ? P.leaf3 : (y + x) % 3 === 0 ? P.leaf2 : P.leaf1;
      c.px(x, y, tone).px(x + 1, y, y % 2 ? P.leaf0 : tone);
    }
    c.px(x, top + len, P.leaf3);
  }
  for (let k = 0; k < 60; k++) c.px(r.int(218, 255), r.int(0, 12), r.pick([P.leaf3, P.leaf4, P.leaf2]));
  for (let x = 220; x < 255; x += 5) {
    const y = 7 + r.int(0, 5);
    c.px(x, y, P.leafHighlight).px(x + 1, y + 1, P.leaf3);
  }
}

function build(): PixelLayer[] {
  const r = rng(2026);
  const base = new PixelCanvas(W, H);
  const clouds = new PixelCanvas(W, H);
  const lit = new PixelCanvas(W, H);
  const shimmer = new PixelCanvas(W, H);
  const steam = new PixelCanvas(W, H);

  // Trời + mặt trời
  bands(base, 0, 0, W, HORIZON, [P.sky0, P.sky1, P.sky2, P.sky3, P.sky4]);
  sun(base, 124, 33, 6);
  cloud(clouds, 34, 12, 16);
  cloud(clouds, 146, 10, 22);
  cloud(clouds, 196, 17, 12);

  // Thành phố hai lớp
  skyline(base, r, { x0: 14, x1: 216, base: HORIZON, minH: 6, maxH: 19, body: P.cityFar, shade: '#B7CCDD', win: P.cityFarWin, profile: (t) => 0.6 + 0.6 * Math.sin(t * Math.PI) });
  const mid = skyline(base, r, {
    x0: 46, x1: 206, base: HORIZON, minH: 7, maxH: 32, body: P.cityMid, shade: '#91ADC3', win: P.cityMidWin, lit: P.cityNearLit, litChance: 0.12,
    profile: (t) => 0.35 + 0.75 * Math.sin(Math.min(1, t * 1.15) * Math.PI),
  }, lit);

  // Bờ xa
  base.rect(0, HORIZON - 1, W, 2, P.leaf1);
  for (let x = -4; x < W; x += r.int(5, 9)) bush(base, x, HORIZON, r.int(6, 10), [P.leaf0, P.leaf1, P.leaf2]);
  for (let x = 0; x < 40; x += 7) base.disc(x, HORIZON - 5, r.int(3, 5), r.pick([P.leaf0, P.leaf1]));

  // Mặt hồ + bóng thành phố + vệt nắng
  bands(base, 0, HORIZON + 1, W, H, [P.water0, P.water1, P.water2, P.water3]);
  reflections(base, mid, HORIZON + 1, P.reflect, 12);
  for (let k = 0; k < 26; k++) {
    const x = r.int(0, W - 8);
    base.hline(x, x + r.int(2, 6), r.int(HORIZON + 3, H - 1), P.waterLine);
  }
  for (let k = 0; k < 16; k++) {
    const x = r.int(4, 198);
    const y = r.int(HORIZON + 5, H - 3);
    base.hline(x, x + r.int(1, 3), y, k % 3 === 0 ? P.waterShine : P.waterLine);
  }
  for (let j = 0; j < 18; j += 2) {
    const half = Math.max(1, 6 - Math.floor(j / 3));
    (j % 4 === 0 ? shimmer : base).hline(124 - half, 124 + half, HORIZON + 2 + j, P.waterShine);
  }

  // Bờ cỏ gần + người ngồi + cây rủ lá
  base.poly([[180, 64], [194, 55], [226, 53], [256, 52], [256, 64]], P.grass0);
  base.poly([[186, 60], [196, 55], [226, 53], [256, 52], [256, 55], [222, 56], [198, 58]], P.grass1);
  for (let x = 190; x < W; x += 3) base.px(x, 54 + r.int(-1, 1), P.grass2);
  for (let k = 0; k < 20; k++) {
    const x = r.int(188, 255);
    const y = r.int(56, 63);
    if (base.get(x, y) === P.grass0 || base.get(x, y) === P.grass1) base.px(x, y, r.pick([P.grass2, P.leaf4, P.grassShadow]));
  }
  seatedPerson(base);
  droopingTree(base);
  steam.px(208, 33, P.steam).px(209, 31, P.steam).px(208, 29, P.steam);

  return [
    { paths: base.toPaths() },
    { paths: clouds.toPaths(), className: 'px-drift' },
    { paths: lit.toPaths(), className: 'px-blink' },
    { paths: shimmer.toPaths(), className: 'px-twinkle' },
    { paths: steam.toPaths(), className: 'px-steam' },
  ];
}

let cache: PixelLayer[] | null = null;

export function HeroLakeCity({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W} height={H} layers={cache} className={className} label="Người ngồi bên hồ nhìn ra thành phố buổi sáng" />;
}
