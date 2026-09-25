import { PixelCanvas, rng } from '../canvas';
import { bands, bush, cloud, reflections, skyline, sun } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 256;
const H = 64;
const SCALE = 3;
const HORIZON = 44;

/** Nhân vật cục bộ ở lưới 3x để đọc rõ dáng ngồi, tay và chiếc cốc ở kích thước banner. */
function seatedPerson(c: PixelCanvas) {
  const f = new PixelCanvas(120, 112);
  // Chair back, seat and legs sit behind the body and stay visually separate.
  f.poly([[89, 40], [102, 34], [109, 77], [97, 80]], P.woodDark);
  f.poly([[92, 42], [99, 39], [104, 73], [98, 74]], P.wood);
  f.line(94, 43, 101, 72, P.woodLight);
  f.poly([[61, 76], [99, 74], [107, 81], [67, 85]], P.wood);
  f.line(64, 78, 99, 77, P.woodLight);
  f.line(70, 83, 67, 108, P.woodDark, 3);
  f.line(100, 81, 105, 105, P.woodDark, 3);
  f.px(68, 105, '#2B2F3A').px(69, 106, '#2B2F3A');
  f.px(104, 103, '#2B2F3A').px(105, 104, '#2B2F3A');

  // Bent legs and shoes establish a seated pose instead of a standing bust.
  f.poly([[61, 62], [83, 65], [84, 75], [64, 82], [37, 78], [34, 71]], P.pants);
  f.poly([[57, 69], [81, 71], [77, 76], [48, 79], [37, 76]], P.pantsShade);
  f.poly([[38, 75], [49, 78], [39, 98], [28, 98], [31, 87]], P.pants);
  f.line(39, 79, 34, 94, '#62728A', 2);
  f.poly([[27, 96], [39, 96], [40, 102], [22, 103], [20, 100]], '#303744');
  f.line(24, 99, 36, 99, '#596578');

  // Shirt silhouette, collar and folds catch the warm light from the lake.
  f.poly([[64, 38], [80, 39], [91, 49], [87, 72], [62, 73], [53, 57]], P.shirtLight);
  f.poly([[78, 42], [85, 46], [86, 70], [77, 71]], P.shirtLightShade);
  f.poly([[63, 40], [70, 43], [67, 49], [59, 45]], P.shirtLightShade);
  f.line(70, 47, 74, 68, '#FFFFFF');
  f.px(73, 52, P.shirtBlueShade).px(74, 57, P.shirtBlueShade);
  f.poly([[61, 39], [70, 42], [65, 47], [59, 44]], '#FFFFFF');

  // Raised arm connects continuously to the hand holding the cup near the face.
  f.poly([[60, 43], [66, 47], [54, 57], [44, 49], [39, 42], [44, 38], [51, 46]], P.shirtLight);
  f.poly([[51, 46], [56, 50], [46, 58], [39, 51], [37, 45], [41, 42]], P.shirtLightShade);
  f.line(45, 48, 51, 53, '#FFFFFF', 2);
  f.poly([[39, 37], [45, 37], [47, 42], [43, 46], [38, 43]], P.skin);
  f.px(39, 38, P.skinShade).px(44, 42, P.skinShade);

  // Ceramic mug: dark rim, visible coffee, handle and a sharp reflected edge.
  f.poly([[25, 27], [41, 27], [39, 46], [28, 46]], P.mugShade);
  f.rect(27, 28, 11, 15, P.mug);
  f.rect(27, 27, 11, 3, P.coffee);
  f.hline(28, 36, 27, '#3E2A24');
  f.vline(37, 31, 40, P.mugShade);
  f.line(39, 31, 44, 32, P.mugShade, 2);
  f.vline(44, 32, 39, P.mugShade).vline(45, 33, 38, P.mugShade);
  f.line(44, 39, 39, 40, P.mugShade, 2);
  f.vline(29, 31, 39, '#FFFFFF');
  f.px(32, 30, P.sun).px(34, 28, P.sun);

  // Head in three-quarter profile, with hair contour, eye, nose and ear.
  f.poly([[47, 24], [46, 16], [52, 8], [62, 5], [73, 8], [81, 15], [83, 23], [79, 30], [78, 39], [71, 43], [66, 37]], P.hairDark);
  // Broad oval cheeks and a short, rounded chin avoid a sharp triangular profile.
  f.ellipse(61, 26, 15, 16, P.skin);
  f.ellipse(68, 30, 8, 9, P.skinShade);
  f.ellipse(74, 26, 3, 4, P.skin);
  f.ellipse(55, 29, 2.5, 2, '#F2A7A0');
  // Short nose and a small relaxed mouth keep the side profile soft.
  f.poly([[46, 27], [51, 27], [54, 29], [52, 31], [47, 31]], P.skin);
  f.px(51, 23, P.ink).px(50, 22, P.hairDark);
  f.line(51, 33, 55, 34, P.skinDark);
  // Swept fringe, soft hair highlight and a lock resting behind the ear.
  f.poly([[47, 23], [48, 15], [55, 10], [67, 8], [77, 13], [79, 20], [72, 18], [62, 19], [55, 25]], P.hairDark);
  f.line(55, 12, 67, 9, P.hairBrown, 2);
  f.px(77, 23, P.hairBrown).px(78, 28, P.hairDark);
  f.px(78, 32, P.hairBrown).px(76, 36, P.hairBrown);
  f.px(69, 37, P.skinShade);

  c.draw(f, 196, 18);
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
  const base = new PixelCanvas(W, H, SCALE);
  const clouds = new PixelCanvas(W, H, SCALE);
  const lit = new PixelCanvas(W, H, SCALE);
  const shimmer = new PixelCanvas(W, H, SCALE);
  const steam = new PixelCanvas(W, H, SCALE);

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
  steam.finePx(208, 26, P.steam).finePx(209, 24, P.steam).finePx(208, 22, P.steam);

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
  return <PixelScene width={W * SCALE} height={H * SCALE} layers={cache} className={className} label="Người ngồi bên hồ nhìn ra thành phố buổi sáng" />;
}
