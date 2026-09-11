// Window: a reusable "RPG Maker style" windowskin renderer — gradient fill,
// double border, and corner ornaments — mirroring Window_Base's look.

/** Shared color palette so every scene reads from the same design system. */
export const Palette = {
  text: "#ffffff",
  textDim: "#9aa0b4",
  textFaint: "#6b7280",
  accent: "#ffe08a",
  gold: "#f2c14e",
  purple: "#7d6bb0",
  hp: "#52b788",
  mp: "#5fa8d3",
  danger: "#e63946",
  heal: "#7ee787",
  disabled: "#4b5062",
} as const;

const HEADER_HEIGHT = 40;
const FOOTER_MARGIN = 26;

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();

  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "rgba(28, 26, 48, 0.95)");
  bg.addColorStop(1, "rgba(12, 11, 24, 0.95)");
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#7d6bb0";
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 6);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f2c14e";
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  // corner ornaments, a small nod to RPG Maker's gold-corner windowskins
  ctx.fillStyle = "#f2c14e";
  const c = 5;
  for (const [cx, cy] of [
    [x + 6, y + 6],
    [x + w - 6, y + 6],
    [x + 6, y + h - 6],
    [x + w - 6, y + h - 6],
  ] as [number, number][]) {
    ctx.beginPath();
    ctx.arc(cx, cy, c / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** The full-width bar every scene uses to show its name/context + a right-aligned hint. */
export function drawHeaderBar(ctx: CanvasRenderingContext2D, title: string, rightHint = "") {
  drawWindow(ctx, 0, 0, ctx.canvas.width, HEADER_HEIGHT);
  drawText(ctx, title, 16, 11, Palette.accent, "bold 17px sans-serif");
  if (rightHint) drawText(ctx, rightHint, ctx.canvas.width - 16, 13, Palette.textDim, "12px sans-serif", "right");
}

/** The centered hint line every scene anchors to the bottom of the screen. */
export function drawFooterHint(ctx: CanvasRenderingContext2D, text: string) {
  drawText(ctx, text, ctx.canvas.width / 2, ctx.canvas.height - FOOTER_MARGIN, Palette.textFaint, "12px sans-serif", "center");
}

export interface ListItem {
  label: string;
  value?: string;
  disabled?: boolean;
}

/** A vertically-stacked selectable list (menus, skills, items, shop entries, ...). */
export function drawListVertical(
  ctx: CanvasRenderingContext2D,
  items: ListItem[],
  x: number,
  y: number,
  selectedIndex: number,
  opts?: { lineHeight?: number; font?: string; valueColor?: string }
) {
  const lineHeight = opts?.lineHeight ?? 26;
  const font = opts?.font ?? "15px sans-serif";
  items.forEach((item, i) => {
    const selected = i === selectedIndex;
    const color = item.disabled ? Palette.disabled : selected ? Palette.accent : Palette.text;
    drawText(ctx, (selected ? "> " : "  ") + item.label, x, y + i * lineHeight, color, font);
    if (item.value) {
      drawText(ctx, item.value, x + 260, y + i * lineHeight, opts?.valueColor ?? Palette.gold, font, "right");
    }
  });
}

/** A horizontally-spaced selectable list (battle command bar, title menu, ...). */
export function drawListHorizontal(
  ctx: CanvasRenderingContext2D,
  items: ListItem[],
  x: number,
  y: number,
  selectedIndex: number,
  spacing: number,
  font = "15px sans-serif"
) {
  items.forEach((item, i) => {
    const selected = i === selectedIndex;
    const color = item.disabled ? Palette.disabled : selected ? Palette.accent : Palette.text;
    drawText(ctx, (selected ? "> " : "  ") + item.label, x + i * spacing, y, color, font);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = "#ffffff",
  font = "16px sans-serif",
  align: CanvasTextAlign = "left"
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawGauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  color: string
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "#1c1a2e";
  ctx.fill();

  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped > 0) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, lighten(color));
    grad.addColorStop(1, color);
    ctx.save();
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * clamped, h);
    ctx.restore();
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  ctx.restore();
}

function lighten(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 60);
  const g = Math.min(255, ((n >> 8) & 0xff) + 60);
  const b = Math.min(255, (n & 0xff) + 60);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Round avatar placeholder standing in for a character's face graphic. */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  letter: string
) {
  ctx.save();
  const grad = ctx.createRadialGradient(x + size * 0.35, y + size * 0.3, size * 0.1, x + size / 2, y + size / 2, size / 2);
  grad.addColorStop(0, lighten(color));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f2c14e";
  ctx.stroke();
  ctx.fillStyle = "#10121c";
  ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, x + size / 2, y + size / 2 + 1);
  ctx.restore();
}

/** Soft ground shadow drawn beneath sprites to lift them off the floor. */
export function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w, w * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A vertical sky-to-ground gradient backdrop shared by several scenes. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, topColor: string, bottomColor: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Deterministic twinkling starfield used behind title/story screens. */
export function drawStarfield(ctx: CanvasRenderingContext2D, time: number, count = 60) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const seed = i * 37.13;
    const x = (Math.sin(seed) * 0.5 + 0.5) * ctx.canvas.width;
    const y = (Math.cos(seed * 1.7) * 0.5 + 0.5) * (ctx.canvas.height * 0.7);
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + seed));
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

