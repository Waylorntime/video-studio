import { Img, interpolate, staticFile } from "remotion";
import { Card } from "../../flow/card";
import { HAND, INK, SketchRect, SketchWindow } from "../../flow/sketch";
import { C } from "../../ref/kit";
import { Sfx, useScene, type SceneClock, type SceneDef } from "../ctx";
import { Burst, Conveyor, ICON, PAL, PX_FONT, PX_MONO, Pix, PxLabel, PxScreen, Worker } from "../pixel";
import { Paper, SANS, clamp01, ease, pop, ramp } from "../common";

/* =============== 本片某一帧的缩略画面：所有元素只由 t（0–1）决定 =============== */
export const MiniFrame: React.FC<{ w: number; h: number; t: number }> = ({ w, h, t }) => {
  const k = w / 640;
  const cardX = 230 + Math.sin(t * Math.PI * 2) * 120;
  const cardR = Math.sin(t * Math.PI * 4) * 6;
  const fr = Math.round(t * 4266);
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#16171B", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.18) 1.4px, transparent 1.8px)", backgroundSize: `${14 * k}px ${14 * k}px` }} />
      <div style={{ position: "absolute", left: 10 * k, top: 8 * k, width: 620 * k, height: 12 * k, background: "#24262C" }}>
        <div style={{ width: `${t * 100}%`, height: "100%", background: C.green }} />
      </div>
      <Img src={staticFile("characters/host_point_right_a.png")} style={{ position: "absolute", left: -40 * k, top: 40 * k, width: 230 * k }} />
      <div style={{ position: "absolute", left: cardX * k, top: (90 + Math.cos(t * Math.PI * 2) * 30) * k, width: 280 * k, height: 170 * k, background: "#F5F4F0", transform: `rotate(${cardR}deg)`, boxShadow: `${6 * k}px ${7 * k}px 0 rgba(0,0,0,0.45)` }}>
        <div style={{ position: "absolute", left: 20 * k, top: 22 * k, width: 120 * k, height: 18 * k, background: C.red }} />
        <div style={{ position: "absolute", left: 20 * k, top: 60 * k, width: 220 * k * (0.4 + 0.6 * ((t * 7) % 1)), height: 12 * k, background: "#B9B6AC" }} />
        <div style={{ position: "absolute", left: 20 * k, top: 90 * k, width: 180 * k, height: 12 * k, background: "#B9B6AC" }} />
      </div>
      <div style={{ position: "absolute", right: 14 * k, bottom: 12 * k, fontFamily: PX_MONO, fontSize: 36 * k, color: "#7CF0A0" }}>{String(fr).padStart(4, "0")}</div>
      <div style={{ position: "absolute", left: 220 * k, bottom: 14 * k, width: 200 * k, height: 24 * k, background: "rgba(17,21,38,0.9)" }} />
    </div>
  );
};

/* =============== 渲染机器（幕 13、14 共用） =============== */
const Machine: React.FC<{ f: number; screen?: React.ReactNode; on?: boolean }> = ({ f, screen, on = true }) => (
  <div style={{ position: "absolute", left: 600, top: 250 }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 920, height: 560, background: "#4A505C", boxShadow: `inset 0 -20px 0 rgba(0,0,0,0.3), inset 0 12px 0 rgba(255,255,255,0.12), 0 0 0 6px ${PAL.k}` }} />
    <div style={{ position: "absolute", left: 0, top: 0, width: 920, height: 40, background: C.red, boxShadow: `0 0 0 6px ${PAL.k}` }} />
    {[0, 1, 2, 3, 4, 5].map((j) => (
      <div key={j} style={{ position: "absolute", left: 790, top: 90 + j * 64, width: 80, height: 40, background: on && Math.floor(f / 4 + j) % 3 === 0 ? C.yellow : "#2A2E37", boxShadow: `0 0 0 4px ${PAL.k}` }} />
    ))}
    <div style={{ position: "absolute", left: 50, top: 80 }}>{screen}</div>
    <div style={{ position: "absolute", left: 160, top: 560, width: 80, height: 80, background: "#2A2E37" }} />
    <div style={{ position: "absolute", left: 680, top: 560, width: 80, height: 80, background: "#2A2E37" }} />
    <div style={{ position: "absolute", left: -120, top: 440 }}>
      <Worker cap={C.red} px={9} f={f} walk={on} />
    </div>
  </div>
);

const PixScreen: React.FC<{ f: number }> = ({ f }) => (
  <PxScreen w={700} h={420} color="#FF8A70">
    <div style={{ position: "absolute", inset: 30, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} style={{ background: (i * 7 + Math.floor(f / 3)) % 11 < 3 ? "#FF8A70" : "#2A1E22" }} />
      ))}
    </div>
  </PxScreen>
);

/* =============== 幕 13　渲染工位 =============== */

const FRAMES = [812, 233, 1490];
const st13 = (c: SceneClock) => ({
  sign: c.w(0, "Remotion", -6),
  flip: c.w(1, "网页", -8),
  formula: c.w(1, "时间", -4),
  picks: FRAMES.map((_, k) => c.w(2, "任何一帧", -2) + k * 12),
});

const S13View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st13(c);
  const fl = ramp(f, s.flip, s.flip + 10);
  const sliderT = f < s.flip + 10 ? 0.2 : 0.5 + 0.42 * Math.sin((f - s.flip - 10) / 13);
  const showBrowser = fl >= 0.5;
  return (
    <>
      <Machine f={f} screen={!showBrowser ? <div style={{ transform: `perspective(1400px) rotateY(${fl * 180}deg)` }}><PixScreen f={f} /></div> : null} />
      {f >= s.sign && (
        <div style={{ position: "absolute", left: 820, top: 110, transform: `translateY(${(1 - pop(f, s.sign, { damping: 10, stiffness: 140 })) * -400}px)` }}>
          <Paper w={480} h={130} rotate={-2} style={{ fontSize: 76 }}>
            Remotion
          </Paper>
        </div>
      )}
      {/* 翻过来：手绘浏览器窗口 */}
      {showBrowser && (
        <div style={{ position: "absolute", left: 560, top: 230, transform: `perspective(1400px) rotateY(${(1 - fl) * -180}deg) scale(${interpolate(fl, [0.5, 1], [0.92, 1])})`, transformOrigin: "50% 50%" }}>
          <SketchWindow w={860} h={600} title="localhost:3000 · Ep001" seed="browser">
            <div style={{ position: "absolute", left: 30, top: 24 }}>
              <MiniFrame w={800} h={450} t={sliderT} />
            </div>
            <div style={{ position: "absolute", left: 30, top: 494, width: 800, height: 10, background: "#D8D4C8" }} />
            <div style={{ position: "absolute", left: 30 + sliderT * 780, top: 480, width: 24, height: 38, background: C.red, boxShadow: `0 0 0 4px ${INK}` }} />
          </SketchWindow>
        </div>
      )}
      <Card x={1460} y={150} w={420} h={170} at={s.formula} enter="drop" exit="none" rotate={3}>
        <Paper w={420} h={170} style={{ fontSize: 56 }}>
          画面 = f(时间)
        </Paper>
      </Card>
      {FRAMES.map((n, k) => {
        const at = s.picks[k];
        if (f < at) return null;
        return (
          <div key={n} style={{ position: "absolute", left: 1480, top: 380 + k * 190, transform: `scale(${pop(f, at)})`, transformOrigin: "0 50%" }}>
            <div style={{ position: "absolute", left: 0, top: -6 }}>
              <PxLabel size={36} bg={C.yellow}>{String(n).padStart(4, "0")}</PxLabel>
            </div>
            <div style={{ position: "absolute", left: 140, top: -20, boxShadow: `0 0 0 4px ${PAL.k}, 8px 8px 0 4px rgba(0,0,0,0.4)`, opacity: f >= at + 4 ? 1 : 0 }}>
              <MiniFrame w={256} h={144} t={n / 4266} />
            </div>
          </div>
        );
      })}
      <Sfx at={0} name="whoosh" volume={0.5} />
      <Sfx at={4} name="riser" volume={0.25} />
      <Sfx at={s.sign} name="stamp" volume={0.4} />
      <Sfx at={s.flip} name="slide" volume={0.5} />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <Sfx key={k} at={s.flip + 14 + k * 10} name="tick" volume={0.25} />
      ))}
      <Sfx at={s.formula} name="impact" volume={0.35} />
      {s.picks.map((t, k) => (
        <Sfx key={`p${k}`} at={t + 4} name="click" volume={0.5} />
      ))}
    </>
  );
};

export const S13: SceneDef = {
  View: S13View,
  cam: (c) => {
    const s = st13(c);
    return [
      { at: 0, x: 2700, y: 540, s: 1 },
      { at: 1, x: 1100, y: 540, s: 1, whip: 1 },
      { at: s.flip + 10, x: 1000, y: 520, s: 1.12 },
      { at: s.picks[0] - 6, x: 1150, y: 540, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st13(c);
    return [
      { at: 0, x: 1060, y: 520, r: 700 },
      { at: s.sign, x: 1060, y: 300, r: 560 },
      { at: s.flip, x: 990, y: 520, r: 640 },
      { at: s.picks[0] - 6, x: 1500, y: 560, r: 560 },
    ];
  },
};

/* =============== 幕 14　只重渲一句 =============== */

const QW = { x: 500, y: 170, w: 900, h: 620 };
const PICK = 16;
const st14 = (c: SceneClock) => ({
  print: 6,
  yellow: c.w(1, "改哪句", -4),
  fill: c.w(1, "只重渲", -2),
  done: c.w(1, "几秒", 6),
});

const S14View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st14(c);
  const prog = ramp(f, s.fill, s.done);
  const state = f < s.yellow ? 0 : f < s.done ? 1 : 2;
  const secs = (prog * 3).toFixed(1);
  return (
    <>
      {/* 打印机出口：卡片从这里一行行打印出来 */}
      <div style={{ position: "absolute", left: QW.x - 40, top: QW.y - 50, width: QW.w + 80, height: 50, background: "#4A505C", boxShadow: `0 0 0 5px ${PAL.k}` }}>
        <div style={{ position: "absolute", left: 30, top: 14, width: QW.w + 20, height: 12, background: "#1B1E25" }} />
        <div style={{ position: "absolute", right: 20, top: 12, width: 26, height: 26, background: f < s.print + 22 ? C.green : C.red, borderRadius: 13 }} />
      </div>
      <Card x={QW.x} y={QW.y} w={QW.w} h={QW.h} at={s.print} enter="print" exit="none">
        <SketchWindow w={QW.w} h={QW.h} title="渲染队列" seed="queue">
          <div style={{ position: "absolute", left: 40, top: 30, display: "grid", gridTemplateColumns: "repeat(7, 100px)", gap: 18 }}>
            {Array.from({ length: 42 }).map((_, i) => {
              const me = i === PICK;
              const col = me && state === 1 ? C.yellow : C.green;
              return (
                <div key={i} style={{ position: "relative", width: 100, height: 70, background: col, boxShadow: `inset 0 -8px 0 rgba(0,0,0,0.2), 0 0 0 3px ${INK}`, transform: me && f >= s.yellow && f < s.yellow + 8 ? `scale(${1 + 0.25 * Math.sin(ramp(f, s.yellow, s.yellow + 8) * Math.PI)})` : undefined }}>
                  <div style={{ position: "absolute", left: 8, top: 6, fontFamily: PX_FONT, fontSize: 24, color: PAL.k }}>{`L${String(i + 1).padStart(2, "0")}`}</div>
                  {me && state === 1 && (
                    <div style={{ position: "absolute", left: 8, bottom: 10, width: 84, height: 12, background: "#fff" }}>
                      <div style={{ width: `${prog * 100}%`, height: "100%", background: C.blue }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SketchWindow>
      </Card>
      {f >= s.yellow && (
        <div style={{ position: "absolute", left: 1450, top: 300, transform: `scale(${pop(f, s.yellow)})` }}>
          <PxScreen w={340} h={150} color={state === 2 ? "#7CF0A0" : C.yellow}>
            <span style={{ fontFamily: PX_MONO, fontSize: 72 }}>{`${secs} 秒`}</span>
          </PxScreen>
          <div style={{ position: "absolute", left: 0, top: 190 }}>
            <PxLabel size={36} bg="#3A3D45" color="#fff">
              其余 41 句：不动
            </PxLabel>
          </div>
        </div>
      )}
      <Burst x={QW.x + 40 + (PICK % 7) * 118 + 50} y={QW.y + 90 + Math.floor(PICK / 7) * 88 + 35} f={f} at={s.done} n={12} seed="q" colors={[C.green, "#fff", C.yellow]} size={16} />
      <Sfx at={s.print} name="type" volume={0.4} />
      <Sfx at={s.print + 10} name="type" volume={0.4} />
      <Sfx at={s.yellow} name="blip_low" volume={0.5} />
      <Sfx at={s.fill} name="riser" volume={0.3} />
      <Sfx at={s.done} name="success" volume={0.45} />
    </>
  );
};

export const S14: SceneDef = {
  View: S14View,
  cam: (c) => {
    const s = st14(c);
    const bx = QW.x + 40 + (PICK % 7) * 118 + 50;
    const by = QW.y + 90 + Math.floor(PICK / 7) * 88 + 35;
    return [
      { at: 0, x: 960, y: 520, s: 1 },
      { at: s.yellow, x: bx + 180, y: by, s: 1.45 },
      { at: s.done + 14, x: 1060, y: 520, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st14(c);
    return [
      { at: 0, x: 950, y: 480, r: 640 },
      { at: s.yellow, x: 870, y: 540, r: 420 },
      { at: s.done + 14, x: 1100, y: 480, r: 700 },
    ];
  },
};

/* =============== 幕 15　成片 =============== */

const SEGS = [C.blue, C.yellow, C.green, C.red, "#9B6BE0"];
const BOX = { x: 1060, y: 600 };
const st15 = (c: SceneClock) => {
  const join = c.w(0, "拼起来", -12);
  return { join, roll: join + 22, outs: [join + 34, c.w(0, "字幕", -4), c.w(0, "封面", -4)] };
};
const DELIV = [
  { x: 600, y: 200, w: 400, h: 280 },
  { x: 1040, y: 170, w: 440, h: 320 },
  { x: 1510, y: 200, w: 370, h: 280 },
];

const S15View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st15(c);
  const jp = ease(ramp(f, s.join, s.join + 14));
  const rp = ease(ramp(f, s.roll, s.roll + 12));
  return (
    <>
      {/* 成片工位：紫色厂房框 + 传送带 */}
      <div style={{ position: "absolute", left: 470, top: 96, width: 1420, height: 740, background: "#211D2C", boxShadow: `0 0 0 6px ${PAL.k}`, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 6px, transparent 6px 90px)" }} />
      <div style={{ position: "absolute", left: 470, top: 96, width: 1420, height: 44, background: "#9B6BE0", boxShadow: `inset 0 -8px 0 rgba(0,0,0,0.25), 0 0 0 6px ${PAL.k}` }} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <div key={k} style={{ position: "absolute", left: 520 + k * 170, top: 108, width: 22, height: 22, background: Math.floor(f / 5 + k) % 4 === 0 ? "#fff" : "#6A44A8" }} />
      ))}
      <Conveyor x={-200} y={800} w={2400} f={f} speed={f < s.roll + 12 ? 4 : 1} />
      <div style={{ position: "absolute", left: BOX.x - 60, top: BOX.y - 40 }}>
        <Pix map={ICON.box} px={24} />
      </div>
      <div style={{ position: "absolute", left: BOX.x + 220, top: BOX.y + 40 }}>
        <Worker cap="#9B6BE0" px={12} f={f} up={f >= s.roll && f < s.roll + 14} walk />
      </div>
      {/* 胶片：散着 → 拼成一整条 → 卷起来塞进包裹 */}
      {rp < 1 &&
        SEGS.map((col, i) => {
          const sx = 720 + i * 230 + (i % 2) * 20;
          const sy = 300 + (i % 2 ? -60 : 60);
          const jx = 760 + i * 214;
          const jy = 330;
          const x = interpolate(jp, [0, 1], [sx, jx]);
          const y = interpolate(jp, [0, 1], [sy, jy]);
          const rx = interpolate(rp, [0, 1], [x, BOX.x + 40]);
          const ry = interpolate(rp, [0, 1], [y, BOX.y + 20]);
          return (
            <div key={i} style={{ position: "absolute", left: rx, top: ry, width: 214, height: 160, background: "#111", transform: `rotate(${(1 - jp) * (i - 2) * 6}deg) scale(${1 - rp * 0.8})`, boxShadow: `0 0 0 4px ${PAL.k}` }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 10, backgroundImage: "repeating-linear-gradient(90deg, #555 0 12px, transparent 12px 24px)" }} />
              <div style={{ position: "absolute", left: 12, right: 12, top: 26, bottom: 26, background: col, opacity: 0.85 }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 10, backgroundImage: "repeating-linear-gradient(90deg, #555 0 12px, transparent 12px 24px)" }} />
            </div>
          );
        })}
      {/* 三张交付卡从包裹里放出来 */}
      {DELIV.map((d, k) => {
        const at = s.outs[k];
        if (f < at) return null;
        const p = pop(f, at, { damping: 12, stiffness: 150, mass: 0.7 });
        const x = interpolate(p, [0, 1], [BOX.x + 120 - d.w / 2, d.x]);
        const y = interpolate(p, [0, 1], [BOX.y + 100 - d.h / 2, d.y]) - Math.sin(clamp01(p) * Math.PI) * 80;
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, transform: `scale(${0.15 + 0.85 * p}) rotate(${[-4, 1, 4][k]}deg)` }}>
            {k === 0 && (
              <PxScreen w={d.w} h={d.h} color="#C9A6FF">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: PX_MONO, fontSize: 96 }}>MP4</span>
                  <span style={{ fontFamily: PX_MONO, fontSize: 24, color: "#9AA3B2" }}>1920×1080 · 2:22</span>
                </div>
              </PxScreen>
            )}
            {k === 1 && (
              <SketchWindow w={d.w} h={d.h} title="ep001.srt" seed="srt">
                <div style={{ padding: "18px 24px", fontFamily: HAND, fontSize: 28, color: INK, lineHeight: 1.45 }}>
                  <div style={{ color: "#8D8A80" }}>00:00:00,165 → 00:00:04,490</div>
                  <div>这条两分钟的视频……</div>
                  <div style={{ color: "#8D8A80" }}>00:00:04,530 → 00:00:06,960</div>
                  <div>三次？剪辑都不用？</div>
                </div>
              </SketchWindow>
            )}
            {k === 2 && (
              <div style={{ position: "relative", width: d.w, height: d.h, background: "#16171B", boxShadow: `0 0 0 6px #F5F4F0, 14px 16px 0 6px rgba(0,0,0,0.45)`, overflow: "hidden" }}>
                <Img src={staticFile("characters/host_count_three_a.png")} style={{ position: "absolute", left: -40, top: 10, width: 230 }} />
                <div style={{ position: "absolute", left: 160, top: 60, width: 240, fontFamily: SANS, fontWeight: 900, fontSize: 46, color: "#fff", lineHeight: 1.15 }}>
                  只动了<span style={{ color: C.yellow }}>三次手</span>
                </div>
                <div style={{ position: "absolute", left: 0, top: 0 }}>
                  <PxLabel size={24} bg={C.red} color="#fff">封面</PxLabel>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {f >= 4 && (
        <div style={{ position: "absolute", left: 1560, top: 620, transform: `scale(${pop(f, 4)})` }}>
          <PxLabel size={48} bg="#9B6BE0" color="#fff">
            成片
          </PxLabel>
        </div>
      )}
      <Sfx at={0} name="whoosh" volume={0.4} />
      <Sfx at={s.join} name="slide" volume={0.5} />
      <Sfx at={s.join + 14} name="chunk" volume={0.5} />
      <Sfx at={s.roll + 12} name="kick" volume={0.4} />
      {s.outs.map((t, k) => (
        <Sfx key={k} at={t} name="pop" volume={0.5} />
      ))}
    </>
  );
};

export const S15: SceneDef = {
  View: S15View,
  cam: (c) => {
    const s = st15(c);
    return [
      { at: 0, x: 1150, y: 480, s: 1.15 },
      { at: s.outs[0] - 4, x: 1000, y: 520, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st15(c);
    return [
      { at: 0, x: 1100, y: 520, r: 640 },
      { at: s.roll, x: 1060, y: 660, r: 420 },
      { at: s.outs[0], x: 1170, y: 300, r: 760 },
    ];
  },
};

export { SketchRect, ramp };
