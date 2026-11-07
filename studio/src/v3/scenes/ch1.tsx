import { interpolate } from "remotion";
import { Card } from "../../flow/card";
import { DrawPath, HAND, INK, SketchRect, SketchWindow } from "../../flow/sketch";
import { C } from "../../ref/kit";
import { Sfx, useScene, type SceneDef } from "../ctx";
import { Bubble, Burst, Conveyor, ICON, PAL, PX_FONT, PX_MONO, Pix, PxLabel, PxScreen, YOU_SIT, YOU_SLUMP } from "../pixel";
import { CodeWin, FilmStrip, Paper, clamp01, ease, pop, ramp, type Tok } from "../common";

/* =============== 幕 1　钩子：三次动手 =============== */

const CODE: Tok[][] = [
  [["// 每一帧，都由时间算出来", "c"]],
  [["export const ", "k"], ["Video", "f"], [" = () => {"]],
  [["  const ", "k"], ["f"], [" = "], ["useCurrentFrame", "f"], ["();"]],
  [["  return ", "k"], ["<画面 ", "f"], ["时间", "a"], ["={f} />;"]],
  [["};"]],
];

const Timeline: React.FC = () => {
  const tracks = [
    { label: "V1", clips: [[20, 180, C.blue], [210, 120, C.blue], [340, 220, C.blue]] },
    { label: "A1", clips: [[20, 260, C.green], [290, 170, C.green], [470, 110, C.green]] },
    { label: "A2", clips: [[60, 140, C.yellow], [230, 300, C.yellow]] },
  ] as const;
  return (
    <div style={{ position: "absolute", left: 30, top: 40, width: 820 }}>
      {tracks.map((t, i) => (
        <div key={t.label} style={{ position: "relative", height: 96, marginBottom: 18 }}>
          <div style={{ position: "absolute", left: 0, top: 26, fontFamily: HAND, fontSize: 34, color: INK }}>{t.label}</div>
          {t.clips.map(([x, w, col], j) => (
            <div key={j} style={{ position: "absolute", left: 80 + x, top: 14, width: w, height: 66, background: col, opacity: 0.85 }}>
              <SketchRect w={w} h={66} seed={`tl${i}${j}`} sw={3} />
            </div>
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", left: 420, top: -10, width: 4, height: 350, background: C.red }} />
    </div>
  );
};

const S01View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const clicks = [c.at(0, 0.62), c.at(0, 0.74), c.at(0, 0.86)];
  const count = clicks.filter((k) => f >= k).length;
  // 光标：飞进来，在三个点击帧按下
  const cin = ease(ramp(f, 30, clicks[0] - 4));
  const cx = interpolate(cin, [0, 1], [1900, 1480]);
  const cy = interpolate(cin, [0, 1], [900, 500]);
  const press = clicks.some((k) => f >= k && f < k + 4) ? 0.82 : 1;
  const crossA = ramp(f, c.at(1, 0.42), c.at(1, 0.42) + 7);
  const crossB = ramp(f, c.at(1, 0.56), c.at(1, 0.56) + 7);
  const code0 = c.at(2, 16);
  const shown = CODE.map((_, i) => ramp(f, code0 + i * 9, code0 + i * 9 + 12));
  const counterOn = f >= c.at(2, 0.5);
  const frameNo = Math.max(1, Math.floor((f - c.at(2, 0.5)) * 7) + 1);
  return (
    <>
      <FilmStrip y={700} f={f} o={1 - ramp(f, c.at(2, 0.4), c.at(2, 0.55)) * 0.6} />

      {/* 句 1：像素屏计数器 */}
      <Card x={760} y={130} w={860} h={500} at={6} out={c.at(1, 0)} enter="pop" exit="pop">
        <PxScreen w={860} h={500} color="#FF9A4D">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: PX_MONO, fontSize: 48, color: "#9AA3B2" }}>动手次数</div>
            <div style={{ fontFamily: PX_MONO, fontSize: 288, lineHeight: 1, transform: `scale(${1 + 0.25 * (clicks.some((k) => f >= k && f < k + 5) ? 1 : 0)})` }}>
              {count}
            </div>
          </div>
        </PxScreen>
      </Card>
      {f < c.at(1, 0) &&
        clicks.map((k, i) => {
          const p = pop(f, k);
          return p > 0 ? (
            <div key={i} style={{ position: "absolute", left: 1660, top: 170 + i * 140 - p * 10, transform: `scale(${p})` }}>
              <Pix map={ICON.check} px={8} />
            </div>
          ) : null;
        })}
      {f < c.at(1, 0) && clicks.map((k, i) => <Burst key={i} x={1490} y={510} f={f} at={k} n={10} seed={`c${i}`} colors={[C.green, "#fff", C.yellow]} size={14} power={0.7} />)}
      {f > 30 && f < c.at(1, 0) && (
        <div style={{ position: "absolute", left: cx, top: cy, transform: `scale(${press})`, transformOrigin: "30% 10%" }}>
          <Pix map={ICON.hand} px={8} />
        </div>
      )}

      {/* 句 2：剪辑软件窗口 + 红叉 */}
      <Card x={520} y={150} w={900} h={480} at={c.at(1, 2)} out={c.at(2, 0)} enter="open" exit="pixel" cell={40} seed="edit">
        <SketchWindow w={900} h={480} title="剪辑软件.exe" seed="editwin">
          <Timeline />
        </SketchWindow>
        <DrawPath d="M 90 110 L 820 420" p={crossA} stroke={C.red} sw={22} />
        <DrawPath d="M 820 110 L 90 420" p={crossB} stroke={C.red} sw={22} />
      </Card>

      {/* 句 3：方块重排成代码窗 */}
      <Card x={460} y={150} w={1100} h={500} at={c.at(2, 6)} enter="pixel" exit="none" cell={40} seed="code" colors={["#2A2E37", "#1B1E25", C.blue, "#7CC7FF", "#FF7B9C"]}>
        <CodeWin w={1100} h={500} title="Episode.tsx" lines={CODE} shown={shown} size={38} hi={[0, 0, 0, ramp(f, c.at(2, 0.55), c.at(2, 0.62)), 0]} />
      </Card>
      {counterOn && (
        <div style={{ position: "absolute", left: 1180, top: 500, transform: `scale(${pop(f, c.at(2, 0.5))})` }}>
          <PxScreen w={250} h={110} color="#7CF0A0">
            <span style={{ fontFamily: PX_MONO, fontSize: 48 }}>{String(frameNo).padStart(4, "0")}</span>
          </PxScreen>
          <div style={{ position: "absolute", left: 0, top: -44 }}>
            <PxLabel size={24} bg={C.green}>第几帧</PxLabel>
          </div>
        </div>
      )}

      {clicks.map((k, i) => (
        <Sfx key={i} at={k} name="click" volume={0.6} />
      ))}
      <Sfx at={clicks[2] + 3} name="success" volume={0.45} />
      <Sfx at={c.at(1, 2)} name="pop" />
      <Sfx at={c.at(1, 0.42)} name="error" volume={0.4} />
      <Sfx at={c.at(2, 0)} name="shatter" volume={0.45} />
      {shown.map((_, i) => (
        <Sfx key={`t${i}`} at={code0 + i * 9} name="type" volume={0.35} />
      ))}
      <Sfx at={c.at(2, 0.53)} name="whoosh" volume={0.3} />
    </>
  );
};

export const S01: SceneDef = {
  View: S01View,
  cam: (c) => [
    { at: 0, x: 960, y: 540, s: 1 },
    { at: c.at(2, 0.53), x: 880, y: 460, s: 1.5 },
  ],
  spots: (c) => [
    { at: 0, x: 1190, y: 380, r: 600 },
    { at: c.at(1, 0), x: 970, y: 390, r: 580 },
    { at: c.at(2, 6), x: 1010, y: 400, r: 600 },
    { at: c.at(2, 0.53), x: 1000, y: 470, r: 600 },
  ],
};

/* =============== 像素小屋（幕 2、3 共用） =============== */

const BUBBLES = [
  { icon: "doc", x: 800, y: 360, at: 0.18 },
  { icon: "mic", x: 540, y: 160, at: 0.42 },
  { icon: "photo", x: 1150, y: 230, at: 0.6 },
  { icon: "film", x: 860, y: 96, at: 0.78 },
];
const BW = 240;
const BH = 200;

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

const Room: React.FC<{ f: number; night: number; day: string; flip: number; slump?: boolean; clockSpin: number; sweat?: number; dim?: number }> = ({
  f,
  night,
  day,
  flip,
  slump,
  clockSpin,
  sweat = 0,
  dim = 0,
}) => {
  const sky = night < 0.5 ? mix("#8FD3FF", "#F59E6B", night * 2) : mix("#F59E6B", "#1A2350", night * 2 - 1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
      {/* 墙和地板 */}
      <div style={{ position: "absolute", left: 440, top: 96, width: 1460, height: 670, background: "#272B36", boxShadow: `0 0 0 5px ${PAL.k}`, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 4px, transparent 4px 48px), repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 4px, transparent 4px 96px)" }} />
      <div style={{ position: "absolute", left: 440, top: 766, width: 1460, height: 140, background: "#3B2F2A", boxShadow: `0 0 0 5px ${PAL.k}`, backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 6px, transparent 6px 120px)" }} />
      {/* 窗户 */}
      <div style={{ position: "absolute", left: 1560, top: 150, width: 280, height: 240, background: sky, boxShadow: `0 0 0 10px #4A4F5C, 0 0 0 15px ${PAL.k}` }}>
        <div style={{ position: "absolute", left: 136, top: 0, width: 8, height: 240, background: "#4A4F5C" }} />
        <div style={{ position: "absolute", left: 0, top: 116, width: 280, height: 8, background: "#4A4F5C" }} />
        {night < 0.4 && <div style={{ position: "absolute", left: 30, top: 40, width: 48, height: 48, background: C.yellow, opacity: 1 - night * 2.5 }} />}
        {night > 0.7 && (
          <div style={{ position: "absolute", left: 170, top: 20, opacity: (night - 0.7) / 0.3 }}>
            <Pix map={ICON.moon} px={7} />
          </div>
        )}
      </div>
      {/* 日历 */}
      <div style={{ position: "absolute", left: 520, top: 470, width: 200, height: 230, background: "#F4EBDD", boxShadow: `0 0 0 5px ${PAL.k}, 10px 10px 0 5px rgba(0,0,0,0.35)` }}>
        <div style={{ height: 60, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PX_FONT, fontSize: 36, color: "#fff" }}>周末</div>
        <div style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PX_FONT, fontSize: 108, color: PAL.k, transform: `scaleY(${Math.abs(Math.cos(flip * Math.PI))})` }}>{day}</div>
      </div>
      {/* 时钟 */}
      <div style={{ position: "absolute", left: 1600, top: 470 }}>
        <Pix map={ICON.clock} px={12} />
        <div style={{ position: "absolute", left: 57, top: 30, width: 6, height: 32, background: PAL.k, transformOrigin: "50% 100%", transform: `rotate(${clockSpin}deg)` }} />
        <div style={{ position: "absolute", left: 57, top: 42, width: 6, height: 20, background: C.red, transformOrigin: "50% 100%", transform: `rotate(${clockSpin / 12}deg)` }} />
      </div>
      {/* 桌子、显示器、人 */}
      <div style={{ position: "absolute", left: 1150, top: 640, width: 330, height: 20, background: "#8A5A3A", boxShadow: `0 0 0 5px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 1180, top: 660, width: 18, height: 106, background: "#5E3C26" }} />
      <div style={{ position: "absolute", left: 1430, top: 660, width: 18, height: 106, background: "#5E3C26" }} />
      <div style={{ position: "absolute", left: 1280, top: 470, width: 180, height: 130, background: "#3A3F4A", boxShadow: `0 0 0 5px ${PAL.k}` }}>
        <div style={{ position: "absolute", inset: 12, background: "#9FE8FF", opacity: 0.6 + 0.2 * Math.sin(f / 4), boxShadow: "0 0 30px rgba(159,232,255,0.6)" }} />
      </div>
      <div style={{ position: "absolute", left: 1350, top: 600, width: 40, height: 40, background: "#3A3F4A" }} />
      <div style={{ position: "absolute", left: 1000, top: 700, width: 150, height: 20, background: "#555A64", boxShadow: `0 0 0 4px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 1060, top: 720, width: 16, height: 46, background: "#555A64" }} />
      <div style={{ position: "absolute", left: 1010, top: 556 }}>
        <Pix map={slump ? YOU_SLUMP : YOU_SIT} px={13} flip={false} />
        {sweat > 0 && (
          <div style={{ position: "absolute", left: -20, top: -20 + (1 - sweat) * 20, opacity: sweat }}>
            <Pix map={ICON.sweat} px={7} />
          </div>
        )}
      </div>
    </div>
  );
};

const BubbleIcon: React.FC<{ icon: string; broken?: number; wobble?: number }> = ({ icon, broken = 0, wobble = 0 }) => (
  <div style={{ transform: `rotate(${wobble}deg)` }}>
    <Bubble w={BW} h={BH} px={6} tail="center">
      {broken > 0 ? (
        <div style={{ position: "relative", width: 130, height: 130 }}>
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                clipPath: `inset(0 ${(2 - k) * 33.3}% 0 ${k * 33.3}%)`,
                transform: `translate(${(k - 1) * 22 * broken}px, ${broken * (k === 1 ? 14 : -8)}px) rotate(${(k - 1) * 14 * broken}deg)`,
              }}
            >
              <Pix map={ICON[icon]} px={13} />
            </div>
          ))}
        </div>
      ) : (
        <Pix map={ICON[icon]} px={13} />
      )}
    </Bubble>
  </div>
);

/* =============== 幕 2　以前的周末 =============== */

const S02View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const sat = c.at(1, 0.06);
  const sun = c.at(1, 0.3);
  const day = f < sun ? (f < sat ? "五" : "六") : "日";
  const flip = f >= sun ? ramp(f, sun, sun + 8) : f >= sat ? ramp(f, sat, sat + 8) : 0;
  const night = ease(ramp(f, c.at(1, 0), c.at(2, 0.3)));
  const clockSpin = f < c.at(1, 0) ? f * 2 : f * 2 + (f - c.at(1, 0)) ** 1.4 * 4;
  const hit = c.at(2, 10);
  const head = { x: 1060, y: 600 };
  return (
    <>
      <Room f={f} night={night} day={day} flip={flip} clockSpin={clockSpin} sweat={ramp(f, hit + 4, hit + 12)} />
      {BUBBLES.map((b, i) => {
        const at = c.at(1, b.at);
        const p = pop(f, at, { damping: 11, stiffness: 150, mass: 0.7 });
        if (p <= 0) return null;
        const x = interpolate(p, [0, 1], [head.x - BW / 2, b.x], { extrapolateRight: "extend" });
        const y = interpolate(p, [0, 1], [head.y - BH / 2, b.y], { extrapolateRight: "extend" });
        const lt = f - hit;
        const wob = lt > 0 && b.icon !== "film" ? Math.sin(lt * 1.3 + i) * 7 * Math.exp(-lt / 12) : 0;
        return (
          <div key={b.icon} style={{ position: "absolute", left: x, top: y, transform: `scale(${Math.max(0.2, p)})` }}>
            <BubbleIcon icon={b.icon} broken={b.icon === "film" ? ease(ramp(f, hit, hit + 8)) : 0} wobble={wob} />
          </div>
        );
      })}
      {/* 「改一句」砸下来 */}
      {f >= c.at(2, 0) && (
        <div
          style={{
            position: "absolute",
            left: 900,
            top: interpolate(f, [c.at(2, 0), hit], [-140, 90], { extrapolateRight: "clamp", easing: (t) => t * t }),
            transform: `rotate(-6deg) scale(${f >= hit ? 1 + 0.15 * Math.exp(-(f - hit) / 3) : 1})`,
          }}
        >
          <PxLabel bg={C.red} color="#fff" size={48}>
            改一句
          </PxLabel>
        </div>
      )}
      <Burst x={980} y={190} f={f} at={hit} n={14} seed="hit" colors={[C.red, C.blue, "#fff"]} size={18} />

      <Sfx at={0} name="whoosh" volume={0.3} />
      <Sfx at={sat} name="slide" volume={0.5} />
      <Sfx at={sun} name="slide" volume={0.5} />
      {BUBBLES.map((b, i) => (
        <Sfx key={i} at={c.at(1, b.at)} name="pop" volume={0.5} />
      ))}
      <Sfx at={hit} name="impact" volume={0.6} />
      <Sfx at={hit + 2} name="shatter" volume={0.35} />
    </>
  );
};

export const S02: SceneDef = {
  View: S02View,
  cam: () => [
    { at: 0, x: 1180, y: 600, s: 1.9 },
    { at: 4, x: 960, y: 520, s: 1 },
  ],
  spots: (c) => [
    { at: 0, x: 1180, y: 560, r: 580 },
    { at: c.at(1, 0.15), x: 1000, y: 330, r: 620 },
    { at: c.at(2, 0), x: 960, y: 260, r: 540 },
  ],
  shake: (c) => [c.at(2, 10)],
};

/* =============== 幕 3　吐槽与承诺 =============== */

const S03View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const tags = ["改稿 v7", "v8", "v9……"];
  const go = c.at(1, 0.08);
  const beltIn = ease(ramp(f, c.at(1, 0.22), c.at(1, 0.48)));
  const dim = ramp(f, c.at(1, 0.15), c.at(1, 0.5)) * 0.7;
  const entry = { x: 1880, y: 800 };
  return (
    <>
      <Room f={f} night={1} day="日" flip={0} slump={f >= 10} clockSpin={f * 6 + 600} dim={dim} />
      {BUBBLES.map((b, i) => (
        <Card
          key={b.icon}
          x={b.x}
          y={b.y}
          w={BW}
          h={BH}
          at={0}
          out={go + i * 4}
          enter="none"
          exit="pixel"
          cell={24}
          seed={`bub${i}`}
          toPt={[entry.x - b.x, entry.y - b.y]}
          colors={["#FFFFFF", "#FFFFFF", PAL.k, C.blue, C.yellow]}
        >
          <BubbleIcon icon={b.icon} broken={b.icon === "film" ? 1 : 0} />
        </Card>
      ))}
      {tags.map((t, i) => {
        const at = c.at(0, 0.15 + i * 0.2);
        const p = pop(f, at);
        const out = ramp(f, go, go + 8);
        if (p <= 0 || out >= 1) return null;
        return (
          <div key={t} style={{ position: "absolute", left: 1290 + i * 18, top: 470 - i * 86, transform: `scale(${p * (1 - out)}) rotate(${(i - 1) * 4}deg)` }}>
            <PxLabel bg={i === 2 ? C.red : "#F4EBDD"} color={i === 2 ? "#fff" : PAL.k} size={36}>
              {t}
            </PxLabel>
          </div>
        );
      })}
      {/* 传送带入口从右边伸进来 */}
      <div style={{ position: "absolute", left: 1920 - 1500 * beltIn, top: 0 }}>
        <Conveyor x={0} y={800} w={1600} f={f} speed={-5} />
        <div style={{ position: "absolute", left: -40, top: 740, width: 60, height: 120, background: "#3A3F4A", boxShadow: `0 0 0 5px ${PAL.k}` }} />
      </div>
      <Card x={700} y={460} w={600} h={140} at={c.at(1, 0.55)} enter="wipe" exit="none" rotate={-2}>
        <Paper w={600} h={140} style={{ fontSize: 72 }}>
          交给流水线
        </Paper>
      </Card>

      {tags.map((_, i) => (
        <Sfx key={i} at={c.at(0, 0.15 + i * 0.2)} name="tick" volume={0.6} />
      ))}
      <Sfx at={go} name="whoosh" volume={0.45} />
      <Sfx at={c.at(1, 0.24)} name="slide" volume={0.6} />
      <Sfx at={c.at(1, 0.55)} name="stamp" volume={0.4} />
    </>
  );
};

export const S03: SceneDef = {
  View: S03View,
  cam: (c) => [
    { at: 0, x: 960, y: 520, s: 1 },
    { at: c.at(1, 0.15), x: 1020, y: 560, s: 0.9 },
  ],
  spots: (c) => [
    { at: 0, x: 1380, y: 360, r: 480 },
    { at: c.at(1, 0.1), x: 1500, y: 760, r: 560 },
    { at: c.at(1, 0.55), x: 1000, y: 530, r: 560 },
  ],
};

export { clamp01 };
