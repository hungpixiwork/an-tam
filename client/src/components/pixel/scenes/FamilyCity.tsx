import { PixelCanvas, rng } from '../canvas';
import { bush, roundTree, skyline } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 128;
const H = 48;
const SCALE = 2;

/** Vẽ chân dung trực tiếp trên canvas có scale để tóc, cổ và áo giữ đúng lớp. */
function familyPortrait(
  c: PixelCanvas,
  cx: number,
  top: number,
  bottom: number,
  o: { hair: string; hairShade?: string; style: 'side' | 'long' | 'bald' | 'pony' | 'short'; shirt: string; shirtShade: string; skin?: string; glasses?: boolean; head: number },
) {
  const r = o.head;
  const cy = top + r;
  const skin = o.skin ?? P.skin;
  const hairShade = o.hairShade ?? o.hair;
  const shouldersTop = cy + r + 1;
  const shoulderW = Math.round(r * 3.1);
  const person = new PixelCanvas(W, H, SCALE);

  // Torso silhouette, with a darker side plane and a small collar fold.
  person.ellipse(cx, shouldersTop + r * 1.05, shoulderW / 2, r * 1.05, o.shirt);
  person.rect(cx - Math.floor(shoulderW / 2), shouldersTop + r, shoulderW, bottom - shouldersTop - r + 1, o.shirt);
  person.poly([[cx + 1, shouldersTop + 1], [cx + Math.floor(shoulderW * 0.38), shouldersTop + 2], [cx + Math.floor(shoulderW * 0.38), bottom], [cx + 2, bottom]], o.shirtShade);
  person.rect(cx - 1, cy + r - 1, 3, 3, P.skinShade);
  person.poly([[cx - 2, shouldersTop], [cx, shouldersTop + 2], [cx + 2, shouldersTop], [cx + 1, shouldersTop + 3], [cx - 1, shouldersTop + 3]], P.shirtLight);
  person.vline(cx, shouldersTop + 4, Math.min(bottom - 2, shouldersTop + r * 2), o.shirtShade);

  // Long hair sits behind the head and rests on the shoulders.
  if (o.style === 'long') {
    person.rect(cx - r - 1, cy - 1, 2 * r + 3, Math.round(r * 2.15), o.hair);
    person.vline(cx + r, cy + 2, cy + r + 2, hairShade);
    person.vline(cx - r, cy + 2, cy + r + 1, hairShade);
  } else if (o.style === 'pony') {
    person.rect(cx + r - 1, cy - 1, 3, Math.round(r * 1.5), o.hair);
    person.px(cx + r + 1, cy + r, hairShade);
  }

  // Head, ears and cheek shadow.
  person.ellipse(cx, cy, r, r, skin);
  person.px(cx - r - 1, cy + 1, skin).px(cx + r + 1, cy + 1, skin);
  person.vline(cx + r - 1, cy, cy + r - 2, P.skinShade);

  if (o.style === 'bald') {
    person.hline(cx - r + 1, cx - r + 2, cy - 1, o.hair);
    person.hline(cx + r - 2, cx + r - 1, cy - 1, o.hair);
    person.px(cx - r, cy, hairShade).px(cx + r, cy, hairShade);
  } else {
    for (let y = cy - r; y <= cy; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > (r + 0.5) ** 2) continue;
        const fringe = y <= cy - Math.round(r * 0.35) || Math.abs(dx) >= r - (o.style === 'side' && dx < 0 ? 0 : 1);
        if (fringe) person.px(x, y, o.hair);
      }
    }
    if (o.style === 'side') person.hline(cx - r + 1, cx + 1, cy - Math.round(r * 0.3), o.hair);
    if (o.style === 'pony') person.disc(cx + 1, cy - r, 2, o.hair);
    person.hline(cx - r + 2, cx - 1, cy - r, hairShade);
    person.px(cx + r - 2, cy - r + 2, hairShade);
  }

  // Small facial clusters remain legible at card size.
  const eyeY = cy + 1;
  const eyeOffset = Math.max(1, Math.round(r * 0.42));
  person.px(cx - eyeOffset, eyeY, P.ink).px(cx + eyeOffset, eyeY, P.ink);
  if (o.glasses) {
    person.hline(cx - eyeOffset - 1, cx - eyeOffset + 1, eyeY - 1, P.ink);
    person.hline(cx + eyeOffset - 1, cx + eyeOffset + 1, eyeY - 1, P.ink);
    person.px(cx, eyeY - 1, P.ink);
  }
  person.px(cx, eyeY + 2, P.skinShade).hline(cx - 1, cx + 1, eyeY + 3, P.skinDark);
  person.px(cx - eyeOffset - 1, eyeY + 2, '#F2A7A0').px(cx + eyeOffset + 1, eyeY + 2, '#F2A7A0');

  person.outline(P.outline);
  c.draw(person);

  // Fine output pixels add controlled fabric seams and hair glints.
  c.finePx(cx - r + 1.25, cy - r + 1, hairShade);
  c.finePx(cx - 0.25, shouldersTop + 2.25, o.shirt);
  c.finePx(cx + 1.25, shouldersTop + 3, o.shirtShade);
}

function build(): PixelLayer[] {
  const r = rng(38);
  const c = new PixelCanvas(W, H, SCALE);

  skyline(c, r, { x0: 6, x1: 122, base: 34, minH: 6, maxH: 22, body: '#D5E3EF', shade: '#B9CCDA', win: '#E6EFF7', profile: (t) => 0.55 + 0.45 * Math.sin(t * Math.PI) });
  c.rect(0, 34, W, 14, '#E4F0E6');
  roundTree(c, r, 10, 46, 8);
  roundTree(c, r, 118, 46, 7);
  bush(c, 16, 47, 14);
  bush(c, 100, 47, 14);
  // Dappled light and small flower clusters separate the family from the lawn.
  for (const [x, y] of [[22, 40], [29, 44], [108, 42], [114, 45], [8, 42], [120, 40]] as const) {
    c.px(x, y, P.leafHighlight).px(x + 1, y + 1, P.grass2);
  }

  // Gia đình 3 thế hệ: bố, ông, mẹ ở sau; hai con ở trước
  familyPortrait(c, 36, 12, H, { hair: P.hairDark, style: 'side', shirt: P.shirtBlue, shirtShade: P.shirtBlueShade, head: 6 });
  familyPortrait(c, 64, 10, H, { hair: P.hairGray, hairShade: P.hairGrayShade, style: 'bald', shirt: '#8FA7A0', shirtShade: '#78918A', glasses: true, head: 6 });
  familyPortrait(c, 91, 14, H, { hair: P.hairBrown, style: 'long', shirt: P.shirtRed, shirtShade: '#C8574A', head: 6 });
  familyPortrait(c, 50, 27, H, { hair: P.hairBrown, style: 'pony', shirt: P.shirtYellow, shirtShade: '#E0AE38', head: 5 });
  familyPortrait(c, 105, 30, H, { hair: P.hairDark, style: 'short', shirt: P.shirtGreen, shirtShade: '#3F8C66', head: 5 });

  // Small accessories distinguish the three generations at card scale.
  c.finePx(62.5, 16, P.hairGrayShade).finePx(65, 16, P.hairGrayShade);
  c.finePx(37, 23, P.shirtLight).finePx(92, 25, P.shirtPink);
  c.finePx(51, 36, P.shirtRed).finePx(104, 38, P.shirtYellow);

  return [{ paths: c.toPaths() }];
}

let cache: PixelLayer[] | null = null;

export function FamilyCity({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W * SCALE} height={H * SCALE} layers={cache} className={className} preserve="xMidYMax meet" label="Gia đình ba thế hệ trước thành phố xanh" />;
}
