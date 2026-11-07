import { interpolate, spring, type SpringConfig } from "remotion";

/**
 * 参考风格（黑底信息图）的公共参数与小组件。
 * 颜色、字号、弹簧档位都集中在这里，场景里只引用不写死。
 */
export const C = {
  bg: "#0C0C0E",
  paper: "#F5F4F0",
  paperShade: "#DCDBD5",
  ink: "#151515",
  inkSoft: "#6E6E73",
  red: "#E5483A",
  blue: "#3A78F2",
  blueDeep: "#2A5BC4",
  yellow: "#F6C445",
  green: "#5CBF45",
  orange: "#F07A3C",
  steel: "#8A8F99",
  steelDark: "#555A64",
  screen: "#12151C",
};

export const F = {
  sans: '"NotoSans", "Microsoft YaHei", sans-serif',
  mono: '"Cascadia Mono", "Consolas", monospace',
};

/** 弹簧四档：同类元素用同一档 */
export const S = {
  snap: { damping: 18, stiffness: 280, mass: 0.6 } as SpringConfig,
  card: { damping: 13, stiffness: 150, mass: 0.8 } as SpringConfig,
  heavy: { damping: 24, stiffness: 90, mass: 1 } as SpringConfig,
  bouncy: { damping: 8, stiffness: 190, mass: 0.6 } as SpringConfig,
};

export const sp = (f: number, cfg: SpringConfig, delay = 0, fps = 30) =>
  spring({ frame: f - delay, fps, config: cfg });

export const lerp = (p: number, a: number, b: number) => a + (b - a) * p;

export const ramp = (f: number, f0: number, f1: number) =>
  interpolate(f, [f0, f1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** 先快后慢，计数器用 */
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** 弹入：从 0.6 放大到 1，带过冲；返回 transform 与 opacity */
export const popIn = (f: number, delay = 0, cfg: SpringConfig = S.card, from = 0.6) => {
  const p = sp(f, cfg, delay);
  return {
    transform: `scale(${lerp(p, from, 1)})`,
    opacity: Math.min(1, p * 2.5),
  };
};

/* ---------- 标签 ---------- */

export const Tag: React.FC<{
  color: string;
  children: React.ReactNode;
  size?: number;
  dark?: boolean;
  style?: React.CSSProperties;
}> = ({ color, children, size = 34, dark, style }) => (
  <div
    style={{
      display: "inline-block",
      background: color,
      color: dark ? C.ink : "#fff",
      fontFamily: F.sans,
      fontWeight: 800,
      fontSize: size,
      padding: `${size * 0.12}px ${size * 0.42}px`,
      lineHeight: 1.25,
      whiteSpace: "nowrap",
      boxShadow: "0 6px 0 rgba(0,0,0,0.35)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** 白底黑字的说明牌（参考里最常见的「标题卡」） */
export const Label: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 40,
  style,
}) => (
  <div
    style={{
      display: "inline-block",
      background: C.paper,
      color: C.ink,
      fontFamily: F.sans,
      fontWeight: 800,
      fontSize: size,
      padding: `${size * 0.22}px ${size * 0.6}px`,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
      ...style,
    }}
  >
    {children}
  </div>
);

/* ---------- 像素元素 ---------- */

/** 一块 Token 积木：上亮下暗，像素风立体感 */
export const Block: React.FC<{ w: number; h: number; color: string; style?: React.CSSProperties }> = ({
  w,
  h,
  color,
  style,
}) => (
  <div
    style={{
      width: w,
      height: h,
      background: color,
      boxShadow: `inset 0 -${Math.max(3, h * 0.18)}px 0 rgba(0,0,0,0.25), inset 0 ${Math.max(2, h * 0.12)}px 0 rgba(255,255,255,0.28)`,
      ...style,
    }}
  />
);

/** 像素机器人 = 模型。eyes 控制眨眼（0 睁 1 闭） */
export const PixelBot: React.FC<{ px?: number; blink?: boolean; glow?: number }> = ({ px = 14, blink, glow = 0 }) => {
  const map = [
    "....oo......",
    ".....o......",
    ".wwwwwwwwww.",
    "wddddddddddw",
    blink ? "wddddddddddw" : "wddccddccddw",
    blink ? "wdccddddccdw" : "wddccddccddw",
    "wddddddddddw",
    "wddddmmddddw",
    ".wwwwwwwwww.",
    "....wwww....",
    "..wwwwwwww..",
    "..ww....ww..",
  ];
  const col: Record<string, string> = {
    o: C.orange,
    w: "#EDEDED",
    d: "#1B2130",
    c: "#7FE3FF",
    m: "#7FE3FF",
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(12, ${px}px)`,
        filter: glow > 0 ? `drop-shadow(0 0 ${18 * glow}px rgba(127,227,255,${0.7 * glow}))` : undefined,
      }}
    >
      {map.join("").split("").map((ch, i) => (
        <div key={i} style={{ width: px, height: px, background: col[ch] ?? "transparent" }} />
      ))}
    </div>
  );
};

/** 像素桌：桌面 + 两条腿 */
export const Table: React.FC<{ width: number; legs?: number }> = ({ width, legs = 70 }) => (
  <div style={{ width }}>
    <div style={{ height: 14, background: C.steel, boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.25)" }} />
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 34px" }}>
      <div style={{ width: 14, height: legs, background: C.steelDark }} />
      <div style={{ width: 14, height: legs, background: C.steelDark }} />
    </div>
  </div>
);
