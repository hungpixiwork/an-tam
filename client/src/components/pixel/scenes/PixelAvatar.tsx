import { memo, useMemo } from 'react';
import { PixelCanvas, rng } from '../canvas';
import { bust, type HairStyle } from '../generators';
import { P } from '../palette';
import { PixelScene } from '../PixelScene';

const SIZE = 32;
const SCALE = 2;
const SKINS = [P.skin, '#E9B994', '#D39C73'];
const HAIRS = [P.hairDark, P.hairBrown, '#1E1E26', '#7A4B2E'];
const STYLES: HairStyle[] = ['side', 'short', 'side', 'long', 'bun'];
const SHIRTS: [string, string][] = [
  [P.shirtLight, P.shirtLightShade],
  [P.shirtBlue, P.shirtBlueShade],
  [P.shirtGreen, '#3F8C66'],
  ['#8E7CF0', '#7462D6'],
  [P.shirtRed, '#C8574A'],
];
const BACKS = ['#DCEBFA', '#E1F3EA', '#FDEFD9', '#EDE7FE'];

/** Avatar pixel sinh tất định từ seed (màu da, tóc, kiểu tóc, áo, nền). */
export const PixelAvatar = memo(function PixelAvatar({ seed, className }: { seed: number; className?: string }) {
  const layers = useMemo(() => {
    const r = rng(seed);
    const c = new PixelCanvas(SIZE, SIZE, SCALE);
    c.disc(15.5, 15.5, 16, r.pick(BACKS));
    const skin = r.pick(SKINS);
    const hair = r.pick(HAIRS);
    const style = r.pick(STYLES);
    const hairLight = hair === P.hairDark ? '#66524B' : hair === P.hairBrown ? '#8B6048' : hair === '#1E1E26' ? '#54505B' : '#A66A43';
    const [shirt, shade] = r.pick(SHIRTS);
    bust(c, 16, 5, 31, { skin, hair, style, shirt, shirtShade: shade, collar: '#FFFFFF', head: 8 }, null);

    // Fine highlights follow the upper-left light while keeping the face clear.
    if (style !== 'bald') {
      c.finePx(12.5, 7.5, hairLight);
      c.finePx(13.5, 8, hairLight);
    }
    c.finePx(18.5, 16.5, skin);
    c.finePx(11.5, 24.5, shirt);
    c.finePx(12.5, 25, shade);
    c.finePx(20.5, 27.5, shade);
    return [{ paths: c.toPaths() }];
  }, [seed]);
  return <PixelScene width={SIZE * SCALE} height={SIZE * SCALE} layers={layers} className={className} preserve="xMidYMid meet" label="Ảnh đại diện" />;
});
