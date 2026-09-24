import { memo, useMemo } from 'react';
import { PixelCanvas, rng } from '../canvas';
import { bust, type HairStyle } from '../generators';
import { P } from '../palette';
import { PixelScene } from '../PixelScene';

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
    const c = new PixelCanvas(32, 32);
    c.disc(15.5, 15.5, 16, r.pick(BACKS));
    const [shirt, shade] = r.pick(SHIRTS);
    bust(c, 16, 5, 31, { skin: r.pick(SKINS), hair: r.pick(HAIRS), style: r.pick(STYLES), shirt, shirtShade: shade, collar: '#FFFFFF', head: 8 }, null);
    return [{ paths: c.toPaths() }];
  }, [seed]);
  return <PixelScene width={32} height={32} layers={layers} className={className} preserve="xMidYMid meet" label="Ảnh đại diện" />;
});
