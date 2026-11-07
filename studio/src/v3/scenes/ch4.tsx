import { interpolate, spring } from "remotion";
import { Card } from "../../flow/card";
import { DrawPath, HAND, INK, SketchRect, SketchWindow, Waveform } from "../../flow/sketch";
import { C } from "../../ref/kit";
import { Sfx, useScene, type SceneClock, type SceneDef } from "../ctx";
import { Burst, Conveyor, ICON, PAL, PX_FONT, PX_MONO, Pix, PxLabel, PxScreen, Worker } from "../pixel";
import { CAPS, Paper, SANS, clamp01, ease, pop, ramp } from "../common";

/* =============== 幕 10　三条线同时开工 =============== */

const LANES = [
  { x: 470, name: "配音线", col: C.blue },
  { x: 950, name: "插画线", col: C.orange },
  { x: 1430, name: "录屏线", col: "#9B6BE0" },
];
const LW = 440;

/** 插画：天空、太阳、山、小房子。像素化时按格子取色 */
const IW = 400;
const IH = 236;
const illo = (x: number, y: number) => {
  const u = x / IW;
  const v = y / IH;
  if ((x - 300) ** 2 + (y - 70) ** 2 < 34 ** 2) return "#FFD25A";
  const hill1 = 0.62 + 0.1 * Math.sin(u * 5.2 + 1);
  const hill2 = 0.74 + 0.08 * Math.sin(u * 8 + 3);
  if (u > 0.18 && u < 0.36 && v > 0.5 && v < 0.74) return v < 0.58 ? "#E5483A" : "#F4EBDD";
  if (v > hill2) return "#3E8A2E";
  if (v > hill1) return "#5CBF45";
  return v < 0.3 ? "#7EC8F2" : "#A8DCF7";
};
const Illustration: React.FC<{ cell: number }> = ({ cell }) => {
  if (cell <= 1)
    return (
      <svg width={IW} height={IH} viewBox={`0 0 ${IW} ${IH}`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7EC8F2" />
            <stop offset="1" stopColor="#C9EBFB" />
          </linearGradient>
        </defs>
        <rect width={IW} height={IH} fill="url(#sky)" />
        <circle cx={300} cy={70} r={34} fill="#FFD25A" />
        <path d={`M0 ${IH} L0 ${IH * 0.66} Q ${IW * 0.3} ${IH * 0.48} ${IW * 0.6} ${IH * 0.62} T ${IW} ${IH * 0.6} L ${IW} ${IH} Z`} fill="#5CBF45" />
        <path d={`M0 ${IH} L0 ${IH * 0.8} Q ${IW * 0.4} ${IH * 0.68} ${IW} ${IH * 0.78} L ${IW} ${IH} Z`} fill="#3E8A2E" />
        <rect x={IW * 0.2} y={IH * 0.56} width={IW * 0.15} height={IH * 0.18} fill="#F4EBDD" stroke={INK} strokeWidth={3} />
        <path d={`M${IW * 0.18} ${IH * 0.57} L${IW * 0.275} ${IH * 0.46} L${IW * 0.37} ${IH * 0.57} Z`} fill="#E5483A" stroke={INK} strokeWidth={3} />
      </svg>
    );
  const cols = Math.ceil(IW / cell);
  const rows = Math.ceil(IH / cell);
  const rects: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) rects.push(<rect key={`${i}-${j}`} x={i * cell} y={j * cell} width={cell} height={cell} fill={illo(i * cell + cell / 2, j * cell + cell / 2)} />);
  return (
    <svg width={IW} height={IH} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
};

const Loading: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
    <div style={{ display: "flex", gap: 10 }}>
      {[0, 1, 2, 3, 4].map((k) => (
        <div key={k} style={{ width: 22, height: 22, background: Math.floor(f / 4) % 5 === k ? C.blue : "#D8D4C8" }} />
      ))}
    </div>
    <div style={{ fontFamily: HAND, fontSize: 30, color: "#8D8A80" }}>生成中…</div>
  </div>
);

const st10 = (c: SceneClock) => {
  const on = c.w(0, "同时", -4);
  const wave = c.w(1, "语音", -6);
  const measure = c.w(1, "有多长", -8);
  const draw = c.w(2, "生图", -16);
  const rec = c.w(2, "录屏线", -6);
  const pack = c.w(2, "操作画面", -4);
  return { on, wave, measure, draw, rec, pack, steps: [draw, draw + 7, draw + 14, draw + 21] };
};

const S10View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st10(c);
  const cell = f < s.steps[0] ? 50 : f < s.steps[1] ? 50 : f < s.steps[2] ? 25 : f < s.steps[3] ? 10 : 1;
  const secs = Math.min(2.8, Math.max(0, (f - (s.measure - 20)) / 20) * 2.8);
  const curT = ramp(f, s.rec, s.rec + 40);
  const cur = { x: 60 + Math.sin(curT * 5) * 120 + curT * 160, y: 70 + curT * 110 };
  return (
    <>
      <Conveyor x={-200} y={800} w={2400} f={f} speed={4} />
      {LANES.map((l, k) => {
        const lit = f >= s.on + k * 4;
        return (
          <div key={l.name}>
            <div style={{ position: "absolute", left: l.x, top: 96, width: LW, height: 700, background: "#1F232B", boxShadow: `0 0 0 4px ${PAL.k}` }} />
            <div style={{ position: "absolute", left: l.x + 20, top: 118 }}>
              <PxLabel size={48} bg={l.col} color="#fff">
                {l.name}
              </PxLabel>
            </div>
            {/* 机器 */}
            <div style={{ position: "absolute", left: l.x + 20, top: 210, width: LW - 40, height: 110, background: "#4A505C", boxShadow: `inset 0 -12px 0 rgba(0,0,0,0.3), 0 0 0 4px ${PAL.k}` }}>
              {[0, 1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: 24 + j * 52,
                    top: 30,
                    width: 32,
                    height: 32,
                    background: lit ? (Math.floor(f / 5 + j + k) % 3 === 0 ? "#fff" : l.col) : "#2A2E37",
                    boxShadow: lit ? `0 0 16px ${l.col}` : "none",
                  }}
                />
              ))}
              <div style={{ position: "absolute", right: 24, top: 22, width: 60, height: 60, background: lit ? C.green : C.red, borderRadius: 30, boxShadow: `0 0 0 4px ${PAL.k}` }} />
            </div>
            <div style={{ position: "absolute", left: l.x + 290, top: 690 }}>
              <Worker cap={l.col} px={8} f={f + k * 4} walk={lit} />
            </div>
          </div>
        );
      })}
      {/* 配音线：声波一行行打印出来，秒表量出时长 */}
      <div style={{ position: "absolute", left: 490, top: 350, transform: `scale(${pop(f, s.on)})` }}>
        <SketchWindow w={400} h={250} title="L05.wav" seed="wav">
          {f < s.wave && <Loading f={f} />}
          <div style={{ padding: "30px 20px", clipPath: `inset(0 0 ${(1 - ramp(f, s.wave, s.wave + 20)) * 100}% 0)` }}>
            <Waveform w={360} h={120} seed="wv5" color={C.blue} />
          </div>
          {f >= s.wave && f < s.wave + 20 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: 30 + ramp(f, s.wave, s.wave + 20) * 130, height: 6, background: "#7CF0A0", boxShadow: "0 0 18px 4px rgba(124,240,160,0.7)" }} />
          )}
        </SketchWindow>
      </div>
      {f >= s.measure - 20 && (
        <div style={{ position: "absolute", left: 500, top: 630, transform: `scale(${pop(f, s.measure - 20)})` }}>
          <PxScreen w={200} h={80} color="#7CF0A0">
            <span style={{ fontFamily: PX_MONO, fontSize: 36 }}>{`${secs.toFixed(1)} 秒`}</span>
          </PxScreen>
        </div>
      )}
      {f >= s.measure + 2 && (
        <div style={{ position: "absolute", left: 720, top: 330, transform: `scale(${pop(f, s.measure + 2)}) rotate(6deg)` }}>
          <PxLabel size={36} bg={C.yellow}>
            2.8 秒
          </PxLabel>
        </div>
      )}
      <div style={{ position: "absolute", left: 640, top: 640 }}>
        <Pix map={ICON.mic} px={8} />
      </div>
      {/* 插画线：马赛克逐级变清晰 */}
      <div style={{ position: "absolute", left: 970, top: 350, transform: `scale(${pop(f, s.on + 4)})` }}>
        <SketchWindow w={400} h={300} title="插画.png" seed="ill">
          {f < s.draw ? <Loading f={f} /> : <Illustration cell={cell} />}
        </SketchWindow>
      </div>
      <div style={{ position: "absolute", left: 990, top: 670 }}>
        <Pix map={ICON.bulb} px={8} />
      </div>
      {/* 录屏线：光标在界面上移动，工人把录屏装进胶片盒 */}
      <div style={{ position: "absolute", left: 1450, top: 350, transform: `scale(${pop(f, s.on + 8)})` }}>
        <SketchWindow w={400} h={300} title="录屏.mp4" seed="rec">
          <div style={{ position: "absolute", left: 20, top: 20, width: 110, height: 200, background: "#ECE7D8" }} />
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: "absolute", left: 150, top: 24 + k * 64, width: 220, height: 44, background: k === 1 && curT > 0.5 ? C.yellow : "#E3DED0" }}>
              <SketchRect w={220} h={44} seed={`rb${k}`} sw={2.5} />
            </div>
          ))}
          <div style={{ position: "absolute", left: cur.x + 130, top: cur.y }}>
            <Pix map={ICON.hand} px={4} />
          </div>
          <div style={{ position: "absolute", right: 14, top: 10, width: 18, height: 18, borderRadius: 9, background: C.red, opacity: Math.floor(f / 8) % 2 ? 1 : 0.3 }} />
        </SketchWindow>
      </div>
      {f >= s.pack && (
        <div style={{ position: "absolute", left: 1460 + 300 * ease(ramp(f, s.pack, s.pack + 14)), top: 650 - Math.sin(ramp(f, s.pack, s.pack + 14) * Math.PI) * 80 }}>
          <Pix map={ICON.reel} px={7} />
        </div>
      )}
      <div style={{ position: "absolute", left: 1730, top: 690 }}>
        <Pix map={ICON.box} px={8} />
      </div>
      <Burst x={1800} y={690} f={f} at={s.pack + 14} n={10} seed="pack" size={14} power={0.6} />

      <Sfx at={0} name="whoosh" volume={0.45} />
      {LANES.map((_, k) => (
        <Sfx key={k} at={s.on + k * 4} name="blip" volume={0.4} />
      ))}
      <Sfx at={s.wave} name="type" volume={0.4} />
      <Sfx at={s.measure + 2} name="tick" volume={0.6} />
      {s.steps.map((t, k) => (
        <Sfx key={`d${k}`} at={t} name="blip" volume={0.3 + k * 0.05} />
      ))}
      <Sfx at={s.on} name="pop" volume={0.4} />
      <Sfx at={s.pack + 14} name="chunk" volume={0.5} />
    </>
  );
};

export const S10: SceneDef = {
  View: S10View,
  cam: (c) => {
    const s = st10(c);
    const lane = (k: number) => ({ x: LANES[k].x + LW / 2 - 120, y: 405, s: 1.5 });
    return [
      { at: 0, x: 960, y: 540, s: 1.5 },
      { at: 1, x: 1160, y: 470, s: 1 },
      { at: c.at(1, 0), ...lane(0) },
      { at: c.at(2, 0), ...lane(1), whip: 1 },
      { at: s.rec - 10, ...lane(2), whip: 1 },
      { at: s.pack + 18, x: 1160, y: 470, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st10(c);
    return [
      { at: 0, x: 1160, y: 440, r: 760 },
      { at: c.at(1, 0), x: 900, y: 520, r: 560 },
      { at: c.at(2, 0), x: 1000, y: 540, r: 560 },
      { at: s.rec - 10, x: 1100, y: 540, r: 560 },
      { at: s.pack + 18, x: 1160, y: 440, r: 760 },
    ];
  },
};

/* =============== 幕 11　音画对齐 =============== */

const AUD = [250, 170, 300, 180];
const T0 = 560;
const st11 = (c: SceneClock) => ({ snap: c.w(1, "停多久", -10), drag: c.w(2, "拖时间轴", -12), sweep: c.at(2, 0) });

const S11View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st11(c);
  const p = f < s.snap ? 0 : spring({ frame: f - s.snap, fps: 30, config: { damping: 9, stiffness: 120, mass: 0.7 } });
  const audX = AUD.reduce<number[]>((a, w, i) => [...a, i ? a[i - 1] + AUD[i - 1] : T0], []);
  const picW = AUD.map((w) => 225 + (w - 225) * p);
  const picX = picW.reduce<number[]>((a, w, i) => [...a, i ? a[i - 1] + picW[i - 1] : T0], []);
  const lineP = ramp(f, s.snap + 12, s.snap + 20);
  const head = T0 + ramp(f, s.sweep, c.dur - 4) * 900;
  const cross = ramp(f, s.drag + 10, s.drag + 18);
  return (
    <>
      <Card x={480} y={130} w={1000} h={600} at={c.at(0, 4)} enter="drop" exit="none" rotate={-1}>
        <Paper w={1000} h={600} style={{ alignItems: "flex-start", justifyContent: "flex-start" }}>
          <div style={{ position: "absolute", left: 40, top: 26, fontSize: 52 }}>时间轴</div>
          <div style={{ position: "absolute", left: 40, top: 150, fontFamily: SANS, fontSize: 30, color: "#6E6E73" }}>配音</div>
          <div style={{ position: "absolute", left: 40, top: 330, fontFamily: SANS, fontSize: 30, color: "#6E6E73" }}>画面</div>
        </Paper>
      </Card>
      {f >= c.at(0, 8) &&
        AUD.map((w, i) => (
          <div key={i} style={{ position: "absolute", left: audX[i], top: 250, width: w - 6, height: 110, background: "#CFE0FF", transform: `scaleX(${pop(f, c.at(0, 8) + i * 3)})`, transformOrigin: "0 50%" }}>
            <div style={{ position: "absolute", left: 8, top: 10 }}>
              <Waveform w={w - 22} h={90} seed={`a${i}`} color={C.blue} live={0.5} />
            </div>
            <SketchRect w={w - 6} h={110} seed={`ar${i}`} sw={3.5} />
          </div>
        ))}
      {f >= c.at(0, 14) &&
        picW.map((w, i) => (
          <div key={i} style={{ position: "absolute", left: picX[i], top: 430, width: w - 6, height: 110, background: ["#FCE3D3", "#FFF1C2", "#DDF3D5", "#EADFFB"][i], transform: `scaleY(${pop(f, c.at(0, 14) + i * 3)})` }}>
            <div style={{ position: "absolute", left: 14, top: 18, width: Math.min(70, w - 40), height: 74, background: CAPS[i], opacity: 0.8 }} />
            <SketchRect w={w - 6} h={110} seed={`pr${i}`} sw={3.5} />
          </div>
        ))}
      {/* 接缝处的绿色对齐线 */}
      {audX.slice(1).map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x - 6, top: 240, width: 6, height: 320 * lineP, background: C.green, boxShadow: `0 0 12px ${C.green}` }} />
      ))}
      {/* 一推一拉的两个工人 */}
      {f >= s.snap - 14 && f < s.snap + 30 && (
        <>
          <div style={{ position: "absolute", left: picX[2] + picW[2] - 80, top: 560 }}>
            <Worker cap={C.green} px={7} f={f} walk flip />
          </div>
          <div style={{ position: "absolute", left: picX[1] + 10, top: 560 }}>
            <Worker cap={C.yellow} px={7} f={f + 3} walk />
          </div>
        </>
      )}
      {f >= s.sweep && <div style={{ position: "absolute", left: head, top: 230, width: 6, height: 330, background: C.red }} />}
      {f >= s.drag && (
        <div style={{ position: "absolute", left: 1220, top: 590, transform: `scale(${pop(f, s.drag)})` }}>
          <div style={{ position: "relative" }}>
            <Pix map={ICON.hand} px={11} />
            <div style={{ position: "absolute", left: 120, top: 30, fontFamily: HAND, fontSize: 40, color: INK, whiteSpace: "nowrap" }}>拖时间轴</div>
            <DrawPath d="M -20 -10 L 300 120" p={cross} stroke={C.red} sw={14} />
            <DrawPath d="M 300 -10 L -20 120" p={ramp(f, s.drag + 16, s.drag + 24)} stroke={C.red} sw={14} />
          </div>
        </div>
      )}
      <Sfx at={c.at(0, 4)} name="slide" volume={0.4} />
      <Sfx at={s.snap} name="slide" volume={0.5} />
      {[0, 1, 2].map((k) => (
        <Sfx key={k} at={s.snap + 12 + k * 3} name="tick" volume={0.55} />
      ))}
      <Sfx at={s.drag} name="pop" volume={0.4} />
      <Sfx at={s.drag + 10} name="error" volume={0.35} />
    </>
  );
};

export const S11: SceneDef = {
  View: S11View,
  cam: (c) => {
    const s = st11(c);
    const seam = T0 + AUD[0] + AUD[1];
    return [
      { at: 0, x: 960, y: 540, s: 1 },
      { at: s.snap + 16, x: seam, y: 420, s: 1.6 },
      { at: s.snap + 52, x: 960, y: 540, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st11(c);
    return [
      { at: 0, x: 980, y: 430, r: 640 },
      { at: s.snap + 16, x: 960, y: 420, r: 480 },
      { at: s.drag, x: 1100, y: 520, r: 620 },
    ];
  },
};

/* =============== 幕 12　素材指纹 =============== */

const ASSETS = [
  { t: "L03 配音", icon: "mic", h: "#a3f9" },
  { t: "L04 插画", icon: "photo", h: "#5b1c" },
  { t: "L05 配音", icon: "mic", h: "#e07d" },
  { t: "L06 录屏", icon: "film", h: "#91ab" },
  { t: "L07 插画", icon: "photo", h: "#2f6e" },
];
const AW = 250;
const AH = 300;
const ax = (i: number) => 470 + i * 285;
const AY = 470;
const CHG = 2;

const st12 = (c: SceneClock) => ({
  arrive: ASSETS.map((_, i) => 4 + i * 6),
  stamp: ASSETS.map((_, i) => c.w(0, "指纹", -4) + i * 3),
  change: c.w(0, "台词没改", -10),
  skip: ASSETS.map((_, i) => c.w(0, "不会重做", -8) + i * 4),
});

const AssetCard: React.FC<{ i: number; changed?: boolean }> = ({ i, changed }) => (
  <div style={{ position: "relative", width: AW, height: AH, background: "#FBFAF5" }}>
    <SketchRect w={AW} h={AH} seed={`as${i}`} sw={4} />
    <div style={{ position: "absolute", left: 0, top: 50, width: AW, display: "flex", justifyContent: "center" }}>
      <Pix map={ICON[ASSETS[i].icon]} px={11} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 190, width: AW, textAlign: "center", fontFamily: HAND, fontSize: 36, color: INK }}>
      <span style={{ background: changed ? C.yellow : "transparent", padding: "0 6px" }}>{ASSETS[i].t}</span>
    </div>
  </div>
);

const S12View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st12(c);
  const redoOut = s.change + 14;
  const redoIn = redoOut + 30;
  const scr = f < s.change ? 0 : f < s.skip[0] ? 1 : 2;
  return (
    <>
      <div style={{ position: "absolute", left: 640, top: 110, transform: `scale(${pop(f, 6)})` }}>
        <PxScreen w={1060} h={220} color={scr === 1 ? "#FF7A6B" : "#7CF0A0"}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{ fontFamily: PX_MONO, fontSize: 48 }}>{"指纹 = 哈希(台词 + 参数)"}</div>
            <div style={{ fontFamily: PX_MONO, fontSize: 36, color: scr === 1 ? "#FF7A6B" : "#9AA3B2" }}>
              {scr === 0 ? "指纹没变 → 直接用缓存" : scr === 1 ? "L05 改了：#e07d → #7c21  重做" : "跳过 4 份 · 重做 1 份"}
            </div>
          </div>
        </PxScreen>
      </div>
      <Conveyor x={-200} y={AY + AH + 10} w={2400} f={f} speed={f < s.arrive[4] + 20 ? 6 : 0} />
      {ASSETS.map((a, i) => {
        const t = s.arrive[i];
        const p = ease(ramp(f, t, t + 20));
        const x = interpolate(p, [0, 1], [-400, ax(i)]);
        const changed = i === CHG && f >= s.change;
        const body = (
          <div style={{ position: "absolute", left: x, top: AY }}>
            {!(i === CHG && f >= redoOut) && <AssetCard i={i} changed={changed} />}
          </div>
        );
        return (
          <div key={i}>
            {body}
            {/* 指纹章 */}
            {f >= s.stamp[i] && (
              <div style={{ position: "absolute", left: x + 120, top: AY - 30 }}>
                <div style={{ transform: `scale(${interpolate(ramp(f, s.stamp[i], s.stamp[i] + 5), [0, 1], [2.2, 1])}) rotate(-8deg)` }}>
                  <PxLabel size={36} bg={changed ? C.red : "#2A2E37"} color="#fff">
                    {changed && f < redoIn + 22 ? "#7c21" : a.h}
                  </PxLabel>
                </div>
              </div>
            )}
            {/* 跳过 ✓ */}
            {i !== CHG && f >= s.skip[i] && (
              <div style={{ position: "absolute", left: x + 30, top: AY + AH - 70, transform: `scale(${pop(f, s.skip[i])})` }}>
                <PxLabel size={36} bg={C.green} color="#fff">
                  跳过 ✓
                </PxLabel>
              </div>
            )}
          </div>
        );
      })}
      {/* 被改的那张：原地马赛克重做 */}
      <Card x={ax(CHG)} y={AY} w={AW} h={AH} at={0} out={redoOut} enter="none" exit="pixel" cell={25} seed="redo-out" colors={["#FBFAF5", C.yellow, C.red]}>
        {null}
      </Card>
      <Card x={ax(CHG)} y={AY} w={AW} h={AH} at={redoIn} enter="pixel" exit="none" cell={25} seed="redo-in" from="top" colors={["#FBFAF5", C.blue, C.green]}>
        <AssetCard i={CHG} />
      </Card>
      {f >= redoOut && f < redoIn + 20 && (
        <div style={{ position: "absolute", left: ax(CHG) + AW / 2 - 40, top: AY + AH / 2 - 40, width: 80, height: 80, transform: `rotate(${f * 18}deg)` }}>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} style={{ position: "absolute", left: k % 2 ? 50 : 0, top: k < 2 ? 0 : 50, width: 30, height: 30, background: [C.yellow, C.red, C.blue, C.green][k], boxShadow: `0 0 0 3px ${PAL.k}` }} />
          ))}
        </div>
      )}
      {f >= redoIn + 22 && (
        <div style={{ position: "absolute", left: ax(CHG) + 40, top: AY + AH - 70, transform: `scale(${pop(f, redoIn + 22)})` }}>
          <PxLabel size={36} bg={C.blue} color="#fff">
            重做 ✓
          </PxLabel>
        </div>
      )}
      <Sfx at={4} name="slide" volume={0.4} />
      {s.stamp.map((t, i) => (
        <Sfx key={i} at={t} name="stamp" volume={0.35} />
      ))}
      <Sfx at={s.change} name="error" volume={0.35} />
      <Sfx at={redoOut} name="shatter" volume={0.35} />
      <Sfx at={redoIn} name="blip" volume={0.35} />
      {s.skip.map((t, i) => (i !== CHG ? <Sfx key={`k${i}`} at={t} name="coin" volume={0.25} /> : null))}
    </>
  );
};

export const S12: SceneDef = {
  View: S12View,
  cam: (c) => {
    const s = st12(c);
    return [
      { at: 0, x: 1000, y: 540, s: 1 },
      { at: s.change - 4, x: ax(CHG) + AW / 2, y: AY + AH / 2 - 60, s: 1.45 },
      { at: s.skip[0] - 6, x: 1000, y: 540, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st12(c);
    return [
      { at: 0, x: 1150, y: 560, r: 760 },
      { at: s.change - 4, x: 960, y: 520, r: 420 },
      { at: s.skip[0] - 6, x: 1150, y: 560, r: 760 },
    ];
  },
};

export { clamp01, PX_FONT };
