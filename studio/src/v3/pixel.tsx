import { seeded } from "../random";
import { C } from "../ref/kit";

/**
 * 像素美术：每个精灵是一张字符图，一个字符一个像素，"." 透明。
 * 用 SVG 画（一格一个 rect，crispEdges），px 是一格多大。
 */
export const PX_FONT = '"Pixel", "PixelMono", monospace';
export const PX_MONO = '"PixelMono", "Pixel", monospace';

export const PAL: Record<string, string> = {
  k: "#2A2430", // 描边
  w: "#F4EBDD", // 奶油白
  W: "#FFFFFF",
  s: "#F6D3B5", // 皮肤
  S: "#E2AE8A",
  e: "#2A1E1A", // 眼睛
  p: "#F2A0A8", // 粉
  r: C.red,
  R: "#A8322A",
  o: C.orange,
  y: C.yellow,
  Y: "#C99A22",
  g: C.green,
  G: "#3E8A2E",
  b: C.blue,
  B: "#24489C",
  n: "#2B3A86", // 深蓝（DeepSeek 发色）
  N: "#4D6BFE", // DeepSeek 品牌蓝
  c: "#7FE3FF", // 屏幕青
  d: "#1B2130", // 深屏
  m: "#8A8F99", // 钢灰
  M: "#555A64",
  t: "#C9A27A", // 虎斑纹
  u: "#7A4E2D", // 棕
  U: "#4E3020",
  v: "#9B6BE0", // 紫
  V: "#6A44A8",
  l: "#BFC5CF", // 浅灰
};

export const Pix: React.FC<{
  map: string[];
  px?: number;
  pal?: Record<string, string>;
  flip?: boolean;
  style?: React.CSSProperties;
}> = ({ map, px = 6, pal, flip, style }) => {
  const P = pal ? { ...PAL, ...pal } : PAL;
  const w = Math.max(...map.map((r) => r.length));
  const h = map.length;
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) => {
    // 同色连续的格子合成一个 rect，少画很多节点
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      if (ch !== "." && ch !== " " && P[ch]) {
        const xx = flip ? w - x - n : x;
        rects.push(<rect key={`${x}-${y}`} x={xx} y={y} width={n} height={1} fill={P[ch]} />);
      }
      x += n;
    }
  });
  return (
    <svg
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ display: "block", overflow: "visible", ...style }}
    >
      {rects}
    </svg>
  );
};

/* ---------------- 角色 ---------------- */

/** 猫头小人（主讲的像素版），10×9 */
export const CAT = [
  ".k......k.",
  "kpk....kpk",
  "kwwkkkkwwk",
  "kwtwwwwtwk",
  "kwewwwwewk",
  "kwwwwwwwwk",
  "kpwwkkwwpk",
  ".kwwwwwwk.",
  "..kkookk..",
];

/** 小工人：帽子颜色 c 由调用方换色。A/B 两帧走路，UP 双手举起 */
const WORKER_TOP = [
  "..kkkk...",
  ".kcccck..",
  "kcccccckk",
  "kccccccck",
  ".kssssk..",
  ".kseske..",
  ".kssssk..",
];
export const WORKER_A = [
  ...WORKER_TOP,
  "..kffk...",
  ".sffffs..",
  ".kffffk..",
  "..kffk...",
  "..u..u...",
  ".kk..kk..",
];
export const WORKER_B = [
  ...WORKER_TOP,
  "..kffk...",
  ".sffffs..",
  ".kffffk..",
  "..kffk...",
  "...uu....",
  "..kkkk...",
];
export const WORKER_UP = [
  "s.kkkk.s.",
  "skcccck s",
  "kcccccckk",
  "kccccccck",
  ".kssssk..",
  ".kseske..",
  ".kssssk..",
  "..kffk...",
  "..ffff...",
  ".kffffk..",
  "..kffk...",
  "..u..u...",
  ".kk..kk..",
];

export const Worker: React.FC<{
  cap: string;
  shirt?: string;
  px?: number;
  /** 走路循环帧（传 f，每 6 帧换一次）；up 举手 */
  f?: number;
  walk?: boolean;
  up?: boolean;
  speed?: number;
  flip?: boolean;
  style?: React.CSSProperties;
}> = ({ cap, shirt = "#4A5160", px = 6, f = 0, walk, up, speed = 1, flip, style }) => {
  const step = Math.floor((f * speed) / 6) % 2;
  const map = up ? WORKER_UP : walk && step ? WORKER_B : WORKER_A;
  const bob = walk && step ? -px : 0;
  return (
    <div style={{ transform: `translateY(${bob}px)`, ...style }}>
      <Pix map={map} px={px} pal={{ c: cap, f: shirt }} flip={flip} />
    </div>
  );
};

/** 像素版 DeepSeek：蓝色长发、女仆头饰、深蓝裙白围裙、鲸鱼尾巴。16×18 */
export const DS_A = [
  "....kWWWWWWk......",
  "...knnnnnnnnk.....",
  "..knnNnnnnNnnk....",
  "..knnssssssnnk....",
  ".knnseessessnnk...",
  ".knnsWesseWsnnk...",
  ".knnsspssspsnnk...",
  ".knnnsssmssnnnk...",
  ".knNnnkssknnNnk...",
  ".knNnkBBBBknNnk...",
  ".knnksBWWBsknnk.kk",
  "..knkBWWWWBknk.kNk",
  "..kn.BWWWWB.nk.kNk",
  "...kBBWWWWBBk.kNNk",
  "...kBBBBBBBBkkNNk.",
  "...kBBBBBBBBkNNk..",
  "....kssk.kssk.kk..",
  "....kkk...kkk.....",
];
/** 敲键盘的第二帧：手抬起 */
export const DS_B = DS_A.map((row, i) => (i === 10 ? ".knnk.BWWB.knnk.kk" : i === 9 ? ".knNnsBBBBsnNnk..." : row));

/** 「你」：坐着的小人（灰卫衣），侧面朝右。12×12 */
export const YOU_SIT = [
  "...kkkk.....",
  "..kuuuuk....",
  ".kuuuuuuk...",
  ".kuusssk....",
  ".kussesk....",
  "..ksssk.....",
  "..kllllk....",
  ".kllllllsk..",
  ".kllllllk...",
  ".kllllk.....",
  ".kBBBBBBBk..",
  ".kBk...kBk..",
];
export const YOU_SLUMP = [
  "............",
  "............",
  "............",
  "...kkkk.....",
  "..kuuuukk...",
  ".kuuuuuuuk..",
  ".kllluuuuk..",
  ".kllllllsk..",
  ".kllllllk...",
  ".kllllk.....",
  ".kBBBBBBBk..",
  ".kBk...kBk..",
];

/* ---------------- 图标（多为 10×10） ---------------- */

export const ICON: Record<string, string[]> = {
  doc: [
    ".kkkkkk...",
    ".kWWWWkk..",
    ".kWWWWkWk.",
    ".kWkkkkkk.",
    ".kWWWWWWk.",
    ".kWkkkkWk.",
    ".kWWWWWWk.",
    ".kWkkkWWk.",
    ".kWWWWWWk.",
    ".kkkkkkkk.",
  ],
  mic: [
    "...kkkk...",
    "..klllMk..",
    "..klkkMk..",
    "..klllMk..",
    "..klkkMk..",
    ".k.kMMk.k.",
    ".kk.kk.kk.",
    "..kk..kk..",
    "....kk....",
    "..kkkkkk..",
  ],
  photo: [
    "kkkkkkkkkk",
    "kccccccyck",
    "kcccccyyyk",
    "kccccccyck",
    "kcccgcccck",
    "kccgggcgck",
    "kcgggggggk",
    "kgggggggGk",
    "kGGGGGGGGk",
    "kkkkkkkkkk",
  ],
  film: [
    "kkkkkkkkkk",
    "kWkWkWkWkk",
    "kkkkkkkkkk",
    "krrrkbbbbk",
    "krrrkbbbbk",
    "krrrkbbbbk",
    "kkkkkkkkkk",
    "kWkWkWkWkk",
    "kkkkkkkkkk",
    "..........",
  ],
  hand: [
    "...kk.....",
    "..kWWk....",
    "..kWWk....",
    "..kWWkkk..",
    "..kWWkWWkk",
    "kkkWWkWWkW",
    "kWkWWWWWWk",
    "kWWWWWWWWk",
    ".kWWWWWWk.",
    "..kkkkkk..",
  ],
  moon: [
    "...kkkk...",
    "..kyyyk...",
    ".kyyyk....",
    "kyyyk.....",
    "kyyyk.....",
    "kyyyk.....",
    "kyyyyk....",
    ".kyyyyk.kk",
    "..kyyyyyyk",
    "...kkkkkk.",
  ],
  star: [
    "....kk....",
    "....yk....",
    "...kyyk...",
    "kkkyyyykkk",
    "kyyyyyyyyk",
    ".kyyyyyyk.",
    "..kyyyyk..",
    ".kyyykyyk.",
    ".kyk..kyk.",
    ".kk....kk.",
  ],
  heart: [
    ".kkk..kkk.",
    "krrrkkrrrk",
    "krWrrrrrrk",
    "krrrrrrrrk",
    "krrrrrrrrk",
    ".krrrrrrk.",
    "..krrrrk..",
    "...krrk...",
    "....kk....",
    "..........",
  ],
  sweat: [
    "..k...",
    ".kck..",
    "kccck.",
    "kcWck.",
    "kccck.",
    ".kkk..",
  ],
  check: [
    "........kk",
    ".......kgk",
    "......kggk",
    "k....kggk.",
    "kgk.kggk..",
    "kggkggk...",
    ".kgggk....",
    "..kgk.....",
    "...k......",
    "..........",
  ],
  cross: [
    "kk......kk",
    "krk....krk",
    ".krk..krk.",
    "..krkkrk..",
    "...krrk...",
    "...krrk...",
    "..krkkrk..",
    ".krk..krk.",
    "krk....krk",
    "kk......kk",
  ],
  box: [
    "kkkkkkkkkk",
    "kuuuyyuuuk",
    "kuuuyyuuuk",
    "kkkkkkkkkk",
    "kUuuyyuuUk",
    "kUuuyyuuUk",
    "kUuuuuuuUk",
    "kUuuuuuuUk",
    "kUUUUUUUUk",
    "kkkkkkkkkk",
  ],
  reel: [
    "..kkkkkk..",
    ".kMMMMMMk.",
    "kMMkMMkMMk",
    "kMkkMMkkMk",
    "kMMMkkMMMk",
    "kMMMkkMMMk",
    "kMkkMMkkMk",
    "kMMkMMkMMk",
    ".kMMMMMMk.",
    "..kkkkkk..",
  ],
  clock: [
    "..kkkkkk..",
    ".kWWWWWWk.",
    "kWWWkWWWWk",
    "kWWWkWWWWk",
    "kWWWkWWWWk",
    "kWWWkkkWWk",
    "kWWWWWWWWk",
    "kWWWWWWWWk",
    ".kWWWWWWk.",
    "..kkkkkk..",
  ],
  q: [
    "..kkkkk...",
    ".kWWWWWk..",
    "kWWkkkWWk.",
    "kkk..kWWk.",
    "....kWWk..",
    "...kWWk...",
    "...kWWk...",
    "...kkkk...",
    "...kWWk...",
    "...kkkk...",
  ],
  bulb: [
    "...kkkk...",
    "..kyyyyk..",
    ".kyyWyyyk.",
    ".kyWyyyyk.",
    ".kyyyyyyk.",
    "..kyyyyk..",
    "...kmmk...",
    "...kMMk...",
    "...kmmk...",
    "....kk....",
  ],
};

/** 像素气泡：白底黑边，下方带尾巴；内容居中 */
export const Bubble: React.FC<{ w: number; h: number; px?: number; tail?: "left" | "right" | "center"; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  px = 6,
  tail = "center",
  children,
  style,
}) => {
  const tx = tail === "left" ? w * 0.22 : tail === "right" ? w * 0.72 : w / 2 - px * 1.5;
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#FFFFFF",
          boxShadow: `0 ${-px}px 0 0 ${PAL.k}, 0 ${px}px 0 0 ${PAL.k}, ${-px}px 0 0 0 ${PAL.k}, ${px}px 0 0 0 ${PAL.k}`,
        }}
      />
      <div style={{ position: "absolute", left: tx, top: h, width: px * 3, height: px, background: "#fff", boxShadow: `${-px}px 0 0 ${PAL.k}, ${px * 3}px 0 0 ${PAL.k}` }} />
      <div style={{ position: "absolute", left: tx + px, top: h + px, width: px, height: px, background: "#fff", boxShadow: `${-px}px 0 0 ${PAL.k}, ${px}px 0 0 ${PAL.k}, 0 ${px}px 0 ${PAL.k}` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};

/** 像素色块标签（像素字体）。size 只取 12 的倍数 */
export const PxLabel: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg = C.yellow,
  color = PAL.k,
  size = 36,
  style,
}) => {
  const u = size / 6;
  return (
    <div
      style={{
        display: "inline-block",
        background: bg,
        color,
        fontFamily: PX_FONT,
        fontSize: size,
        lineHeight: 1,
        padding: `${u * 1.5}px ${u * 2.5}px ${u * 1.3}px`,
        whiteSpace: "nowrap",
        boxShadow: `inset 0 ${-u}px 0 rgba(0,0,0,0.22), 0 0 0 ${u * 0.7}px ${PAL.k}, ${u * 1.4}px ${u * 1.4}px 0 ${u * 0.7}px rgba(0,0,0,0.45)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 像素屏：深底、亮色像素字（计数器、机器屏幕） */
export const PxScreen: React.FC<{
  w: number;
  h: number;
  children?: React.ReactNode;
  color?: string;
  frame?: string;
  style?: React.CSSProperties;
}> = ({ w, h, children, color = "#7CF0A0", frame = "#3A3F4A", style }) => (
  <div
    style={{
      position: "relative",
      width: w,
      height: h,
      background: frame,
      padding: 14,
      boxSizing: "border-box",
      boxShadow: `inset 0 -8px 0 rgba(0,0,0,0.3), inset 0 6px 0 rgba(255,255,255,0.12), 0 0 0 4px ${PAL.k}, 12px 14px 0 4px rgba(0,0,0,0.45)`,
      ...style,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0E1418",
        color,
        fontFamily: PX_MONO,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        textShadow: `0 0 14px ${color}88`,
      }}
    >
      {/* 扫描线 */}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 3px, transparent 3px 6px)" }} />
      {children}
    </div>
  </div>
);

/* ---------------- 场景件 ---------------- */

/** 传送带：上沿滚动条纹 + 一排滚轮；speed = 每帧像素 */
export const Conveyor: React.FC<{ x: number; y: number; w: number; f: number; speed?: number; h?: number }> = ({ x, y, w, f, speed = 3, h = 30 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h + 24 }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        background: `repeating-linear-gradient(90deg, #4A505C 0 36px, #3A3F49 36px 72px)`,
        backgroundPosition: `${(f * speed) % 72}px 0`,
        boxShadow: `inset 0 6px 0 rgba(255,255,255,0.14), inset 0 -6px 0 rgba(0,0,0,0.35), 0 0 0 4px ${PAL.k}`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 12,
        top: h + 4,
        width: w - 24,
        height: 18,
        background: `repeating-linear-gradient(90deg, ${C.steel} 0 18px, transparent 18px 60px)`,
        backgroundPosition: `${(f * speed * 0.5) % 60}px 0`,
      }}
    />
  </div>
);

/** 工位小房子：屋顶颜色 roof，窗户 lit（0–1）亮灯。宽 cols*px */
export const House: React.FC<{ roof: string; lit?: number; px?: number; sign?: string; signColor?: string; style?: React.CSSProperties }> = ({
  roof,
  lit = 0,
  px = 8,
  style,
}) => {
  const map = [
    ".......kkkkkk.......",
    ".....kkrrrrrrkk.....",
    "...kkrrrrrrrrrrkk...",
    ".kkrrrrrrrrrrrrrrkk.",
    "kRRRRRRRRRRRRRRRRRRk",
    ".kwwwwwwwwwwwwwwwwk.",
    ".kwkkkkkwwwwkkkkkwk.",
    ".kwkggkkwwwwkggkkwk.",
    ".kwkggkkwwwwkggkkwk.",
    ".kwkkkkkwwwwkkkkkwk.",
    ".kwwwwwwkkkkwwwwwwk.",
    ".kwwwwwwkuukwwwwwwk.",
    ".kwwwwwwkuukwwwwwwk.",
    ".kwwwwwwkuyuwwwwwwk.",
    ".kwwwwwwkuukwwwwwwk.",
    ".kkkkkkkkkkkkkkkkkk.",
  ];
  const glass = lit > 0.5 ? "#FFE58A" : "#3B4458";
  return (
    <div style={{ position: "relative", ...style }}>
      <Pix map={map} px={px} pal={{ r: roof, R: shade(roof), g: glass, w: "#E9E2D3" }} />
      {lit > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 6 * px,
            width: 20 * px,
            height: 4 * px,
            boxShadow: `0 0 ${40 * lit}px ${10 * lit}px rgba(255,229,138,${0.25 * lit})`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.68);
  const g = Math.round(((n >> 8) & 255) * 0.68);
  const b = Math.round((n & 255) * 0.68);
  return `rgb(${r},${g},${b})`;
};

/** 方块迸发：从 (x,y) 在第 at 帧炸开 n 个方块，带重力 */
export const Burst: React.FC<{
  x: number;
  y: number;
  f: number;
  at: number;
  n?: number;
  seed: string;
  size?: number;
  power?: number;
  colors?: string[];
  life?: number;
  stars?: boolean;
}> = ({ x, y, f, at, n = 14, seed, size = 16, power = 1, colors = [C.yellow, C.green, C.blue, C.red, "#fff"], life = 26, stars }) => {
  const t = f - at;
  if (t < 0 || t > life) return null;
  const r = seeded(seed);
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + r() * 0.6;
        const v = (260 + r() * 380) * power;
        const s = t / 30;
        const px = Math.cos(a) * v * s;
        const py = Math.sin(a) * v * s - 120 * power * s + 0.5 * 1400 * s * s;
        const k = 1 - t / life;
        const col = colors[i % colors.length];
        const sz = size * (0.6 + r() * 0.6);
        if (stars && i % 3 === 0)
          return (
            <div key={i} style={{ position: "absolute", left: x + px - 15, top: y + py - 15, opacity: k, transform: `scale(${0.6 + k * 0.6})` }}>
              <Pix map={ICON.star} px={3} />
            </div>
          );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + px - sz / 2,
              top: y + py - sz / 2,
              width: sz,
              height: sz,
              background: col,
              opacity: Math.min(1, k * 2),
              transform: `rotate(${t * 9 * (r() - 0.5)}deg)`,
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25)",
            }}
          />
        );
      })}
    </>
  );
};

/** 像素地面：一行行暗色砖，铺满宽度 */
export const Ground: React.FC<{ y: number; w?: number; h?: number }> = ({ y, w = 1920, h = 140 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: y,
      width: w,
      height: h,
      background: `linear-gradient(#2C2F38 0 10px, transparent 10px), repeating-linear-gradient(90deg, #22252D 0 46px, #1E2028 46px 48px)`,
      boxShadow: `0 -4px 0 ${PAL.k}`,
    }}
  />
);
