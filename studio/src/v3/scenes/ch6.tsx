import { Card } from "../../flow/card";
import { HAND, INK, SketchButton, SketchRect, SketchWindow, Typed } from "../../flow/sketch";
import { C } from "../../ref/kit";
import { Sfx, useScene, type SceneClock, type SceneDef } from "../ctx";
import { Burst, House, ICON, PAL, PX_MONO, Pix, PxLabel, PxScreen, Worker } from "../pixel";
import { CAPS, CheckRow, Crane, Factory, Paper, clamp01, ease, pop, ramp } from "../common";

/* =============== 幕 16　回到三次动手 =============== */

const st16 = (c: SceneClock) => ({
  lit: [c.at(0, 0.3), c.at(0, 0.45), c.at(0, 0.6)],
  counter: c.w(0, "三次动手", -6),
  run: [0, 1, 2].map((k) => c.at(1, 0) - 16 + k * 6),
  checks: [c.w(1, "稿子", 0), c.w(1, "素材", 0), c.w(1, "成片", 0)],
});
const CARDS = ["看一眼稿子", "过一遍素材", "看一遍成片"];

const S16View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st16(c);
  return <Factory f={f} st={{ signAt: [-1, -1, -1, -1, -1], lit: [1, 1, 1, 1, 1], flagAt: [-1, -1, -1], flagPx: 16, flagLit: s.lit.map((t) => (f >= t ? 1 : 0)) }} />;
};

const S16Overlay: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st16(c);
  return (
    <>
      {f >= s.counter && (
        <div style={{ position: "absolute", left: 830, top: 96, transform: `scale(${pop(f, s.counter)})` }}>
          <PxScreen w={560} h={240} color="#FF9A4D">
            <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
              <span style={{ fontFamily: PX_MONO, fontSize: 48, color: "#9AA3B2" }}>动手次数</span>
              <span style={{ fontFamily: PX_MONO, fontSize: 144 }}>3</span>
            </div>
          </PxScreen>
        </div>
      )}
      {CARDS.map((t, k) => {
        const at = s.run[k];
        if (f < at) return null;
        const p = ease(ramp(f, at, at + 18));
        const tx = 500 + k * 460;
        const x = 2000 + (tx - 2000) * p;
        const sway = Math.sin((f - at) / 3) * 4 * (1 - p) + (p >= 1 ? Math.sin((f - at - 18) / 4) * 2 * Math.exp(-(f - at - 18) / 10) : 0);
        return (
          <div key={t} style={{ position: "absolute", left: x, top: 390 }}>
            <div style={{ transform: `rotate(${sway}deg)`, transformOrigin: "50% 100%" }}>
              <Paper w={420} h={130} rotate={0} style={{ justifyContent: "flex-start", paddingLeft: 28, boxSizing: "border-box" }}>
                <CheckRow text={t} p={ramp(f, s.checks[k], s.checks[k] + 8)} seed={`end${k}`} size={52} />
              </Paper>
            </div>
            <div style={{ position: "absolute", left: 170, top: 128 }}>
              <Worker cap={CAPS[[0, 2, 4][k]]} px={8} f={f} walk={p < 1} up={p >= 1} speed={2} />
            </div>
          </div>
        );
      })}
      {s.checks.map((t, k) => (
        <Burst key={k} x={560 + k * 460} y={450} f={f} at={t + 6} n={10} seed={`e${k}`} colors={[C.green, "#fff", C.yellow]} size={14} power={0.6} />
      ))}
    </>
  );
};

export const S16: SceneDef = {
  View: S16View,
  Overlay: S16Overlay,
  cam: () => [
    { at: 0, x: 1480, y: 540, s: 0.52 },
    { at: 2, x: 1270, y: -60, s: 0.34 },
  ],
  spots: (c) => {
    const s = st16(c);
    return [
      { at: 0, x: 1150, y: 760, r: 720 },
      { at: s.counter, x: 1110, y: 240, r: 520 },
      { at: s.run[0] + 12, x: 1170, y: 460, r: 760 },
    ];
  },
};

/* =============== 幕 17　互动与预告 =============== */

const FILES = ["pipeline/", "  tts.py          配音 + 逐字时间", "  sprites.py      立绘校验", "  sfx_lib.py      音效库", "studio/src/v3/", "  Episode3.tsx    整期合成", "  scenes/         17 幕", "episodes/ep001.json"];

const st17 = (c: SceneClock) => {
  const yao = c.w(1, "要", -6);
  return {
    closeTree: c.at(1, 0),
    openC: c.at(1, 6),
    type: yao,
    send: yao + 10,
    hang: c.at(2, 4),
    lightUp: c.w(2, "第一个工位", -2),
  };
};

const S17View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st17(c);
  const press = f >= s.send && f < s.send + 6 ? 1 : 0;
  return (
    <>
      {/* 句 40：源码目录，DeepSeek 伸手要 */}
      <Card x={500} y={150} w={860} h={600} at={2} out={s.closeTree} enter="open" exit="close">
        <SketchWindow w={860} h={600} title="video-studio/" seed="tree">
          <div style={{ padding: "26px 34px", fontFamily: '"Cascadia Mono", monospace', fontSize: 32, lineHeight: 1.62, color: INK, whiteSpace: "pre" }}>
            {FILES.map((l, i) => (
              <div key={i} style={{ opacity: f >= 6 + i * 3 ? 1 : 0, color: l.endsWith("/") ? C.blue : INK, fontWeight: l.endsWith("/") ? 700 : 400 }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", right: 40, top: 30 }}>
            <Pix map={ICON.star} px={8} />
          </div>
        </SketchWindow>
      </Card>
      <Burst x={1650} y={560} f={f} at={c.at(0, 0.35)} n={18} seed="eager" size={20} power={1.2} />
      <Burst x={1650} y={560} f={f} at={c.at(0, 0.7)} n={14} seed="eager2" size={18} power={1} />
      {/* 句 41：评论区 */}
      <Card x={560} y={150} w={900} h={600} at={s.openC} out={s.hang - 4} enter="open" exit="pop">
        <SketchWindow w={900} h={600} title="评论区" seed="comments">
          {[
            ["#4D6BFE", "求源码！做得好可爱"],
            [C.orange, "第一次见代码做视频…"],
          ].map(([col, t], i) => (
            <div key={i} style={{ position: "absolute", left: 30, top: 30 + i * 110, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, background: col, boxShadow: `0 0 0 3px ${INK}` }} />
              <span style={{ fontFamily: HAND, fontSize: 38, color: INK }}>{t}</span>
            </div>
          ))}
          <div style={{ position: "absolute", left: 30, top: 270, width: 600, height: 120 }}>
            <SketchRect w={600} h={120} seed="input" sw={4} />
            <div style={{ position: "absolute", left: 24, top: 18, fontFamily: HAND, fontSize: 68, color: INK }}>
              <Typed text="要" p={ramp(f, s.type, s.type + 3)} cursor={f >= s.openC + 6} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 660, top: 300 }}>
            <SketchButton label="发送" seed="send" w={190} h={74} filled size={38} press={press} />
          </div>
          {f >= s.send + 4 && (
            <div style={{ position: "absolute", left: 30, top: 430, display: "flex", alignItems: "center", gap: 20, transform: `translateY(${(1 - pop(f, s.send + 4)) * 40}px)`, opacity: clamp01(pop(f, s.send + 4) * 2) }}>
              <div style={{ width: 64, height: 64, background: C.green, boxShadow: `0 0 0 3px ${INK}` }} />
              <span style={{ fontFamily: HAND, fontSize: 46, color: INK }}>要</span>
              <Pix map={ICON.heart} px={5} />
            </div>
          )}
        </SketchWindow>
      </Card>
      {/* 发送后迸出一圈像素爱心 */}
      {f >= s.send + 2 &&
        f < s.send + 32 &&
        Array.from({ length: 10 }).map((_, k) => {
          const a = (k / 10) * Math.PI * 2;
          const t = (f - s.send - 2) / 30;
          const r = 120 + t * 520;
          return (
            <div key={k} style={{ position: "absolute", left: 1010 + Math.cos(a) * r * 1.3 - 30, top: 450 + Math.sin(a) * r * 0.8 - 30, opacity: 1 - t, transform: `scale(${1.2 - t * 0.5})` }}>
              <Pix map={ICON.heart} px={6} />
            </div>
          );
        })}
      <Burst x={1010} y={450} f={f} at={s.send + 2} n={16} seed="send" colors={[C.red, "#FF9AA8", "#fff", C.yellow]} size={18} power={1.2} />
      {/* 句 42：预告卡吊下来，背景里 1 号工位亮灯 */}
      <div style={{ position: "absolute", left: 1460, top: 560, transform: `scale(${pop(f, s.hang - 2)})`, transformOrigin: "50% 100%" }}>
        <House roof={CAPS[0]} px={16} lit={f >= s.lightUp ? 1 : 0} />
        <div style={{ position: "absolute", left: 110, top: -86, transform: `scale(${pop(f, s.lightUp)})` }}>
          <PxLabel size={48} bg={CAPS[0]} color="#fff">
            写稿
          </PxLabel>
        </div>
      </div>
      <Crane f={f} at={s.hang} x={520} y={250} w={880} h={220}>
        <Paper w={880} h={220} rotate={-1.5} style={{ flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 40, color: "#6E6E73" }}>下期</div>
          <div style={{ fontSize: 76 }}>
            从零搭起<span style={{ color: C.red }}>第一个工位</span>
          </div>
        </Paper>
      </Crane>
      <Sfx at={2} name="pop" volume={0.4} />
      <Sfx at={c.at(0, 0.35)} name="levelup" volume={0.4} />
      <Sfx at={s.closeTree} name="slide" volume={0.35} />
      <Sfx at={s.openC} name="pop" volume={0.4} />
      <Sfx at={s.type} name="type" volume={0.5} />
      <Sfx at={s.send} name="click" volume={0.6} />
      <Sfx at={s.send + 2} name="success" volume={0.5} />
      <Sfx at={s.hang} name="slide" volume={0.4} />
      <Sfx at={s.hang + 14} name="chunk" volume={0.45} />
      <Sfx at={s.lightUp} name="coin" volume={0.4} />
    </>
  );
};

export const S17: SceneDef = {
  View: S17View,
  cam: (c) => {
    const s = st17(c);
    return [
      { at: 0, x: 960, y: 540, s: 1 },
      { at: s.type - 8, x: 900, y: 520, s: 1.18 },
      { at: s.hang - 4, x: 1000, y: 520, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st17(c);
    return [
      { at: 0, x: 930, y: 450, r: 620 },
      { at: s.openC, x: 1010, y: 450, r: 640 },
      { at: s.hang, x: 960, y: 400, r: 600 },
      { at: s.lightUp, x: 1300, y: 520, r: 760 },
    ];
  },
};

export { PAL, ease };
