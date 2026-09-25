// Các "cọ vẽ" dùng lại giữa các scene: bầu trời, mặt trời, mây, thành phố, mặt nước, cây, người.

import { PixelCanvas, rng, type Color, type Rng } from './canvas';
import { P } from './palette';

/** Dải màu ngang, chỗ giao nhau được dither 2 hàng cho mềm. */
export function bands(c: PixelCanvas, x: number, y0: number, w: number, y1: number, colors: readonly Color[]) {
  const n = colors.length;
  const h = y1 - y0;
  for (let i = 0; i < n; i++) {
    const top = y0 + Math.round((i * h) / n);
    const bottom = y0 + Math.round(((i + 1) * h) / n);
    c.rect(x, top, w, bottom - top, colors[i]);
    if (i > 0) c.dither(x, top, w, 1, colors[i - 1], 0);
    if (i > 0) c.dither(x, top - 1, w, 1, colors[i], 1);
  }
}

/** Mặt trời có quầng sáng dither. */
export function sun(c: PixelCanvas, cx: number, cy: number, r: number) {
  const halo = new PixelCanvas(c.w, c.h, c.scale);
  halo.disc(cx, cy, r + 6, P.sunGlow2);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (halo.get(x, y) && (x + y) % 2 === 0) c.px(x, y, P.sunGlow2);
  c.disc(cx, cy, r + 3, P.sunGlow);
  c.disc(cx, cy, r, P.sun);
}

/** Đám mây: vài hình tròn chồng nhau, đáy phẳng có bóng. */
export function cloud(c: PixelCanvas, x: number, y: number, w: number) {
  const r = Math.max(2, Math.round(w / 6));
  c.ellipse(x + w / 2, y + r * 0.6, w / 2, r * 0.9, P.cloudShade);
  c.disc(x + r * 1.2, y + r * 0.3, r, P.cloud);
  c.disc(x + w / 2, y - r * 0.3, r * 1.35, P.cloud);
  c.disc(x + w - r * 1.3, y + r * 0.2, r * 1.05, P.cloud);
  c.hline(x + 1, x + w - 1, Math.round(y + r * 1.2), P.cloudShade);
}

export interface Building { x: number; w: number; h: number }

interface SkylineOpts {
  x0: number;
  x1: number;
  base: number;
  minH: number;
  maxH: number;
  body: Color;
  shade?: Color;
  win: Color;
  lit?: Color;
  litChance?: number;
  /** Hệ số chiều cao theo vị trí ngang (0..1) — tạo "đỉnh" thành phố ở giữa. */
  profile?: (t: number) => number;
}

/** Thành phố sinh thủ tục: tòa nhà, mái bậc thang, ăng-ten, lưới cửa sổ. Trả về danh sách tòa nhà để vẽ bóng nước. */
export function skyline(c: PixelCanvas, r: Rng, o: SkylineOpts, litOut?: PixelCanvas): Building[] {
  const out: Building[] = [];
  let x = o.x0;
  while (x < o.x1) {
    const w = r.int(4, 9);
    const t = (x - o.x0) / Math.max(1, o.x1 - o.x0);
    const scale = o.profile ? o.profile(t) : 1;
    const h = Math.max(3, Math.round(r.int(o.minH, o.maxH) * scale));
    const top = o.base - h;
    c.rect(x, top, w, h, o.body);
    // Facade shadow and roof edge give each building a clearer volume.
    if (w >= 6) c.vline(x + w - 1, top + 1, o.base - 1, o.shade ?? o.body);
    c.hline(x, x + w - 1, top, o.win);
    // Mái bậc thang / ăng-ten cho tòa cao
    if (h > o.maxH * 0.6 && r.chance(0.5)) {
      const sw = Math.max(2, w - 2 * r.int(1, 2));
      const sx = x + Math.floor((w - sw) / 2);
      const sh = r.int(1, 3);
      c.rect(sx, top - sh, sw, sh, o.body);
      if (r.chance(0.6)) c.vline(sx + Math.floor(sw / 2), top - sh - r.int(2, 4), top - sh - 1, o.body);
    }
    // Lưới cửa sổ
    for (let wy = top + 2; wy < o.base - 1; wy += 2) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        if (r.chance(0.15)) continue;
        const lit = o.lit && r.chance(o.litChance ?? 0.1);
        (lit && litOut ? litOut : c).px(wx, wy, lit ? o.lit! : o.win);
        if (lit && litOut) c.px(wx, wy, o.win);
        if (!lit && r.chance(0.25)) c.finePx(wx + 0.5, wy + 0.5, P.cloud);
      }
    }
    if (w >= 6) {
      c.finePx(x + 0.5, top + 1.5, o.win).finePx(x + w - 0.5, o.base - 2.5, o.shade ?? o.body);
    }
    out.push({ x, w, h });
    x += w + (r.chance(0.3) ? 1 : 0);
  }
  return out;
}

/** Bóng tòa nhà dưới nước: sọc đứt quãng, nhạt dần. */
export function reflections(c: PixelCanvas, buildings: Building[], base: number, color: Color, maxDepth: number) {
  for (const b of buildings) {
    const depth = Math.min(maxDepth, Math.round(b.h * 0.55));
    for (let j = 1; j <= depth; j++) {
      if (j % 2 === 0 && j > 2) continue;
      const inset = Math.floor(j / 4);
      for (let i = b.x + inset; i < b.x + b.w - inset; i++) if ((i + j) % 3 !== 0) c.px(i, base + j, color);
    }
  }
}

/** Cây tán tròn: nhiều cụm lá sáng/tối + thân. */
export function roundTree(c: PixelCanvas, r: Rng, x: number, baseY: number, size: number, tones: readonly Color[] = [P.leaf0, P.leaf1, P.leaf2, P.leaf3]) {
  const trunkH = Math.round(size * 0.9);
  c.rect(x - 1, baseY - trunkH, 2, trunkH, P.trunk);
  c.px(x, baseY - trunkH, P.trunkDark).vline(x, baseY - trunkH + 1, baseY - 1, P.trunkDark);
  const cy = baseY - trunkH - size * 0.6;
  c.disc(x, cy + 1, size, tones[0]);
  c.disc(x - size * 0.35, cy, size * 0.8, tones[1]);
  c.disc(x + size * 0.25, cy - size * 0.2, size * 0.75, tones[1]);
  c.disc(x - size * 0.3, cy - size * 0.35, size * 0.5, tones[2]);
  for (let k = 0; k < Math.round(size * 1.8); k++) {
    const lx = x + r.int(-Math.round(size * 0.75), Math.round(size * 0.55));
    const ly = cy + r.int(-Math.round(size * 1.05), Math.round(size * 0.15));
    c.px(lx, ly, r.chance(0.22) ? P.leafHighlight : tones[3]);
  }
  for (let k = 0; k < Math.round(size * 0.75); k++) {
    c.px(x + r.int(-size, size), cy + r.int(0, Math.ceil(size * 0.55)), P.leafShadow);
  }
  for (let k = 0; k < Math.round(size * 2.5); k++) {
    const lx = x + r.int(-Math.round(size * 0.8), Math.round(size * 0.8)) + (r.next() - 0.5) / c.scale;
    const ly = cy + r.int(-Math.round(size * 0.9), Math.round(size * 0.4)) + (r.next() - 0.5) / c.scale;
    c.finePx(lx, ly, r.chance(0.22) ? P.leafHighlight : tones[3]);
  }
}

/** Bụi cây thấp. */
export function bush(c: PixelCanvas, x: number, baseY: number, w: number, tones: readonly Color[] = [P.leaf1, P.leaf2, P.leaf3]) {
  const r = w / 3;
  c.ellipse(x + w / 2, baseY - r, w / 2, r, tones[0]);
  c.disc(x + r, baseY - r * 1.2, r * 0.8, tones[1]);
  c.disc(x + w - r * 1.1, baseY - r * 1.1, r * 0.7, tones[1]);
  c.px(x + r - 1, baseY - r * 1.6, tones[2]).px(x + r, baseY - r * 1.8, tones[2]);
  c.px(x + w * 0.65, baseY - r * 1.5, P.leafHighlight).px(x + w * 0.72, baseY - r * 1.2, tones[2]);
  c.px(x + w * 0.35, baseY - r * 0.45, P.leafShadow);
  // `r` ở đây là bán kính — chi tiết lá dùng PRNG riêng, seed theo vị trí để bụi cây luôn vẽ giống nhau
  const leaf = rng(Math.round(x * 131 + baseY * 17 + w * 7));
  for (let k = 0; k < Math.round(w * 0.8); k++) {
    c.finePx(x + leaf.next() * w, baseY - r * (0.4 + leaf.next() * 1.2), leaf.chance(0.3) ? P.leafHighlight : tones[2]);
  }
  c.hline(x, x + w, baseY, tones[0]);
}

export type HairStyle = 'short' | 'side' | 'long' | 'bun' | 'bald' | 'pony';

export interface BustOpts {
  skin?: Color;
  hair: Color;
  hairShade?: Color;
  style: HairStyle;
  shirt: Color;
  shirtShade: Color;
  collar?: Color;
  glasses?: boolean;
  /** Bán kính đầu (pixel logic). */
  head: number;
  smile?: boolean;
}

/**
 * Nửa người nhìn thẳng (đầu + vai), vẽ lên canvas riêng rồi viền ngoài.
 * (cx, top) = tâm ngang và đỉnh đầu. Vai kéo xuống tới `bottom`.
 */
export function bust(target: PixelCanvas, cx: number, top: number, bottom: number, o: BustOpts, outline: Color | null = P.outline) {
  const c = new PixelCanvas(target.w, target.h, target.scale);
  const r = o.head;
  const cy = top + r;
  const skin = o.skin ?? P.skin;
  const shade = o.hairShade ?? o.hair;

  // Tóc dài phía sau
  if (o.style === 'long') c.rect(cx - r - 1, cy - 1, 2 * r + 3, Math.round(r * 2.2), o.hair);
  if (o.style === 'pony') c.rect(cx + r - 1, cy - 1, 3, Math.round(r * 1.6), o.hair);

  // Vai + thân
  const sw = Math.round(r * 2.9);
  const sTop = cy + r + 1;
  c.ellipse(cx, sTop + r * 1.1, sw / 2, r * 1.1, o.shirt);
  c.rect(cx - sw / 2, sTop + r, sw + 1, bottom - sTop - r + 1, o.shirt);
  c.rect(cx + Math.round(sw * 0.2), sTop + 2, Math.round(sw * 0.3), bottom - sTop, o.shirtShade);
  if (r >= 5) {
    c.vline(cx - 1, sTop + 3, Math.min(bottom - 2, sTop + r * 2), o.shirtShade);
    c.px(cx - Math.round(sw * 0.2), sTop + r + 2, o.collar ?? P.shirtLight);
    c.px(cx - Math.round(sw * 0.2), sTop + r + 5, o.collar ?? P.shirtLight);
  }
  // Cổ + cổ áo
  c.rect(cx - 1, cy + r - 1, 3, 3, P.skinShade);
  if (o.collar) c.px(cx - 2, sTop, o.collar).px(cx + 2, sTop, o.collar).px(cx - 1, sTop + 1, o.collar).px(cx + 1, sTop + 1, o.collar);

  // Đầu, tai
  c.disc(cx, cy, r, skin);
  c.px(cx - r - 1, cy + 1, skin).px(cx + r + 1, cy + 1, skin);
  c.vline(cx + r - 1, cy - 1, cy + r - 2, P.skinShade);

  // Tóc
  if (o.style !== 'bald') {
    for (let y = cy - r - 1; y <= cy; y++) {
      for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        const dx = x - cx, dy = y - cy;
        const inHead = dx * dx + dy * dy <= (r + 1.2) * (r + 1.2);
        const fringe = y <= cy - Math.round(r * 0.35) || Math.abs(dx) >= r - (o.style === 'side' && dx < 0 ? 0 : 1);
        if (inHead && fringe) c.px(x, y, o.hair);
      }
    }
    if (o.style === 'side') c.hline(cx - r + 1, cx + 1, cy - Math.round(r * 0.35) + 1, o.hair);
    if (o.style === 'bun') c.disc(cx, cy - r - 2, Math.max(1.5, r * 0.45), o.hair);
    c.hline(cx - r + 2, cx - 1, cy - r, shade);
    if (r >= 5) {
      c.px(cx + r - 2, cy - r + 2, shade);
      if (o.style === 'long') c.vline(cx + r, cy + 1, cy + r + 1, shade);
      if (o.style === 'pony') c.px(cx + r + 1, cy + r, shade);
    }
  } else {
    c.px(cx - r, cy - 1, o.hair).px(cx + r, cy - 1, o.hair).px(cx - r, cy, o.hair).px(cx + r, cy, o.hair);
    c.hline(cx - r + 1, cx + r - 1, cy - r, o.hair);
  }

  // Mặt
  const ey = cy + Math.max(0, Math.round(r * 0.15));
  const ex = Math.max(1, Math.round(r * 0.45));
  if (r >= 5) c.hline(cx - ex, cx - ex + 1, ey - 2, shade).hline(cx + ex - 1, cx + ex, ey - 2, shade);
  c.px(cx - ex, ey, P.ink).px(cx + ex, ey, P.ink);
  if (o.glasses) {
    c.px(cx - ex - 1, ey, P.ink).px(cx - ex + 1, ey, P.ink).px(cx + ex - 1, ey, P.ink).px(cx + ex + 1, ey, P.ink);
    c.hline(cx - ex - 1, cx + ex + 1, ey - 1, P.ink);
  }
  if (r >= 5) c.px(cx, ey + 1, P.skinShade);
  if (r >= 5) {
    c.finePx(cx - ex + 0.5, ey + 0.5, '#FFFFFF');
    c.finePx(cx + ex + 0.5, ey + 0.5, '#FFFFFF');
    c.finePx(cx + r * 0.45, cy + r * 0.55, skin);
  }
  if (r >= 4) c.px(cx - ex - 1, ey + 2, '#F2A7A0').px(cx + ex + 1, ey + 2, '#F2A7A0');
  if (o.smile !== false) {
    if (r >= 4) c.hline(cx - 1, cx + 1, ey + Math.round(r * 0.5), P.skinDark);
    else c.px(cx, ey + 2, P.skinDark);
  }

  if (outline) c.outline(outline);
  target.draw(c);
}
