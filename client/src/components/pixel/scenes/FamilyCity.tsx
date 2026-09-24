import { PixelCanvas, rng } from '../canvas';
import { bust, bush, roundTree, skyline } from '../generators';
import { P } from '../palette';
import { PixelScene, type PixelLayer } from '../PixelScene';

const W = 128;
const H = 48;

function build(): PixelLayer[] {
  const r = rng(38);
  const c = new PixelCanvas(W, H);

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
  bust(c, 36, 12, H, { hair: P.hairDark, style: 'side', shirt: P.shirtBlue, shirtShade: P.shirtBlueShade, collar: P.shirtLight, head: 6 });
  bust(c, 64, 10, H, { hair: P.hairGray, hairShade: P.hairGrayShade, style: 'bald', shirt: '#8FA7A0', shirtShade: '#78918A', glasses: true, head: 6 });
  bust(c, 91, 14, H, { hair: P.hairBrown, style: 'long', shirt: P.shirtRed, shirtShade: '#C8574A', head: 6 });
  bust(c, 50, 27, H, { hair: P.hairBrown, style: 'pony', shirt: P.shirtYellow, shirtShade: '#E0AE38', head: 5 });
  bust(c, 105, 30, H, { hair: P.hairDark, style: 'short', shirt: P.shirtGreen, shirtShade: '#3F8C66', head: 5 });

  // Small accessories distinguish the three generations at card scale.
  c.px(64, 16, P.hairGrayShade).px(67, 16, P.hairGrayShade);
  c.px(37, 23, P.shirtLight).px(92, 25, P.shirtPink);
  c.px(51, 36, P.shirtRed).px(104, 38, P.shirtYellow);

  return [{ paths: c.toPaths() }];
}

let cache: PixelLayer[] | null = null;

export function FamilyCity({ className }: { className?: string }) {
  cache ??= build();
  return <PixelScene width={W} height={H} layers={cache} className={className} preserve="xMidYMax meet" label="Gia đình ba thế hệ trước thành phố xanh" />;
}
