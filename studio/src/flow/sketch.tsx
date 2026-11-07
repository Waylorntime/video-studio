import { useCurrentFrame } from "remotion";
import { seeded } from "../random";
import { C } from "../ref/kit";

/**
 * 手绘电脑界面：线条带轻微抖动，每 5 帧重画一次（约 6 次/秒），像逐格手绘动画在「呼吸」。
 * 窗口、按钮、勾选框、箭头都用同一套笔触。
 */
export const HAND = '"Xiaolai", "WenKai", sans-serif';
export const MONO = '"Cascadia Mono", "Consolas", monospace';
export const INK = "#1A1A1A";
export const SKETCH_PAPER = "#FBFAF5";

const BOIL = 5;

const roughLine = (x1: number, y1: number, x2: number, y2: number, r: () => number, j: number) => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const o = () => (r() - 0.5) * 2 * j;
  const over = Math.min(4, len * 0.04);
  const sx = x1 - ux * over + o();
  const sy = y1 - uy * over + o();
  const ex = x2 + ux * over + o();
  const ey = y2 + uy * over + o();
  const bend = o() * 1.6;
  const mx = (x1 + x2) / 2 - uy * bend;
  const my = (y1 + y2) / 2 + ux * bend;
  return `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
};

const useBoil = (seed: string) => {
  const frame = useCurrentFrame();
  return seeded(`${seed}-${Math.floor(frame / BOIL)}`);
};

/** 手绘矩形：两遍描边，第二遍更轻 */
export const roughRectPath = (x: number, y: number, w: number, h: number, r: () => number, j = 2) => {
  const pass = () =>
    [
      roughLine(x, y, x + w, y, r, j),
      roughLine(x + w, y, x + w, y + h, r, j),
      roughLine(x + w, y + h, x, y + h, r, j),
      roughLine(x, y + h, x, y, r, j),
    ].join(" ");
  return pass() + " " + pass();
};

export const SketchRect: React.FC<{
  w: number;
  h: number;
  seed: string;
  stroke?: string;
  sw?: number;
  jitter?: number;
  style?: React.CSSProperties;
}> = ({ w, h, seed, stroke = INK, sw = 4, jitter = 2, style }) => {
  const r = useBoil(seed);
  return (
    <svg
      width={w + 20}
      height={h + 20}
      style={{ position: "absolute", left: -10, top: -10, overflow: "visible", pointerEvents: "none", ...style }}
    >
      <path d={roughRectPath(10, 10, w, h, r, jitter)} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
};

export const SketchLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  seed: string;
  stroke?: string;
  sw?: number;
}> = ({ x1, y1, x2, y2, seed, stroke = INK, sw = 4 }) => {
  const r = useBoil(seed);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <path d={roughLine(x1, y1, x2, y2, r, 1.6)} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
};

/** 按进度画出一条路径（打勾、画叉、箭头）。p ∈ [0,1] */
export const DrawPath: React.FC<{
  d: string;
  p: number;
  stroke?: string;
  sw?: number;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
}> = ({ d, p, stroke = INK, sw = 6, w = 1, h = 1, style }) => (
  <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", ...style }}>
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - Math.max(0, Math.min(1, p))}
      fill="none"
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: p > 0 ? 1 : 0 }}
    />
  </svg>
);

const Glyph: React.FC<{ kind: "min" | "max" | "close"; seed: string }> = ({ kind, seed }) => {
  const r = useBoil(seed);
  const d =
    kind === "min"
      ? roughLine(9, 24, 25, 24, r, 1)
      : kind === "max"
        ? roughRectPath(9, 9, 16, 15, r, 0.8)
        : roughLine(10, 10, 24, 24, r, 1) + " " + roughLine(24, 10, 10, 24, r, 1);
  return (
    <div style={{ position: "relative", width: 34, height: 34 }}>
      <SketchRect w={34} h={34} seed={`${seed}-b`} sw={3} jitter={1.2} />
      <svg width={34} height={34} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={d} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </div>
  );
};

/**
 * 手绘窗口：标题栏 + 三个按钮 + 窗体。children 放在窗体里（坐标从窗体左上角算起）。
 * accent 改标题栏底色；dark 让标题栏变黑底白字（代码编辑器那种）。
 */
export const SketchWindow: React.FC<{
  w: number;
  h: number;
  title: string;
  seed: string;
  accent?: string;
  dark?: boolean;
  body?: string;
  children?: React.ReactNode;
}> = ({ w, h, title, seed, accent = "#ECE7D8", dark, body = SKETCH_PAPER, children }) => {
  const bar = 60;
  return (
    <div style={{ position: "relative", width: w, height: h, background: body }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: bar, background: dark ? "#22252B" : accent }} />
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 0,
          height: bar,
          display: "flex",
          alignItems: "center",
          fontFamily: HAND,
          fontSize: 32,
          color: dark ? "#F1F1EE" : INK,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      <div style={{ position: "absolute", right: 18, top: 13, display: "flex", gap: 10, filter: dark ? "invert(1)" : undefined }}>
        <Glyph kind="min" seed={`${seed}-g1`} />
        <Glyph kind="max" seed={`${seed}-g2`} />
        <Glyph kind="close" seed={`${seed}-g3`} />
      </div>
      <SketchLine x1={0} y1={bar} x2={w} y2={bar} seed={`${seed}-bar`} />
      <div style={{ position: "absolute", left: 0, top: bar, width: w, height: h - bar, overflow: "hidden" }}>{children}</div>
      <SketchRect w={w} h={h} seed={`${seed}-frame`} sw={5} />
    </div>
  );
};

/** 手绘勾选框，p 为打勾进度 */
export const SketchCheck: React.FC<{ size?: number; p: number; seed: string; color?: string }> = ({
  size = 46,
  p,
  seed,
  color = "#2FA84F",
}) => (
  <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
    <SketchRect w={size} h={size} seed={seed} sw={3.5} jitter={1.4} />
    <DrawPath
      d={`M ${size * 0.18} ${size * 0.52} L ${size * 0.42} ${size * 0.78} L ${size * 0.88} ${size * 0.12}`}
      p={p}
      stroke={color}
      sw={size * 0.13}
    />
  </div>
);

/** 手绘按钮（定宽定高，便于画边框）；press ∈ [0,1] 为按下程度 */
export const SketchButton: React.FC<{ label: string; seed: string; w: number; h?: number; filled?: boolean; size?: number; press?: number }> = ({
  label,
  seed,
  w,
  h = 60,
  filled,
  size = 30,
  press = 0,
}) => (
  <div
    style={{
      position: "relative",
      width: w,
      height: h,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: filled ? INK : SKETCH_PAPER,
      color: filled ? "#fff" : INK,
      fontFamily: HAND,
      fontSize: size,
      transform: `translate(${press * 5}px, ${press * 5}px)`,
      boxShadow: `${6 - press * 5}px ${6 - press * 5}px 0 ${INK}`,
    }}
  >
    {label}
    {!filled && <SketchRect w={w} h={h} seed={seed} sw={3.5} jitter={1.4} />}
  </div>
);

/** 声波：竖条高度由种子决定，播放时会轻微起伏 */
export const Waveform: React.FC<{ w: number; h: number; seed: string; bars?: number; color?: string; live?: number }> = ({
  w,
  h,
  seed,
  bars = 40,
  color = C.blue,
  live = 1,
}) => {
  const frame = useCurrentFrame();
  const r = seeded(seed);
  const bw = w / bars;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.2 + r() * 0.8 * Math.sin((i / bars) * Math.PI) ** 0.5;
        const wob = 0.85 + 0.15 * Math.sin(frame / 3 + i * 1.7) * live;
        const bh = h * base * wob;
        return (
          <div
            key={i}
            style={{ position: "absolute", left: i * bw + bw * 0.15, top: (h - bh) / 2, width: bw * 0.7, height: bh, background: color }}
          />
        );
      })}
    </div>
  );
};

/** 手写字逐字打出；cursor 为是否显示光标 */
export const Typed: React.FC<{ text: string; p: number; cursor?: boolean; style?: React.CSSProperties }> = ({
  text,
  p,
  cursor,
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const n = Math.round(chars.length * Math.max(0, Math.min(1, p)));
  const blink = cursor && (p < 1 || Math.floor(frame / 8) % 2 === 0);
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {chars.slice(0, n).join("")}
      {blink && <span style={{ display: "inline-block", width: "0.08em", height: "1em", background: "currentColor", marginLeft: 2, verticalAlign: "-0.12em" }} />}
    </span>
  );
};
