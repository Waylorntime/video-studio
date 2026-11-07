import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import mouths from "../../public/characters/mouths.json";
import { C, S, sp } from "../ref/kit";
import { seeded } from "../random";
import { CAT, PAL, PX_FONT, Pix } from "./pixel";
import type { Spot } from "./ctx";

export const BG = "#16171B";

/* ================= 背景：底色 + 噪点 + 只在焦点周围亮起的圆点网纹 ================= */

const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>',
)}")`;

export const Backdrop: React.FC<{ spots: Spot[]; drift?: number }> = ({ spots, drift = 0 }) => {
  const live = spots.filter((s) => (s.a ?? 1) > 0.01 && s.r > 1);
  const mask = live.length
    ? live
        .map((s) => {
          const a = s.a ?? 1;
          return `radial-gradient(circle ${Math.round(s.r)}px at ${Math.round(s.x)}px ${Math.round(s.y)}px, rgba(0,0,0,${a}) 0%, rgba(0,0,0,${a * 0.75}) 35%, rgba(0,0,0,${a * 0.25}) 70%, transparent 100%)`;
        })
        .join(", ")
    : "linear-gradient(transparent, transparent)";
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{ backgroundImage: NOISE, opacity: 0.05 }} />
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(circle at 5px 5px, rgba(255,255,255,0.26) 1.8px, transparent 2.3px), radial-gradient(circle at 15px 15px, rgba(255,255,255,0.26) 1.8px, transparent 2.3px)",
          backgroundSize: "20px 20px",
          backgroundPosition: `${-drift}px 0px`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      {/* 聚光中心一点微光 */}
      <AbsoluteFill
        style={{
          background: live
            .map((s) => `radial-gradient(circle ${Math.round(s.r * 0.8)}px at ${Math.round(s.x)}px ${Math.round(s.y)}px, rgba(255,255,255,${0.035 * (s.a ?? 1)}), transparent)`)
            .join(", ") || "none",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />
    </AbsoluteFill>
  );
};

/* ================= 人物 ================= */

type Rect = { x: number; y: number; w: number; h: number };
const MOUTHS = mouths as Record<string, Rect | null>;
/** 这些立绘手势朝画面左边，主讲在左侧时要镜像过来 */
const MIRROR = new Set(["host_present_palm", "host_point_down"]);

export type Cue = { start: number; frames: number; sprite: string; mouth: string };

/** 一张立绘：闭嘴图打底，张嘴时只把张嘴图的嘴部那一小块（羽化）叠上去 */
const Sprite: React.FC<{ name: string; open: boolean; W: number; mirror?: boolean }> = ({ name, open, W, mirror }) => {
  const H = W * 1.5;
  const r = MOUTHS[name];
  const mask = r
    ? `radial-gradient(ellipse ${r.w * W * 0.78}px ${r.h * H * 0.9}px at ${(r.x + r.w / 2) * W}px ${(r.y + r.h / 2) * H}px, black 62%, transparent 100%)`
    : undefined;
  return (
    <div style={{ position: "relative", width: W, height: H, transform: mirror ? "scaleX(-1)" : undefined }}>
      <Img src={staticFile(`characters/${name}_a.png`)} style={{ position: "absolute", inset: 0, width: W, height: H }} />
      {r && (
        <Img
          src={staticFile(`characters/${name}_b.png`)}
          style={{ position: "absolute", inset: 0, width: W, height: H, opacity: open ? 1 : 0, WebkitMaskImage: mask, maskImage: mask }}
        />
      )}
    </div>
  );
};

const find = (cues: Cue[], f: number) => {
  let i = -1;
  for (let k = 0; k < cues.length; k++) if (cues[k].start <= f) i = k;
  return i;
};

/** 换动作：旧的 3 帧缩小下沉淡出 → 空 4 帧 → 新的 6 帧弹到 1.06 再回 1 */
const switchAnim = (lf: number) => {
  if (lf < 3) return { phase: "old" as const, s: 1 - 0.4 * (lf / 3), dy: 40 * (lf / 3), o: 1 - lf / 3 };
  if (lf < 7) return { phase: "none" as const, s: 0, dy: 0, o: 0 };
  const t = lf - 7;
  const s = interpolate(t, [0, 4, 7], [0.55, 1.06, 1], { extrapolateRight: "clamp" });
  return { phase: "new" as const, s, dy: 0, o: Math.min(1, (t + 1) / 2) };
};

export const HostLayer: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const f = useCurrentFrame();
  const i = Math.max(0, find(cues, f));
  const cue = cues[i];
  const lf = f - cue.start;
  const speaking = lf >= 0 && lf < cue.frames;
  const open = speaking && cue.mouth[lf] === "1";
  const prev = i > 0 ? cues[i - 1].sprite : null;

  let name = cue.sprite;
  let s = 1;
  let dy = 0;
  let o = 1;
  let isOpen = open;
  if (prev !== cue.sprite || i === 0) {
    const a = switchAnim(i === 0 ? lf + 7 - 4 : lf);
    if (a.phase === "old" && prev) {
      name = prev;
      isOpen = false;
    }
    s = a.s;
    dy = a.dy;
    o = a.o;
  }
  const breathe = 1 + Math.sin(f / 20) * 0.006;
  const W = 640;
  return (
    <div
      style={{
        position: "absolute",
        left: -105,
        top: 120,
        width: W,
        height: W * 1.5,
        transformOrigin: "50% 100%",
        transform: `translateY(${dy}px) scale(${s}, ${s * breathe})`,
        opacity: o,
        filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55))",
      }}
    >
      {o > 0 && <Sprite name={name} open={isOpen} W={W} mirror={MIRROR.has(name)} />}
    </div>
  );
};

/** 配角：说话时从右下弹出，说完停 15 帧再收回 */
export const GuestLayer: React.FC<{ cues: Cue[]; hold?: number }> = ({ cues, hold = 15 }) => {
  const f = useCurrentFrame();
  const i = find(cues, f);
  if (i < 0) return null;
  const cue = cues[i];
  const lf = f - cue.start;
  const end = cue.frames - 6 + hold;
  if (lf > end + 8) return null;
  const pin = spring({ frame: lf, fps: 30, config: S.bouncy });
  let s = interpolate(pin, [0, 1], [0.55, 1]);
  let dy = interpolate(pin, [0, 1], [120, 0]);
  let o = Math.min(1, pin * 3);
  if (lf > end) {
    const t = (lf - end) / 8;
    s *= 1 - 0.4 * t;
    dy += 60 * t;
    o *= 1 - t;
  }
  const open = lf < cue.frames && cue.mouth[lf] === "1";
  const W = 560;
  return (
    <div
      style={{
        position: "absolute",
        left: 1421,
        top: 240,
        width: W,
        height: W * 1.5,
        transformOrigin: "50% 100%",
        transform: `translateY(${dy}px) scale(${s}, ${s * (1 + Math.sin(f / 18) * 0.006)})`,
        opacity: o,
        filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55))",
      }}
    >
      <Sprite name={cue.sprite} open={open} W={W} />
    </div>
  );
};

/** 配角当前可见程度（给聚光用） */
export const guestPresence = (cues: Cue[], f: number, hold = 15) => {
  const i = find(cues, f);
  if (i < 0) return 0;
  const lf = f - cues[i].start;
  const end = cues[i].frames - 6 + hold;
  if (lf > end + 8) return 0;
  return Math.min(1, lf / 6) * (lf > end ? 1 - (lf - end) / 8 : 1);
};

/* ================= 字幕：整幅居中 ================= */

const plainLen = (t: string) => Array.from(t.replace(/\*\*/g, "")).length;

export const Subtitle: React.FC<{ text: string; lf: number; speaker: "host" | "guest" }> = ({ text, lf, speaker }) => {
  const p = Math.min(1, lf / 3);
  const n = plainLen(text) + 1.5;
  const size = Math.max(34, Math.min(44, Math.floor(980 / n)));
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 38, display: "flex", justifyContent: "center", opacity: p }}>
      <div
        style={{
          maxWidth: 1000,
          background: "rgba(17,21,38,0.9)",
          border: "2px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          color: "#F4F4F2",
          fontFamily: '"NotoSans", sans-serif',
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.32,
          padding: "6px 24px 8px 20px",
          textAlign: "center",
          transform: `translateY(${(1 - p) * 8}px)`,
        }}
      >
        <span style={{ color: speaker === "host" ? C.orange : "#4D6BFE", marginRight: 12, fontWeight: 900 }}>›</span>
        {parts.map((part, k) =>
          part.startsWith("**") ? (
            <span key={k} style={{ color: C.yellow }}>
              {part.slice(2, -2)}
            </span>
          ) : (
            <span key={k}>{part}</span>
          ),
        )}
      </div>
    </div>
  );
};

/* ================= 顶部进度条 ================= */

export const ProgressBar: React.FC<{ chapters: string[]; ranges: [number, number][]; total: number }> = ({ chapters, ranges, total }) => {
  const f = useCurrentFrame();
  const X0 = 40;
  const W = 1840;
  const GAP = 8;
  const Y = 30;
  const H = 34;
  const act = ranges.map(([a, b], i) => {
    const on = a === 0 ? 1 : sp(f, S.card, a);
    const off = i === ranges.length - 1 ? 0 : sp(f, S.card, b);
    return Math.max(0, on - off);
  });
  const weights = act.map((a) => 1 + 1.6 * a);
  const sum = weights.reduce((x, y) => x + y, 0);
  const usable = W - GAP * (chapters.length - 1);
  let x = X0;
  const segs = weights.map((w) => {
    const seg = { x, w: (w / sum) * usable };
    x += seg.w + GAP;
    return seg;
  });
  const cur = Math.max(0, ranges.findIndex(([a, b]) => f >= a && f < b));
  const [ca, cb] = ranges[cur] ?? [0, total];
  const fill = Math.min(1, Math.max(0, (f - ca) / (cb - ca)));
  const enter = sp(f, S.card, 2);

  // 猫头：站在当前段的填充头上；换章时跳一下
  const seg = segs[cur];
  const catX = seg.x + 8 + Math.max(0, seg.w - 46) * fill;
  const sinceChange = f - ca;
  const hop = cur > 0 && sinceChange < 14 ? Math.sin((sinceChange / 14) * Math.PI) * 26 : 0;
  const atEnd = f >= total - 20 ? Math.sin(Math.min(1, (f - (total - 20)) / 12) * Math.PI) * 22 : 0;
  const step = Math.floor(f / 6) % 2;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 80, transform: `translateY(${(1 - enter) * -70}px)` }}>
      {chapters.map((name, i) => {
        const s = segs[i];
        const done = f >= ranges[i][1];
        const active = i === cur;
        const label = `${String(i + 1).padStart(2, "0")} ${name}`;
        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: s.x,
              top: Y,
              width: s.w,
              height: H,
              background: active ? "#3A3D45" : done ? "#2D5A27" : "#24262C",
              boxShadow: `inset 0 -4px 0 rgba(0,0,0,0.3), 0 0 0 3px ${PAL.k}`,
              overflow: "hidden",
            }}
          >
            {active && (
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: C.green, boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.25)" }} />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                paddingLeft: 14,
                fontFamily: PX_FONT,
                fontSize: 24,
                color: active ? "#FFFFFF" : done ? "#9CC594" : "#6A6D76",
                whiteSpace: "nowrap",
                textShadow: active ? `2px 2px 0 ${PAL.k}` : "none",
                opacity: active ? Math.min(1, act[i] * 1.5) : 1,
              }}
            >
              {active ? label : done ? `${String(i + 1).padStart(2, "0")} ✓` : String(i + 1).padStart(2, "0")}
            </div>
          </div>
        );
      })}
      {/* 换章时分界处迸出 6 个方块 */}
      {cur > 0 && sinceChange < 18 &&
        Array.from({ length: 6 }).map((_, k) => {
          const r = seeded(`pb-${cur}-${k}`);
          const t = sinceChange / 30;
          const vx = (r() - 0.5) * 300;
          const vy = 120 + r() * 200;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: segs[cur].x - 4 + vx * t,
                top: Y + H - 10 + vy * t - 200 * t + 900 * t * t * 0.5,
                width: 10,
                height: 10,
                background: [C.green, C.yellow, "#fff"][k % 3],
                opacity: 1 - sinceChange / 18,
              }}
            />
          );
        })}
      <div style={{ position: "absolute", left: catX, top: Y - 27 - hop - atEnd - (step ? 2 : 0) }}>
        <Pix map={CAT} px={3} />
      </div>
    </div>
  );
};
