// PixelCanvas — lưới pixel logic để vẽ minh họa bằng code, xuất ra SVG path.
// Mỗi màu = 1 <path>, các pixel liền nhau cùng màu trên một hàng được gộp thành 1 đoạn,
// nên cả một scene chỉ vài chục phần tử DOM dù có hàng nghìn pixel.

export type Color = string;
export type Point = readonly [number, number];

export interface PixelPath {
  fill: Color;
  d: string;
}

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly scale: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly data: (Color | undefined)[];

  constructor(w: number, h: number, scale = 1) {
    this.w = w;
    this.h = h;
    this.scale = Math.max(1, Math.floor(scale));
    this.pixelWidth = w * this.scale;
    this.pixelHeight = h * this.scale;
    this.data = new Array(this.pixelWidth * this.pixelHeight);
  }

  get(x: number, y: number): Color | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.data[Math.round(y) * this.scale * this.pixelWidth + Math.round(x) * this.scale];
  }

  px(x: number, y: number, c: Color): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const sx = x * this.scale;
    const sy = y * this.scale;
    for (let j = 0; j < this.scale; j++) {
      const row = (sy + j) * this.pixelWidth + sx;
      for (let i = 0; i < this.scale; i++) this.data[row + i] = c;
    }
    return this;
  }

  /** One output pixel at fractional logical coordinates for fine-detail clusters. */
  finePx(x: number, y: number, c: Color): this {
    const px = Math.round(x * this.scale);
    const py = Math.round(y * this.scale);
    if (px >= 0 && py >= 0 && px < this.pixelWidth && py < this.pixelHeight) this.data[py * this.pixelWidth + px] = c;
    return this;
  }

  /** Xóa pixel (trong suốt). */
  clear(x: number, y: number): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) {
      const sx = x * this.scale;
      const sy = y * this.scale;
      for (let j = 0; j < this.scale; j++) {
        const row = (sy + j) * this.pixelWidth + sx;
        for (let i = 0; i < this.scale; i++) this.data[row + i] = undefined;
      }
    }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: Color): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: Color): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, c);
    return this;
  }

  /** Hình tròn đặc, tâm có thể là số lẻ .5 để có đường kính chẵn. */
  disc(cx: number, cy: number, r: number, c: Color): this {
    return this.ellipse(cx, cy, r, r, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - (cx + 0.5)) / (rx + 0.35);
        const dy = (y + 0.5 - (cy + 0.5)) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }

  /** Đường thẳng Bresenham, `thick` > 1 vẽ bằng các chấm vuông. */
  line(x0: number, y0: number, x1: number, y1: number, c: Color, thick = 1): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const off = Math.floor((thick - 1) / 2);
    for (;;) {
      this.rect(x0 - off, y0 - off, thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Tô đa giác (scanline, quy tắc chẵn-lẻ). */
  poly(points: readonly Point[], c: Color): this {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
      }
    }
    return this;
  }

  /** Tô bàn cờ (dither) — tạo chuyển màu kiểu pixel art. */
  dither(x: number, y: number, w: number, h: number, c: Color, phase = 0): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((x + i + y + j + phase) % 2 === 0) this.px(x + i, y + j, c);
    return this;
  }

  /** Vẽ sprite dạng chuỗi ký tự; '.' hoặc ' ' là trong suốt. */
  sprite(rows: readonly string[], palette: Readonly<Record<string, Color>>, x: number, y: number, flip = false): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[flip ? row.length - 1 - i : i];
        const c = palette[ch];
        if (c) this.px(x + i, y + j, c);
      }
    });
    return this;
  }

  /** Dán canvas khác lên canvas này. */
  draw(other: PixelCanvas, dx = 0, dy = 0): this {
    const offsetX = Math.round(dx * this.scale);
    const offsetY = Math.round(dy * this.scale);
    for (let y = 0; y < other.pixelHeight; y++) {
      for (let x = 0; x < other.pixelWidth; x++) {
        const color = other.data[y * other.pixelWidth + x];
        const px = x + offsetX;
        const py = y + offsetY;
        if (color && px >= 0 && py >= 0 && px < this.pixelWidth && py < this.pixelHeight) {
          this.data[py * this.pixelWidth + px] = color;
        }
      }
    }
    return this;
  }

  /** Viền ngoài 1 pixel quanh mọi vùng đã tô (4 hướng). */
  outline(c: Color): this {
    const add: number[] = [];
    for (let y = 0; y < this.pixelHeight; y++) {
      for (let x = 0; x < this.pixelWidth; x++) {
        const index = y * this.pixelWidth + x;
        if (this.data[index]) continue;
        if ((x > 0 && this.data[index - 1]) || (x + 1 < this.pixelWidth && this.data[index + 1]) ||
          (y > 0 && this.data[index - this.pixelWidth]) || (y + 1 < this.pixelHeight && this.data[index + this.pixelWidth])) add.push(index);
      }
    }
    for (const i of add) this.data[i] = c;
    return this;
  }

  /** Thay một màu bằng màu khác (đổi màu áo, tóc...). */
  recolor(from: Color, to: Color): this {
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === from) this.data[i] = to;
    return this;
  }

  toPaths(): PixelPath[] {
    const byColor = new Map<Color, string[]>();
    for (let y = 0; y < this.pixelHeight; y++) {
      let x = 0;
      while (x < this.pixelWidth) {
        const c = this.data[y * this.pixelWidth + x];
        if (!c) { x++; continue; }
        let run = 1;
        while (x + run < this.pixelWidth && this.data[y * this.pixelWidth + x + run] === c) run++;
        let parts = byColor.get(c);
        if (!parts) byColor.set(c, (parts = []));
        parts.push(`M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      }
    }
    return [...byColor].map(([fill, parts]) => ({ fill, d: parts.join('') }));
  }
}

/** PRNG mulberry32 — mọi chi tiết sinh thủ tục đều tất định theo seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;
