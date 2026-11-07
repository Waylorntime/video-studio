import { interpolate, spring, type SpringConfig } from "remotion";
import { seeded } from "../random";
import { C, S, sp } from "../ref/kit";
import { HAND, INK, SketchRect } from "../flow/sketch";
import { Burst, Conveyor, Ground, House, ICON, PAL, PX_FONT, Pix, PxLabel, Worker } from "./pixel";

export const SANS = '"NotoSans", sans-serif';
export const CODE_FONT = '"Cascadia Mono", "Consolas", monospace';
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ramp = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
export const ease = (p: number) => p * p * (3 - 2 * p);

/** 弹入值：0→1 带过冲 */
export const pop = (f: number, at: number, cfg: Partial<SpringConfig> = S.bouncy) => (f < at ? 0 : spring({ frame: f - at, fps: 30, config: cfg }));

/* ---------------- 白纸卡（概念、结论、数字） ---------------- */
export const Paper: React.FC<{ w: number; h: number; children?: React.ReactNode; rotate?: number; style?: React.CSSProperties; color?: string }> = ({
  w,
  h,
  children,
  rotate = 0,
  style,
  color = "#F5F4F0",
}) => (
  <div
    style={{
      width: w,
      height: h,
      background: color,
      color: INK,
      transform: `rotate(${rotate}deg)`,
      boxShadow: "12px 14px 0 rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: SANS,
      fontWeight: 900,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ---------------- 深色代码窗 ---------------- */
export type Tok = [string, string?];
const TOK_COL: Record<string, string> = {
  k: "#FF7B9C", // 关键字
  f: "#7CC7FF", // 函数
  s: "#B8E986", // 字符串
  n: "#FFC66D", // 数字
  c: "#6C7686", // 注释
  p: "#E8E8E8",
  a: "#C792EA", // 属性
};
export const CodeWin: React.FC<{
  w: number;
  h: number;
  title: string;
  lines: Tok[][];
  /** 每行显示进度（0–1），按行逐字打出 */
  shown: number[];
  size?: number;
  hi?: number[];
  lineH?: number;
}> = ({ w, h, title, lines, shown, size = 36, hi = [], lineH = 1.7 }) => (
  <div style={{ position: "relative", width: w, height: h, background: "#1B1E25", boxShadow: `0 0 0 4px ${PAL.k}, 14px 16px 0 4px rgba(0,0,0,0.45)` }}>
    <div style={{ height: 56, background: "#2A2E37", display: "flex", alignItems: "center", gap: 12, paddingLeft: 20 }}>
      {["#FF6159", "#FFBD2E", "#28C941"].map((c) => (
        <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
      ))}
      <div style={{ marginLeft: 16, fontFamily: CODE_FONT, fontSize: 26, color: "#C9CED8" }}>{title}</div>
    </div>
    <div style={{ padding: "22px 30px", fontFamily: CODE_FONT, fontSize: size, lineHeight: lineH, whiteSpace: "pre" }}>
      {lines.map((toks, i) => {
        const total = toks.reduce((n, [t]) => n + t.length, 0);
        let left = Math.round(total * clamp01(shown[i] ?? 0));
        const hk = hi[i] ?? 0;
        return (
          <div key={i} style={{ position: "relative", display: "flex", height: size * lineH }}>
            {hk > 0 && <div style={{ position: "absolute", left: -30, right: -30, top: 0, bottom: 0, background: `rgba(255,214,90,${0.22 * hk})` }} />}
            <span style={{ color: "#4C5464", width: size * 1.4, flex: "none" }}>{i + 1}</span>
            <span style={{ position: "relative" }}>
              {toks.map(([t, k], j) => {
                const n = Math.max(0, Math.min(t.length, left));
                left -= n;
                return (
                  <span key={j} style={{ color: TOK_COL[k ?? "p"] }}>
                    {t.slice(0, n)}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

/* ---------------- 像素吊钩（联动 L7） ---------------- */
/** 绳子从画面顶部垂到 (x, y)；hookY 为钩子位置 */
export const Hook: React.FC<{ x: number; y: number; o?: number }> = ({ x, y, o = 1 }) => (
  <div style={{ position: "absolute", left: x - 6, top: -40, opacity: o }}>
    <div style={{ width: 12, height: y + 40, background: "#9AA0AA", boxShadow: `inset -4px 0 0 rgba(0,0,0,0.3)` }} />
    <div style={{ position: "absolute", left: -18, top: y + 30 }}>
      <Pix
        map={["..kkkk..", ".kmmmmk.", "kmk..kmk", "kmk....k", "kmk.....", ".kmk..k.", "..kmmk..", "...kk..."]}
        px={6}
      />
    </div>
  </div>
);

/**
 * 吊装：卡片挂在钩子上从顶部降到 (x, y)，落定弹一下；out 帧后再吊走。
 * 钩子挂在卡片顶边中点。
 */
export const Crane: React.FC<{
  f: number;
  at: number;
  out?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  children: React.ReactNode;
  release?: number;
}> = ({ f, at, out, x, y, w, h, children, release = 18 }) => {
  if (f < at) return null;
  const p = spring({ frame: f - at, fps: 30, config: { damping: 9, stiffness: 110, mass: 0.9 } });
  let cy = interpolate(p, [0, 1], [-h - 120, y]);
  let hookUp = 0;
  const lf = f - at;
  if (lf > release) hookUp = ease(ramp(lf, release, release + 14)); // 放下后钩子收回
  if (out !== undefined && f >= out) {
    const q = ease(ramp(f, out, out + 16));
    cy = y - q * (y + h + 160);
    hookUp = 1 - ramp(f, out, out + 4);
  }
  const sway = Math.sin(lf / 5) * 3 * Math.exp(-lf / 25);
  const hookY = cy - 30 - hookUp * (cy + 120);
  return (
    <>
      <Hook x={x + w / 2} y={hookY} />
      <div style={{ position: "absolute", left: x, top: cy, width: w, height: h, transform: `rotate(${sway}deg)`, transformOrigin: "50% 0%" }}>
        {children}
      </div>
    </>
  );
};

/* ---------------- 像素工厂（第 2 章全景，之后几幕复用） ---------------- */
export const STATIONS = ["写稿", "分镜", "素材", "渲染", "成片"];
export const CAPS = [C.blue, C.yellow, C.green, C.red, "#9B6BE0"];
export const HOUSE_X = [600, 1120, 1640, 2160, 2680];
export const BELT_Y = 800;
export const HOUSE_PX = 16;
export const HOUSE_W = 20 * HOUSE_PX;
export const HOUSE_H = 16 * HOUSE_PX;
export const HOUSE_TOP = BELT_Y - 12 - HOUSE_H;
export const FLAG_X = [950, 1990, 3030];
export const FLAG_NAMES = ["审稿", "审素材", "审片"];

const FLAG = [
  "kkkkkkkkk",
  "krrrrrrrk",
  "krrrrrrrk",
  "krrrrrrrk",
  "kkkkkkkkk",
  "km.......",
  "km.......",
  "km.......",
  "km.......",
  "km.......",
  "km.......",
  "km.......",
  "kkk......",
];

export const Flag: React.FC<{ label: string; p: number; lit?: number; px?: number }> = ({ label, p, lit = 0, px = 10 }) => (
  <div style={{ position: "relative", transform: `translateY(${(1 - p) * -300}px)`, opacity: Math.min(1, p * 3) }}>
    <div style={{ filter: lit > 0 ? `drop-shadow(0 0 ${20 * lit}px rgba(255,90,70,${0.9 * lit}))` : undefined }}>
      <Pix map={FLAG} px={px} pal={{ r: lit > 0.5 ? "#FF6A55" : C.red }} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 0, width: 9 * px, height: 5 * px, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: PX_FONT, fontSize: px * 3.6, color: "#fff", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  </div>
);

export type FactoryState = {
  /** 每座房子弹出的帧（-1 表示一开始就在） */
  houseAt?: number[];
  /** 每个招牌弹出的帧 */
  signAt?: number[];
  /** 工人干活（举手）的帧 */
  actAt?: number[];
  /** 包裹世界坐标 x；null 不显示 */
  pkgX?: number | null;
  /** 包裹形态 0 原始 … 5 胶片 */
  pkgForm?: number;
  flagAt?: number[];
  flagLit?: number[];
  speed?: number;
  flagPx?: number;
  lit?: number[];
  workers?: boolean;
};

const PKG_LABEL = ["选题", "稿", "分镜", "素材", "渲染", "MP4"];

export const Factory: React.FC<{ f: number; st: FactoryState }> = ({ f, st }) => {
  const speed = st.speed ?? 1;
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <FactoryBackdrop f={f} speed={speed} />
      {HOUSE_X.map((hx, i) => {
        const at = st.houseAt?.[i] ?? -1;
        const p = at < 0 ? 1 : pop(f, at, { damping: 10, stiffness: 160, mass: 0.7 });
        if (p <= 0) return null;
        const sAt = st.signAt?.[i];
        const sp2 = sAt === undefined ? 0 : sAt < 0 ? 1 : pop(f, sAt);
        const act = st.actAt?.[i];
        const acting = act !== undefined && f >= act && f < act + 14;
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: hx, top: HOUSE_TOP, transformOrigin: "50% 100%", transform: `scale(${0.6 + 0.4 * p}, ${p})` }}>
              <House roof={CAPS[i]} px={HOUSE_PX} lit={st.lit?.[i] ?? 0} />
            </div>
            {sp2 > 0 && (
              <div style={{ position: "absolute", left: hx + HOUSE_W / 2, top: HOUSE_TOP - 110, transform: `translateX(-50%) scale(${sp2})`, transformOrigin: "50% 100%" }}>
                <PxLabel bg={CAPS[i]} color={i === 1 ? PAL.k : "#fff"} size={60}>
                  {STATIONS[i]}
                </PxLabel>
              </div>
            )}
            {(st.workers ?? true) && p > 0.8 && (
              <div style={{ position: "absolute", left: hx + HOUSE_W + 14, top: BELT_Y - 13 * 9 - 4 + (acting ? -14 : 0) }}>
                <Worker cap={CAPS[i]} px={9} f={f + i * 3} walk={!acting} up={acting} speed={speed} />
              </div>
            )}
            {acting && <Burst x={hx + HOUSE_W + 30} y={BELT_Y - 40} f={f} at={act!} n={8} seed={`act${i}`} size={12} power={0.5} life={16} />}
          </div>
        );
      })}
      <Conveyor x={-600} y={BELT_Y} w={5000} f={f} speed={3 * speed} h={40} />
      {(st.flagAt ?? []).map((at, i) => {
        const p = at < 0 ? 1 : pop(f, at, { damping: 12, stiffness: 200, mass: 0.6 });
        if (p <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: FLAG_X[i], top: BELT_Y - 13 * (st.flagPx ?? 10) }}>
            <Flag label={FLAG_NAMES[i]} p={p} lit={st.flagLit?.[i] ?? 0} px={st.flagPx ?? 10} />
          </div>
        );
      })}
      {st.pkgX != null && <Package x={st.pkgX} form={st.pkgForm ?? 0} f={f} />}
    </div>
  );
};

export const Package: React.FC<{ x: number; form: number; f: number }> = ({ x, form, f }) => {
  const icon = form >= 5 ? ICON.reel : ICON.box;
  const tint = ["#C98A4B", "#C98A4B", C.yellow, C.green, C.red, "#9B6BE0"][Math.min(5, form)];
  const glow = form === 4 ? 0.5 + 0.5 * Math.sin(f / 3) : 0;
  return (
    <div style={{ position: "absolute", left: x - 63, top: BELT_Y - 128, filter: glow ? `drop-shadow(0 0 ${14 * glow}px #FF8A70)` : undefined }}>
      <Pix map={icon} px={13} pal={form >= 1 && form < 5 ? { u: tint, U: "#7A5A30" } : undefined} />
      {form >= 1 && form < 5 && (
        <div style={{ position: "absolute", left: 26, top: 62 }}>
          <Pix map={ICON.doc} px={4} />
        </div>
      )}
      <div style={{ position: "absolute", left: 65, top: -66, transform: "translateX(-50%)" }}>
        <PxLabel size={36} bg={form >= 5 ? "#9B6BE0" : "#F4EBDD"} color={form >= 5 ? "#fff" : PAL.k}>
          {PKG_LABEL[Math.min(5, form)]}
        </PxLabel>
      </div>
    </div>
  );
};

/* ---------------- 其他小件 ---------------- */

/** 盖章：从大到小砸下 */
export const Stamp: React.FC<{ f: number; at: number; children: React.ReactNode; rotate?: number }> = ({ f, at, children, rotate = -8 }) => {
  if (f < at) return null;
  const p = ramp(f, at, at + 5);
  const s = interpolate(p, [0, 1], [2.4, 1]);
  return <div style={{ transform: `scale(${s}) rotate(${rotate}deg)`, opacity: Math.min(1, p * 2) }}>{children}</div>;
};

/** 手绘箭头（按进度画出）：从 (x1,y1) 弯到 (x2,y2) */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; color?: string; bend?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  p,
  color = C.yellow,
  bend = 80,
}) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - bend;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const hx = (a: number) => x2 - Math.cos(ang + a) * 34;
  const hy = (a: number) => y2 - Math.sin(ang + a) * 34;
  const q = clamp01(p);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - q} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
      {q > 0.95 && (
        <path d={`M${hx(0.5)},${hy(0.5)} L${x2},${y2} L${hx(-0.5)},${hy(-0.5)}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

/** 手绘一行字 + 勾选框 */
export const CheckRow: React.FC<{ text: string; p: number; seed: string; size?: number; strike?: boolean }> = ({ text, p, seed, size = 42 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <SketchRect w={size} h={size} seed={seed} sw={3.5} jitter={1.4} />
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={`M ${size * 0.15} ${size * 0.5} L ${size * 0.42} ${size * 0.8} L ${size * 0.95} ${size * 0.05}`}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp01(p)}
          fill="none"
          stroke="#2FA84F"
          strokeWidth={size * 0.15}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: p > 0 ? 1 : 0 }}
        />
      </svg>
    </div>
    <span style={{ fontFamily: HAND, fontSize: size, color: INK, whiteSpace: "nowrap" }}>{text}</span>
  </div>
);

/** 像素胶片条：横贯全屏，格子里是彩色小缩略图，慢慢滚动 */
export const FilmStrip: React.FC<{ y: number; f: number; speed?: number; h?: number; o?: number }> = ({ y, f, speed = 1.2, h = 150, o = 1 }) => {
  const cellW = h * 1.45;
  const n = Math.ceil(2200 / cellW) + 2;
  const off = (f * speed) % cellW;
  const r = seeded("film");
  const thumbs = Array.from({ length: 12 }).map(() => ({ a: Math.floor(r() * 5), b: r(), c: r() }));
  const cols = [C.blue, C.yellow, C.green, C.red, "#9B6BE0"];
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: 1920, height: h + 44, background: "#0F1013", opacity: o, overflow: "hidden", boxShadow: `0 0 0 4px ${PAL.k}` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 14, backgroundImage: "repeating-linear-gradient(90deg, #3A3D45 0 18px, transparent 18px 36px)", backgroundPosition: `${-off}px 0` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 14, backgroundImage: "repeating-linear-gradient(90deg, #3A3D45 0 18px, transparent 18px 36px)", backgroundPosition: `${-off}px 0` }} />
      {Array.from({ length: n }).map((_, i) => {
        const k = (i + Math.floor((f * speed) / cellW)) % thumbs.length;
        const t = thumbs[k];
        return (
          <div key={i} style={{ position: "absolute", left: i * cellW - off, top: 22, width: cellW - 14, height: h, background: "#22252C", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: "12%", top: "18%", width: "42%", height: "52%", background: cols[t.a], opacity: 0.85 }} />
            <div style={{ position: "absolute", left: "60%", top: "26%", width: "28%", height: "10%", background: "#E9E6DE" }} />
            <div style={{ position: "absolute", left: "60%", top: "44%", width: `${18 + t.b * 10}%`, height: "10%", background: "#8A8F99" }} />
            <div style={{ position: "absolute", left: "8%", bottom: "8%", width: `${30 + t.c * 50}%`, height: 6, background: C.green }} />
          </div>
        );
      })}
    </div>
  );
};

/** 便捷：带 at 的像素图标弹入 */
export const PopIcon: React.FC<{ f: number; at: number; map: string[]; px?: number; x: number; y: number }> = ({ f, at, map, px = 8, x, y }) => {
  const p = pop(f, at);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${p})` }}>
      <Pix map={map} px={px} />
    </div>
  );
};

export { sp };

/* ---------------- 工厂背景：远处厂房剪影、烟囱冒烟、管道、招牌、地面货箱 ---------------- */
const SKY = (() => {
  const r = seeded("skyline");
  const out: { x: number; w: number; top: number; win: number[] }[] = [];
  let x = -700;
  while (x < 4500) {
    const w = 140 + Math.floor(r() * 5) * 40;
    const top = 120 + Math.floor(r() * 7) * 40;
    const win = Array.from({ length: 40 }).map(() => r());
    out.push({ x, w, top, win });
    x += w + 10 + Math.floor(r() * 3) * 20;
  }
  return out;
})();
const CHIMNEYS = [380, 1380, 2420, 3300];
const CRATES = [-200, 140, 980, 1500, 2020, 2560, 3150, 3600, 4000];

export const FactoryBackdrop: React.FC<{ f: number; speed?: number }> = ({ f, speed = 1 }) => (
  <>
    {/* 远处厂房 */}
    {SKY.map((b, i) => (
      <div key={i} style={{ position: "absolute", left: b.x, top: b.top, width: b.w, height: BELT_Y - b.top, background: i % 2 ? "#1E2129" : "#22262F", boxShadow: `inset 0 8px 0 rgba(255,255,255,0.04)` }}>
        {Array.from({ length: Math.floor((BELT_Y - b.top - 60) / 70) }).map((_, row) =>
          Array.from({ length: Math.floor((b.w - 20) / 50) }).map((__, col) => {
            const k = b.win[(row * 7 + col) % 40];
            const on = k > 0.62 && (k < 0.9 || Math.floor(f / 40 + k * 10) % 3 !== 0);
            return (
              <div
                key={`${row}-${col}`}
                style={{ position: "absolute", left: 20 + col * 50, top: 30 + row * 70, width: 24, height: 30, background: on ? "#5A4E2A" : "#272B35" }}
              />
            );
          }),
        )}
      </div>
    ))}
    {/* 烟囱和烟 */}
    {CHIMNEYS.map((cx, i) => (
      <div key={`ch${i}`}>
        <div style={{ position: "absolute", left: cx, top: -40, width: 70, height: BELT_Y + 40, background: "#2B2F39", boxShadow: `inset -14px 0 0 rgba(0,0,0,0.25), 0 0 0 4px ${PAL.k}` }} />
        <div style={{ position: "absolute", left: cx - 10, top: -60, width: 90, height: 30, background: "#353A46", boxShadow: `0 0 0 4px ${PAL.k}` }} />
        {[0, 1].map((k) => (
          <div key={k} style={{ position: "absolute", left: cx, top: 60 + k * 120, width: 70, height: 26, background: C.red, opacity: 0.8 }} />
        ))}
        {Array.from({ length: 6 }).map((_, k) => {
          const t = ((f * speed + k * 22 + i * 13) % 132) / 132;
          const sz = 34 + t * 60;
          return (
            <div
              key={`s${k}`}
              style={{ position: "absolute", left: cx + 35 - sz / 2 + Math.sin(t * 5 + i) * 30 + t * 60, top: -80 - t * 420, width: sz, height: sz, background: "#5A5F6B", opacity: 0.5 * (1 - t) }}
            />
          );
        })}
      </div>
    ))}
    {/* 招牌 */}
    <div style={{ position: "absolute", left: 1500, top: 170, width: 20, height: 330, background: "#4A505C" }} />
    <div style={{ position: "absolute", left: 2080, top: 170, width: 20, height: 330, background: "#4A505C" }} />
    <div style={{ position: "absolute", left: 1800, top: 60, transform: "translateX(-50%)" }}>
      <PxLabel size={120} bg="#F4EBDD">
        视频工厂
      </PxLabel>
    </div>
    {/* 管道：从工位屋顶上方穿过 */}
    <div style={{ position: "absolute", left: 300, top: 455, width: 3000, height: 30, background: "#6E7480", boxShadow: `inset 0 8px 0 rgba(255,255,255,0.18), inset 0 -8px 0 rgba(0,0,0,0.3), 0 0 0 4px ${PAL.k}` }} />
    {HOUSE_X.map((hx, i) => (
      <div key={`pj${i}`} style={{ position: "absolute", left: hx + 140, top: 445, width: 40, height: 50, background: CAPS[i], boxShadow: `0 0 0 4px ${PAL.k}` }} />
    ))}
    {/* 地面、货箱、路灯 */}
    <Ground y={BELT_Y + 60} w={5400} h={700} />
    <div style={{ position: "absolute", left: -600, top: BELT_Y + 60, width: 5400, height: 700, background: "repeating-linear-gradient(0deg, transparent 0 66px, rgba(0,0,0,0.25) 66px 70px)" }} />
    {CRATES.map((x, i) => (
      <div key={`cr${i}`} style={{ position: "absolute", left: x, top: BELT_Y + 110 - (i % 2) * 10 }}>
        <Pix map={ICON.box} px={10 + (i % 3) * 2} />
        {i % 3 === 0 && (
          <div style={{ position: "absolute", left: 30, top: -110 }}>
            <Pix map={ICON.box} px={10} />
          </div>
        )}
      </div>
    ))}
    {[260, 1900, 3480].map((x, i) => (
      <div key={`lp${i}`} style={{ position: "absolute", left: x, top: BELT_Y - 320 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 60, height: 24, background: C.yellow, boxShadow: `0 0 40px 14px rgba(246,196,69,0.25), 0 0 0 4px ${PAL.k}` }} />
        <div style={{ position: "absolute", left: 22, top: 24, width: 16, height: 300, background: "#4A505C" }} />
      </div>
    ))}
  </>
);
