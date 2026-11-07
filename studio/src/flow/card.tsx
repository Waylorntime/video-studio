import type { SpringConfig } from "remotion";
import { seeded } from "../random";
import { Block, C, S, lerp, ramp, sp } from "../ref/kit";
import { useClock } from "./clock";

/**
 * 卡片外壳：只管「怎么出来、怎么消失」，不管长什么样（样子由 children 决定）。
 *
 * 出场 enter：pop 弹出 / pixel 方块飞来拼成 / drop 掉落 / slide-left / slide-right 滑入 /
 *            flip 翻转 / open 复古窗口展开 / wipe 横向擦出 / none
 * 退场 exit： pop 缩没 / pixel 碎成方块飞散 / fall 掉出画面 / slide-left / slide-right 滑出 /
 *            flip 翻走 / close 窗口收起 / fade 淡出 / none
 *
 * 时间：at = 第几帧开始出场；out = 第几帧开始退场（默认让退场刚好在句尾结束）。
 */
export type EnterKind = "pop" | "pixel" | "drop" | "slide-left" | "slide-right" | "flip" | "open" | "wipe" | "print" | "none";
export type ExitKind = "pop" | "pixel" | "fall" | "slide-left" | "slide-right" | "flip" | "close" | "fade" | "none";
export type PixelFrom = "random" | "left" | "right" | "top" | "bottom";

const EXIT_LEN: Record<ExitKind, number> = {
  pop: 7,
  pixel: 26,
  fall: 18,
  "slide-left": 10,
  "slide-right": 10,
  flip: 8,
  close: 10,
  fade: 8,
  none: 0,
};

const DEFAULT_COLORS = [C.blue, C.yellow, C.red, C.green, C.paper, C.paper];

export type CardProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  at?: number;
  out?: number;
  enter?: EnterKind;
  exit?: ExitKind;
  rotate?: number;
  seed?: string;
  /** 像素过渡的格子边长 */
  cell?: number;
  colors?: string[];
  from?: PixelFrom;
  /** CSS box-shadow，像素过渡时随拼合进度出现 */
  shadow?: string;
  /** 像素出场时方块全部从这个点（卡片内坐标）吐出来：联动「吐块成卡」 */
  fromPt?: [number, number];
  /** 像素退场时方块被吸到这个点（卡片内坐标）：联动「碎块流动」 */
  toPt?: [number, number];
  children?: React.ReactNode;
};

const easeIn = (p: number) => p * p * p;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

type Cell = { x: number; y: number; key: string; r: () => number; order: number };

const makeCells = (w: number, h: number, cell: number, seed: string, from: PixelFrom): Cell[] => {
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const cells: Cell[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const r = seeded(`${seed}-${i}-${j}`);
      const rand = r();
      // order ∈ [0,1]：越小越早
      const order =
        from === "left"
          ? i / cols
          : from === "right"
            ? 1 - i / cols
            : from === "top"
              ? j / rows
              : from === "bottom"
                ? 1 - j / rows
                : rand;
      cells.push({ x: i * cell, y: j * cell, key: `${i}-${j}`, r, order: Math.min(1, order * 0.75 + rand * 0.25) });
    }
  return cells;
};

const maskFor = (w: number, h: number, cell: number, cells: Cell[]) => {
  const rects = cells.map((c) => `<rect x="${c.x - 0.5}" y="${c.y - 0.5}" width="${cell + 1}" height="${cell + 1}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: `${w}px ${h}px`,
    maskSize: `${w}px ${h}px`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  } as React.CSSProperties;
};

/** 复古窗口展开/收起时的几圈虚框 */
const ZoomRects: React.FC<{ w: number; h: number; p: number }> = ({ w, h, p }) => (
  <>
    {[0, 1, 2, 3].map((k) => {
      const s = Math.max(0.04, Math.min(1, p * 1.25 - k * 0.12));
      if (p * 1.25 - k * 0.12 <= 0 || s >= 1) return null;
      return (
        <div
          key={k}
          style={{
            position: "absolute",
            left: (w * (1 - s)) / 2,
            top: (h * (1 - s)) / 2,
            width: w * s,
            height: h * s,
            border: "3px solid rgba(245,244,240,0.85)",
            boxSizing: "border-box",
          }}
        />
      );
    })}
  </>
);

export const Card: React.FC<CardProps> = ({
  x,
  y,
  w,
  h,
  at = 0,
  out,
  enter = "pop",
  exit = "pop",
  rotate = 0,
  seed = `${x}-${y}`,
  cell = 36,
  colors = DEFAULT_COLORS,
  from = "random",
  shadow,
  fromPt,
  toPt,
  children,
}) => {
  const { f, dur } = useClock();
  if (f < at) return null;
  const outStart = out ?? dur - EXIT_LEN[exit];
  if (exit !== "none" && f >= outStart + EXIT_LEN[exit] + (exit === "pixel" ? 12 : 0)) return null;

  const li = f - at;
  const lo = f - outStart;
  const exiting = exit !== "none" && lo >= 0;

  let tx = 0;
  let ty = 0;
  let sc = 1;
  let sx = 1;
  let sy = 1;
  let rot = rotate;
  let ry = 0;
  let skew = 0;
  let opacity = 1;
  let clip: string | undefined;
  let mask: React.CSSProperties = {};
  let shadowAlpha = 1;
  const extra: React.ReactNode[] = [];

  /* ---------- 出场 ---------- */
  if (enter === "pop") {
    const p = sp(li, S.bouncy);
    sc = lerp(p, 0.5, 1);
    opacity = Math.min(1, p * 3);
  } else if (enter === "drop") {
    const p = sp(li, { damping: 11, stiffness: 120, mass: 0.9 } as SpringConfig);
    ty = lerp(p, -1000, 0);
    rot += lerp(p, -12, 0);
  } else if (enter === "slide-left" || enter === "slide-right") {
    const p = sp(li, S.card);
    const dir = enter === "slide-left" ? -1 : 1;
    tx = lerp(p, 1700 * dir, 0);
    skew = (1 - p) * 14 * dir;
  } else if (enter === "flip") {
    const p = sp(li, S.card);
    ry = lerp(p, 95, 0);
    opacity = li >= 0 ? 1 : 0;
  } else if (enter === "open") {
    const zr = ramp(li, 0, 10);
    if (zr < 1) extra.push(<ZoomRects key="zr" w={w} h={h} p={zr} />);
    const p = sp(li - 7, S.snap);
    sc = lerp(p, 0.86, 1);
    opacity = li >= 7 ? Math.min(1, p * 3) : 0;
    shadowAlpha = opacity;
  } else if (enter === "wipe") {
    const e = easeInOut(ramp(li, 0, 16));
    clip = `inset(-40px ${(1 - e) * 100}% -40px -40px)`;
  } else if (enter === "print") {
    // 扫描打印：一行行从上往下出现，边缘一条亮扫描线
    const e = ramp(li, 0, 22);
    clip = `inset(-40px -40px ${(1 - e) * 100}% -40px)`;
    shadowAlpha = e;
    if (e < 1)
      extra.push(
        <div
          key="scan"
          style={{ position: "absolute", left: -14, right: -14, top: e * h - 4, height: 8, background: "#7CF0A0", boxShadow: "0 0 24px 6px rgba(124,240,160,0.7)" }}
        />,
      );
  } else if (enter === "pixel") {
    const cells = makeCells(w, h, cell, `${seed}-in`, from);
    const spread = 18;
    const fly = 9;
    const shown: Cell[] = [];
    cells.forEach((c) => {
      const d = c.order * spread;
      const lf = li - d;
      if (lf < 0) return;
      const landed = lf >= fly;
      if (landed) shown.push(c);
      const fadeOut = landed ? 1 - (lf - fly) / 5 : 1;
      if (fadeOut <= 0) return;
      const p = Math.min(1, sp(lf, S.snap) * 1.02);
      const r = seeded(`${seed}-fly-${c.key}`);
      const ox = fromPt
        ? fromPt[0] - c.x + (r() - 0.5) * 30
        : from === "left" ? -700 - r() * 400 : from === "right" ? 700 + r() * 400 : (r() - 0.5) * 1400;
      const oy = fromPt
        ? fromPt[1] - c.y + (r() - 0.5) * 30 - Math.sin(p * Math.PI) * 160
        : from === "top" ? -700 - r() * 300 : from === "bottom" ? 700 + r() * 300 : -300 - r() * 600;
      const color = colors[Math.floor(r() * colors.length)];
      extra.push(
        <Block
          key={`in-${c.key}`}
          w={cell - 4}
          h={cell - 4}
          color={color}
          style={{
            position: "absolute",
            left: c.x + 2,
            top: c.y + 2,
            transform: `translate(${lerp(p, ox, 0)}px, ${lerp(p, oy, 0)}px) rotate(${lerp(p, (r() - 0.5) * 540, 0)}deg)`,
            opacity: Math.min(1, p * 4) * fadeOut,
          }}
        />,
      );
    });
    shadowAlpha = shown.length / cells.length;
    if (shown.length < cells.length) mask = maskFor(w, h, cell, shown);
  }

  /* ---------- 退场 ---------- */
  if (exiting) {
    const L = EXIT_LEN[exit];
    if (exit === "pop") {
      const e = easeIn(ramp(lo, 0, L));
      sc *= 1 - 0.6 * e;
      opacity *= 1 - e;
    } else if (exit === "fade") {
      opacity *= 1 - ramp(lo, 0, L);
    } else if (exit === "fall") {
      const t = lo / 30;
      ty += -420 * t + 0.5 * 7000 * t * t;
      rot += lo * 1.6 * (seeded(seed)() > 0.5 ? 1 : -1);
    } else if (exit === "slide-left" || exit === "slide-right") {
      const e = easeIn(ramp(lo, 0, L));
      tx += 1900 * e * (exit === "slide-left" ? -1 : 1);
      skew += 10 * e * (exit === "slide-left" ? 1 : -1);
    } else if (exit === "flip") {
      ry += lerp(easeIn(ramp(lo, 0, L)), 0, -95);
    } else if (exit === "close") {
      const a = ramp(lo, 0, 5);
      sy *= lerp(easeIn(a), 1, 0.02);
      sx *= lerp(easeIn(ramp(lo, 3, 6)), 1, 0.3);
      if (lo >= 5) {
        opacity = 0;
        extra.push(<ZoomRects key="zr-out" w={w} h={h} p={1 - ramp(lo, 5, L)} />);
      }
      shadowAlpha = 1 - a;
    } else if (exit === "pixel") {
      const cells = makeCells(w, h, cell, `${seed}-out`, from === "random" ? "random" : from);
      const spread = 10;
      const keep: Cell[] = [];
      cells.forEach((c) => {
        const d = c.order * spread;
        const lf = lo - d;
        if (lf < 0) {
          keep.push(c);
          return;
        }
        const t = lf / 30;
        if (toPt) {
          // 被吸走：沿弧线飞向目标点，越近越小
          const q = Math.min(1, t / 0.6);
          if (q >= 1) return;
          const e = q * q * (3 - 2 * q);
          const r2 = seeded(`${seed}-suck-${c.key}`);
          const color = colors[Math.floor(r2() * colors.length)];
          extra.push(
            <Block
              key={`out-${c.key}`}
              w={cell - 4}
              h={cell - 4}
              color={color}
              style={{
                position: "absolute",
                left: c.x + 2,
                top: c.y + 2,
                transform: `translate(${(toPt[0] - c.x) * e}px, ${(toPt[1] - c.y) * e - Math.sin(e * Math.PI) * (80 + r2() * 120)}px) scale(${1 - e * 0.6})`,
              }}
            />,
          );
          return;
        }
        if (t > 0.55) return;
        const r = seeded(`${seed}-burst-${c.key}`);
        const vx = (r() - 0.5) * 700 + (c.x / w - 0.5) * 500;
        const vy = -(350 + r() * 600);
        const color = colors[Math.floor(r() * colors.length)];
        extra.push(
          <Block
            key={`out-${c.key}`}
            w={cell - 4}
            h={cell - 4}
            color={color}
            style={{
              position: "absolute",
              left: c.x + 2,
              top: c.y + 2,
              transform: `translate(${vx * t}px, ${vy * t + 0.5 * 2600 * t * t}px) rotate(${(r() - 0.5) * 900 * t}deg) scale(${1 - t * 0.8})`,
              opacity: 1 - t / 0.55,
            }}
          />,
        );
      });
      shadowAlpha = Math.min(shadowAlpha, keep.length / cells.length);
      mask = keep.length ? maskFor(w, h, cell, keep) : { opacity: 0 };
    }
  }

  const transform = [
    `translate(${tx}px, ${ty}px)`,
    ry !== 0 ? `perspective(1600px) rotateY(${ry}deg)` : "",
    `rotate(${rot}deg)`,
    skew !== 0 ? `skewX(${skew}deg)` : "",
    `scale(${sc * sx}, ${sc * sy})`,
  ].join(" ");

  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform, transformOrigin: "50% 50%" }}>
      {shadow && (
        <div style={{ position: "absolute", inset: 0, boxShadow: shadow, opacity: shadowAlpha * opacity }} />
      )}
      <div style={{ position: "absolute", inset: 0, opacity, clipPath: clip, ...mask }}>{children}</div>
      {extra}
    </div>
  );
};
