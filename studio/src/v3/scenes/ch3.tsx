import { Img, interpolate, staticFile } from "remotion";
import { Card } from "../../flow/card";
import { HAND, INK, SketchRect, SketchWindow, Typed } from "../../flow/sketch";
import { C } from "../../ref/kit";
import { Sfx, useScene, type SceneClock, type SceneDef } from "../ctx";
import { Burst, DS_A, DS_B, House, ICON, PAL, PX_FONT, PX_MONO, Pix, PxLabel, PxScreen, Worker } from "../pixel";
import { Arrow, CAPS, CheckRow, CodeWin, Crane, Factory, HOUSE_PX, HOUSE_TOP, HOUSE_X, Paper, SANS, clamp01, ease, pop, ramp, type Tok } from "../common";

/* =============== 写稿工位的屋里（幕 6、7 共用） =============== */

const Interior: React.FC<{ f: number; typing?: boolean; dim?: number }> = ({ f, typing = true, dim = 0 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
    <div style={{ position: "absolute", left: 440, top: 96, width: 1460, height: 690, background: "#243049", boxShadow: `0 0 0 5px ${PAL.k}`, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 6px, transparent 6px 80px)" }} />
    <div style={{ position: "absolute", left: 440, top: 786, width: 1460, height: 130, background: "#2E2A3A", boxShadow: `0 0 0 5px ${PAL.k}`, backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0 6px, transparent 6px 110px)" }} />
    {/* 书架 */}
    <div style={{ position: "absolute", left: 1620, top: 420, width: 240, height: 366, background: "#5E3C26", boxShadow: `0 0 0 5px ${PAL.k}` }}>
      {[0, 1, 2].map((r) => (
        <div key={r} style={{ position: "absolute", left: 14, top: 18 + r * 116, width: 212, height: 90, display: "flex", alignItems: "flex-end", gap: 6 }}>
          {[C.blue, C.yellow, C.red, C.green, "#9B6BE0", C.blue].map((col, k) => (
            <div key={k} style={{ width: 26, height: 60 + ((k * 7 + r * 3) % 4) * 8, background: col, boxShadow: `0 0 0 3px ${PAL.k}` }} />
          ))}
        </div>
      ))}
    </div>
    {/* 桌子和电脑 */}
    <div style={{ position: "absolute", left: 520, top: 700, width: 560, height: 24, background: "#8A5A3A", boxShadow: `0 0 0 5px ${PAL.k}` }} />
    <div style={{ position: "absolute", left: 550, top: 724, width: 22, height: 62, background: "#5E3C26" }} />
    <div style={{ position: "absolute", left: 1030, top: 724, width: 22, height: 62, background: "#5E3C26" }} />
    <div style={{ position: "absolute", left: 860, top: 520, width: 200, height: 150, background: "#3A3F4A", boxShadow: `0 0 0 5px ${PAL.k}` }}>
      <div style={{ position: "absolute", inset: 12, background: "#0E1418" }}>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{ position: "absolute", left: 10, top: 12 + k * 26, height: 12, width: 40 + ((Math.floor(f / 6) + k * 3) % 6) * 18, background: "#7CF0A0", opacity: 0.8 }} />
        ))}
      </div>
    </div>
    <div style={{ position: "absolute", left: 940, top: 670, width: 40, height: 30, background: "#3A3F4A" }} />
    <div style={{ position: "absolute", left: 700, top: 686, width: 140, height: 14, background: "#BFC5CF", boxShadow: `0 0 0 3px ${PAL.k}` }} />
    {/* 像素 DeepSeek */}
    <div style={{ position: "absolute", left: 600, top: 470 }}>
      <Pix map={typing && Math.floor(f / 4) % 2 ? DS_B : DS_A} px={13} />
    </div>
  </div>
);

const SCRIPT = ["这条两分钟的视频，", "从写稿到出片，", "我只动了三次手。", "——三次？剪辑都不用？", "——不用。每一帧都是", "    代码算出来的。"];

const Guide: React.FC<{ w?: number; h?: number }> = ({ w = 330, h = 220 }) => (
  <Paper w={w} h={h} rotate={-3} style={{ flexDirection: "column", gap: 14, alignItems: "flex-start", padding: "0 30px", boxSizing: "border-box" }}>
    <div style={{ fontSize: 44 }}>风格指南</div>
    {[0.9, 0.7, 0.8].map((k, i) => (
      <div key={i} style={{ width: `${k * 100}%`, height: 12, background: "#B9B6AC" }} />
    ))}
  </Paper>
);

/* =============== 幕 6　写稿工位 =============== */

const DIVE = 26;
const WIN = { x: HOUSE_X[0] + 4.5 * HOUSE_PX, y: HOUSE_TOP + 8 * HOUSE_PX };

const S06View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  if (f < DIVE) return <Factory f={f + 600} st={{ signAt: [-1, -1, -1, -1, -1], lit: [1, 0, 0, 0, 0] }} />;
  const signAt = c.w(0, "DeepSeek", -4);
  const guideAt = c.at(1, 2);
  const spit = c.w(1, "风格指南", -2);
  const typeStart = spit + 20;
  return (
    <>
      <Interior f={f} />
      {f >= signAt && (
        <div style={{ position: "absolute", left: 590, top: 380, transform: `scale(${pop(f, signAt)})`, transformOrigin: "50% 100%" }}>
          <PxLabel size={48} bg="#4D6BFE" color="#fff">
            DeepSeek
          </PxLabel>
        </div>
      )}
      {f >= guideAt && (
        <div style={{ position: "absolute", left: 500, top: 150, transform: `translateY(${(1 - pop(f, guideAt, { damping: 11, stiffness: 140 })) * -500}px)` }}>
          <Guide />
          <div style={{ position: "absolute", left: 150, top: -12, width: 22, height: 22, background: C.red, borderRadius: 11, boxShadow: `0 0 0 4px ${PAL.k}` }} />
        </div>
      )}
      <Card x={1080} y={130} w={760} h={540} at={spit} enter="pixel" exit="none" cell={36} seed="script" fromPt={[700 - 1080, 470 - 130]} colors={[C.blue, "#4D6BFE", C.yellow, "#FBFAF5", "#FBFAF5"]}>
        <SketchWindow w={760} h={540} title="口播稿.txt" seed="scriptwin">
          <div style={{ padding: "26px 34px", fontFamily: HAND, fontSize: 42, color: INK, lineHeight: 1.6 }}>
            {SCRIPT.map((t, i) => (
              <div key={i} style={{ height: 66 }}>
                <Typed text={t} p={ramp(f, typeStart + i * 6, typeStart + i * 6 + 7)} cursor={f >= typeStart + i * 6 && f < typeStart + i * 6 + 8} />
              </div>
            ))}
          </div>
        </SketchWindow>
      </Card>
      {/* 进门那一下：白闪 */}
      <div style={{ position: "absolute", left: -2000, top: -2000, width: 6000, height: 6000, background: "#fff", opacity: 1 - ramp(f, DIVE, DIVE + 6) }} />

      <Sfx at={0} name="whoosh" volume={0.45} />
      <Sfx at={signAt} name="coin" volume={0.35} />
      <Sfx at={guideAt} name="tick" volume={0.6} />
      <Sfx at={spit} name="blip" volume={0.45} />
      <Sfx at={spit + 6} name="blip_low" volume={0.4} />
      {SCRIPT.map((_, i) => (
        <Sfx key={i} at={typeStart + i * 6} name="type" volume={0.35} />
      ))}
    </>
  );
};

export const S06: SceneDef = {
  View: S06View,
  camAt: (c) => {
    if (c.f < DIVE) {
      const p = ease(ramp(c.f, 0, DIVE)) ;
      const s = 0.52 * Math.pow(16 / 0.52, p * p);
      return { x: 1480 + (WIN.x - 1480) * Math.min(1, p * 1.6), y: 540 + (WIN.y - 540) * Math.min(1, p * 1.6), s };
    }
    const q = ease(ramp(c.f, DIVE, DIVE + 20));
    return { x: 960, y: 540, s: 1.3 - 0.3 * q };
  },
  spots: (c) => [
    { at: 0, x: 960, y: 540, r: 600 },
    { at: DIVE, x: 800, y: 560, r: 520 },
    { at: c.at(1, 2), x: 680, y: 300, r: 460 },
    { at: c.w(1, "风格指南", -2), x: 1400, y: 400, r: 620 },
  ],
};

/* =============== 幕 7　风格指南 =============== */

const ROWS = ["语速 7.5 字 / 秒", "4 分钟 ≈ 1800 字", "开场 8 秒给反差", "结尾三步清单"];
const GW = { x: 560, y: 120, w: 1060, h: 640 };

const st7 = (c: SceneClock) => ({
  hoist: 0,
  checks: [c.w(0, "每秒", 4), c.w(0, "一千八百", 4), c.w(1, "八秒", 4), c.w(1, "三步", 4)],
  shrink: c.at(3, 0),
});

const Metronome: React.FC<{ f: number; on: boolean }> = ({ f, on }) => (
  <div style={{ position: "relative", width: 90, height: 90 }}>
    <div style={{ position: "absolute", left: 10, top: 70, width: 70, height: 16, background: "#5E3C26", boxShadow: `0 0 0 3px ${PAL.k}` }} />
    <div style={{ position: "absolute", left: 41, top: 6, width: 8, height: 66, background: PAL.k, transformOrigin: "50% 100%", transform: `rotate(${on ? Math.sin((f / 8) * Math.PI) * 28 : 0}deg)` }}>
      <div style={{ position: "absolute", left: -8, top: 8, width: 24, height: 16, background: C.red }} />
    </div>
  </div>
);

const S07View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st7(c);
  const sh = ease(ramp(f, s.shrink, s.shrink + 14));
  const guestNudge = ease(ramp(f, c.at(2, 0), c.at(2, 10))) * (1 - sh);
  const counter = Math.round(1800 * ease(ramp(f, s.checks[1] - 14, s.checks[1] + 6)));
  const watch = Math.min(8, Math.floor(Math.max(0, f - (s.checks[2] - 24)) / 3));
  const tx = interpolate(sh, [0, 1], [0, 470 - GW.x]) - guestNudge * 70;
  const ty = interpolate(sh, [0, 1], [0, 100 - GW.y]);
  const sc = interpolate(sh, [0, 1], [1, 0.38]) * (1 - guestNudge * 0.06);
  // 句 20：三根节奏柱一块块长高，然后按同一节拍一起跳
  const beat = 15;
  const barTop = (k: number) => {
    const grow = Math.floor(clamp01((f - s.shrink - 8 - k * 3) / 30) * 9);
    const bounce = f > s.shrink + 40 ? Math.abs(Math.sin(((f - s.shrink) / beat) * Math.PI)) * 22 : 0;
    return { blocks: grow, bounce };
  };
  return (
    <>
      <Interior f={f} dim={0.55} />
      <Crane f={f} at={-4} x={GW.x} y={GW.y} w={GW.w} h={GW.h} release={16}>
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: "0 0" }}>
          <SketchWindow w={GW.w} h={GW.h} title="风格指南.md" seed="guide">
            <div style={{ padding: "34px 44px", display: "flex", flexDirection: "column", gap: 40 }}>
              {ROWS.map((t, i) => (
                <div key={t} style={{ display: "flex", alignItems: "center", height: 84 }}>
                  <CheckRow text={t} p={ramp(f, s.checks[i], s.checks[i] + 8)} seed={`g${i}`} size={54} />
                </div>
              ))}
            </div>
            {/* 右侧小部件 */}
            <div style={{ position: "absolute", left: 760, top: 26 }}>
              <Metronome f={f} on={f >= s.checks[0] - 20} />
            </div>
            <div style={{ position: "absolute", left: 700, top: 150 }}>
              <PxScreen w={250} h={90} color="#FF9A4D">
                <span style={{ fontSize: 48, fontFamily: PX_MONO }}>{String(counter).padStart(4, "0")}</span>
              </PxScreen>
            </div>
            <div style={{ position: "absolute", left: 720, top: 274 }}>
              <PxScreen w={210} h={90} color="#7CF0A0">
                <span style={{ fontSize: 48, fontFamily: PX_MONO }}>{`${watch}″`}</span>
              </PxScreen>
            </div>
            <div style={{ position: "absolute", left: 720, top: 420, display: "flex", gap: 18 }}>
              {[0, 1, 2].map((k) => (
                <div key={k} style={{ width: 54, height: 54, background: f >= s.checks[3] + k * 5 ? C.green : "#D8D4C8", boxShadow: `0 0 0 4px ${PAL.k}` }} />
              ))}
            </div>
          </SketchWindow>
        </div>
      </Crane>
      {/* 句 19：背景里像素 DeepSeek 比 ✓ */}
      {f >= c.at(2, 0) && f < s.shrink && (
        <div style={{ position: "absolute", left: 470, top: 640, transform: `scale(${pop(f, c.at(2, 4))})` }}>
          <Pix map={DS_A} px={8} />
          <div style={{ position: "absolute", left: 120, top: -60 }}>
            <Pix map={ICON.check} px={7} />
          </div>
        </div>
      )}
      {[0, 1, 2].map((k) => {
        const b = barTop(k);
        if (f < s.shrink + 4) return null;
        const x = 840 + k * 300;
        return (
          <div key={k}>
            {Array.from({ length: b.blocks }).map((_, j) => (
              <div key={j} style={{ position: "absolute", left: x, top: 780 - (j + 1) * 54 - b.bounce * (j / 9), width: 150, height: 50, background: CAPS[k], boxShadow: `inset 0 -8px 0 rgba(0,0,0,0.25), 0 0 0 4px ${PAL.k}` }} />
            ))}
            <div style={{ position: "absolute", left: x - 10, top: 800, transform: `scale(${pop(f, s.shrink + 10 + k * 4)})` }}>
              <PxLabel size={36} bg="#F4EBDD">{`第 ${k + 1} 期`}</PxLabel>
            </div>
          </div>
        );
      })}
      {s.checks.map((t, i) => (
        <Sfx key={i} at={t} name="tick" volume={0.65} />
      ))}
      <Sfx at={0} name="slide" volume={0.4} />
      <Sfx at={16} name="chunk" volume={0.4} />
      <Sfx at={c.at(2, 4)} name="coin" volume={0.35} />
      {[0, 1, 2, 3].map((k) => (
        <Sfx key={`b${k}`} at={s.shrink + 40 + k * 15} name="kick" volume={0.3} />
      ))}
    </>
  );
};

export const S07: SceneDef = {
  View: S07View,
  cam: (c) => {
    const s = st7(c);
    return [
      { at: 0, x: 960, y: 540, s: 1 },
      { at: s.checks[0] - 18, x: 1020, y: 400, s: 1.22 },
      { at: s.checks[2] - 20, x: 1020, y: 580, s: 1.22 },
      { at: c.at(2, 0), x: 960, y: 540, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st7(c);
    return [
      { at: 0, x: 1090, y: 440, r: 620 },
      { at: s.checks[0] - 18, x: 1000, y: 280, r: 520 },
      { at: s.checks[2] - 20, x: 1000, y: 620, r: 520 },
      { at: c.at(2, 0), x: 1000, y: 440, r: 600 },
      { at: s.shrink, x: 1140, y: 620, r: 560 },
    ];
  },
};

/* =============== 幕 8　分镜工位 =============== */

const BOARD_LINES = ["这条两分钟的视频…", "三次？剪辑都不用？", "不用。每一帧…", "先说说以前…", "周六写稿…", "改一句台词…"];
const GRID = BOARD_LINES.map((_, i) => ({ x: 1310 + (i % 2) * 300, y: 130 + Math.floor(i / 2) * 200 }));

const MiniBoard: React.FC<{ i: number; w?: number; h?: number }> = ({ i, w = 270, h = 170 }) => (
  <div style={{ position: "relative", width: w, height: h, background: "#FBFAF5", padding: "12px 16px", boxSizing: "border-box" }}>
    <SketchRect w={w} h={h} seed={`mb${i}`} sw={3.5} />
    <div style={{ fontFamily: PX_FONT, fontSize: 24, color: PAL.k, background: CAPS[1], display: "inline-block", padding: "2px 8px" }}>{`L${String(i + 1).padStart(2, "0")}`}</div>
    <div style={{ marginTop: 10, fontFamily: HAND, fontSize: 28, color: INK, whiteSpace: "nowrap" }}>{BOARD_LINES[i]}</div>
    <div style={{ position: "absolute", left: 16, bottom: 14, display: "flex", gap: 8 }}>
      {[C.orange, C.blue, C.green].map((col) => (
        <div key={col} style={{ width: 56, height: 30, background: col, opacity: 0.75 }} />
      ))}
    </div>
  </div>
);

/** 切台：上方入口吞进口播稿，刀落三下，右侧出口吐出分镜卡 */
const Cutter: React.FC<{ f: number; chops: number[] }> = ({ f, chops }) => {
  const down = chops.some((t) => f >= t && f < t + 5);
  return (
    <div style={{ position: "absolute", left: 800, top: 330 }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 420, height: 360, background: "#4A505C", boxShadow: `inset 0 -16px 0 rgba(0,0,0,0.3), inset 0 10px 0 rgba(255,255,255,0.12), 0 0 0 5px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 60, top: -16, width: 300, height: 28, background: "#1B1E25", boxShadow: `0 0 0 5px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 420, top: 150, width: 70, height: 110, background: "#1B1E25", boxShadow: `0 0 0 5px ${PAL.k}` }} />
      {/* 刀 */}
      <div style={{ position: "absolute", left: 40, top: down ? 40 : -120, width: 340, height: 70, background: "#D8DCE3", boxShadow: `inset 0 -10px 0 #9AA0AA, 0 0 0 5px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 190, top: down ? -90 : -250, width: 40, height: 130, background: "#6E7480", boxShadow: `0 0 0 5px ${PAL.k}` }} />
      <div style={{ position: "absolute", left: 40, top: 150, display: "flex", gap: 16 }}>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{ width: 40, height: 40, background: f % 20 < 10 === (k % 2 === 0) ? C.yellow : "#2A2E37", boxShadow: `0 0 0 4px ${PAL.k}` }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 120, top: 250 }}>
        <PxLabel size={36} bg={C.yellow}>分镜</PxLabel>
      </div>
      <div style={{ position: "absolute", left: -120, top: 260 }}>
        <Worker cap={C.yellow} px={9} f={f} up={down} />
      </div>
    </div>
  );
};

const st8 = (c: SceneClock) => {
  const feed = c.w(0, "拆成", -10);
  const chops = [feed + 22, feed + 32, feed + 42];
  const outAt = BOARD_LINES.map((_, i) => Math.min(c.at(1, 0) - 30 + i, c.w(0, "一句话", -16) + i * 7));
  const zoom = c.at(1, 4);
  const cols = [c.w(1, "谁在说", -4), c.w(1, "做什么", -4), c.w(1, "配什么", -4)];
  return { feed, chops, outAt, zoom, cols };
};

const S08View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st8(c);
  // 口播稿卡片：从左边滑到入口上方，然后往下被吞进去（被入口遮住）
  const slideIn = ease(ramp(f, s.feed - 18, s.feed));
  const sink = ease(ramp(f, s.feed, s.chops[2] + 4));
  const cardX = interpolate(slideIn, [0, 1], [-500, 870]);
  const cardY = 60 + sink * 320;
  return (
    <>
      <Cutter f={f} chops={s.chops} />
      {sink < 1 && (
        <div style={{ position: "absolute", left: cardX, top: 0, width: 300, height: 330, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: cardY, transform: `rotate(${(1 - slideIn) * -8}deg)` }}>
            <SketchWindow w={280} h={230} title="口播稿" seed="mini-script">
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {[0.9, 0.7, 0.85, 0.6].map((k, i) => (
                  <div key={i} style={{ width: `${k * 100}%`, height: 10, background: "#8D8A80" }} />
                ))}
              </div>
            </SketchWindow>
          </div>
        </div>
      )}
      {BOARD_LINES.map((_, i) => {
        const at = s.outAt[i];
        if (f < at) return null;
        const p = ease(ramp(f, at, at + 12));
        const x = interpolate(p, [0, 1], [1220, GRID[i].x]);
        const y = interpolate(p, [0, 1], [480, GRID[i].y]) - Math.sin(p * Math.PI) * 120;
        const fade = f >= s.zoom ? 1 - ease(ramp(f, s.zoom, s.zoom + 8)) * (i === 0 ? 1 : 0.75) : 1;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: `scale(${0.4 + 0.6 * p}) rotate(${(i % 3) - 1}deg)`, transformOrigin: "0 0", opacity: fade }}>
            <MiniBoard i={i} />
          </div>
        );
      })}
      {/* 句 22：第一张分镜卡放大，三栏依次弹出 */}
      <Card x={480} y={110} w={1360} h={620} at={s.zoom} enter="pop" exit="none" shadow="16px 18px 0 rgba(0,0,0,0.45)">
        <div style={{ position: "relative", width: 1360, height: 620, background: "#FBFAF5" }}>
          <SketchRect w={1360} h={620} seed="bigboard" sw={5} />
          <div style={{ position: "absolute", left: 34, top: 26, display: "flex", alignItems: "center", gap: 20 }}>
            <PxLabel size={36} bg={C.yellow}>L01</PxLabel>
            <span style={{ fontFamily: HAND, fontSize: 42, color: INK }}>这条两分钟的视频，从写稿到出片……</span>
          </div>
          {["谁在说", "做什么动作", "配什么画面"].map((t, k) => {
            const p = pop(f, s.cols[k]);
            return (
              <div key={t} style={{ position: "absolute", left: 40 + k * 440, top: 120, width: 400, height: 460, transform: `scale(${p})`, opacity: clamp01(p * 3) }}>
                <SketchRect w={400} h={460} seed={`col${k}`} sw={4} />
                <div style={{ position: "absolute", left: 0, top: 18, width: 400, textAlign: "center", fontFamily: SANS, fontWeight: 900, fontSize: 44, color: INK }}>{t}</div>
                <div style={{ position: "absolute", left: 40, top: 100, width: 320, height: 320, overflow: "hidden", background: ["#FCE3D3", "#E3ECFD", "#22252C"][k] }}>
                  {k === 0 && <Img src={staticFile("characters/host_count_three_a.png")} style={{ position: "absolute", width: 760, left: -200, top: -10 }} />}
                  {k === 1 && <Img src={staticFile("characters/host_point_right_a.png")} style={{ position: "absolute", width: 300, left: 10, top: 0 }} />}
                  {k === 2 && (
                    <>
                      <div style={{ position: "absolute", left: 60, top: 70, width: 200, height: 130, background: "#1B1E25", boxShadow: `0 0 0 4px ${PAL.k}` }}>
                        <div style={{ fontFamily: PX_MONO, color: "#FF9A4D", fontSize: 72, textAlign: "center", lineHeight: "130px" }}>3</div>
                      </div>
                      <div style={{ position: "absolute", left: 0, top: 240, width: 320, height: 50, background: "repeating-linear-gradient(90deg, #3A3D45 0 60px, #4D6BFE 60px 66px)" }} />
                    </>
                  )}
                </div>
                <div style={{ position: "absolute", left: 20, bottom: 14, fontFamily: PX_FONT, fontSize: 24, color: "#6E6E73" }}>{["speaker: host", "sprite: count_three", "scene: S01"][k]}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <Arrow x1={560} y1={300} x2={360} y2={330} p={ramp(f, s.cols[0] + 8, s.cols[0] + 20)} color={C.yellow} bend={60} />

      <Sfx at={0} name="whoosh" volume={0.5} />
      <Sfx at={s.feed - 18} name="slide" volume={0.4} />
      {s.chops.map((t, i) => (
        <Sfx key={i} at={t} name="chunk" volume={0.55} />
      ))}
      {s.outAt.map((t, i) => (
        <Sfx key={`o${i}`} at={t} name="blip" volume={0.3} />
      ))}
      <Sfx at={s.zoom} name="pop" volume={0.45} />
      {s.cols.map((t, i) => (
        <Sfx key={`c${i}`} at={t} name="pop" volume={0.45} />
      ))}
    </>
  );
};

export const S08: SceneDef = {
  View: S08View,
  cam: (c) => {
    const s = st8(c);
    return [
      { at: 0, x: 2600, y: 540, s: 1 },
      { at: 1, x: 1010, y: 520, s: 1, whip: 1 },
      { at: s.feed + 10, x: 1080, y: 500, s: 1.15 },
      { at: s.zoom, x: 960, y: 540, s: 1 },
    ];
  },
  spots: (c) => {
    const s = st8(c);
    return [
      { at: 0, x: 1000, y: 470, r: 560 },
      { at: s.outAt[0], x: 1400, y: 420, r: 620 },
      { at: s.zoom, x: 1160, y: 420, r: 640 },
      ...s.cols.map((t, k) => ({ at: t, x: 720 + k * 440, y: 470, r: 440 })),
    ];
  },
  shake: (c) => st8(c).chops,
};

/* =============== 幕 9　一个文件管全部 =============== */

const JSON_LINES: Tok[][] = [
  [["{"]],
  [['  "id"', "a"], [": "], ['"L01"', "s"], [","]],
  [['  "speaker"', "a"], [": "], ['"host"', "s"], [","]],
  [['  "sprite"', "a"], [": "], ['"count_three"', "s"], [","]],
  [['  "text"', "a"], [": "], ['"这条两分钟的视频…"', "s"], [","]],
  [['  "scene"', "a"], [": "], ['"S01"', "s"], [","]],
  [['  "frames"', "a"], [": "], ["136", "n"]],
  [["}"]],
];
const JW = { x: 600, y: 110, w: 960, h: 600 };
const LINE_H = 36 * 1.5;

const S09View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const landAt = JSON_LINES.map((_, i) => 14 + i * Math.floor((c.at(1, 0) - 24) / JSON_LINES.length));
  const pull = ease(ramp(f, c.at(1, 0), c.at(1, 18)));
  const sc = interpolate(pull, [0, 1], [1, 0.6]);
  const jx = interpolate(pull, [0, 1], [0, 1150 - (JW.x + JW.w * 0.3)]);
  const jy = interpolate(pull, [0, 1], [0, 90 - JW.y]);
  const houseY = 700;
  const hx = (i: number) => 520 + i * 280;
  const lineAt = (i: number) => c.w(1, "所有", 0) + i * 5;
  const hold = c.w(1, "只认", 0);
  return (
    <>
      {/* 上一幕留下的分镜卡：碎成方块落进 episode.json */}
      {BOARD_LINES.map((_, i) => (
        <Card
          key={i}
          x={GRID[i].x - 120}
          y={GRID[i].y - 20}
          w={270}
          h={170}
          at={0}
          out={2 + i * 3}
          enter="none"
          exit="pixel"
          cell={30}
          seed={`mb-out${i}`}
          toPt={[JW.x + 300 - (GRID[i].x - 120), JW.y + 120 - (GRID[i].y - 20)]}
          colors={["#FBFAF5", C.yellow, C.blue, C.orange]}
        >
          <MiniBoard i={i} />
        </Card>
      ))}
      <div style={{ position: "absolute", left: JW.x, top: JW.y, transform: `translate(${jx}px, ${jy}px) scale(${sc})`, transformOrigin: "0 0" }}>
        <Card x={0} y={0} w={JW.w} h={JW.h} at={0} enter="open" exit="none">
          <CodeWin
            w={JW.w}
            h={JW.h}
            title="episode.json"
            lines={JSON_LINES}
            shown={landAt.map((t) => (f >= t ? 1 : 0))}
            size={36}
            lineH={1.5}
            hi={landAt.map((t) => (f >= t ? 1 - ramp(f, t, t + 14) : 0))}
          />
        </Card>
        {/* 方块雨：每一行落下一串方块 */}
        {landAt.map((t, i) =>
          Array.from({ length: 7 }).map((_, k) => {
            const lt = f - (t - 10) - k;
            if (lt < 0 || lt > 10) return null;
            const y = interpolate(lt, [0, 10], [-260, 78 + i * LINE_H + 10], { easing: (q) => q * q });
            return <div key={`${i}-${k}`} style={{ position: "absolute", left: 120 + k * 44 + (i % 3) * 30, top: y, width: 30, height: 30, background: [C.yellow, C.blue, "#B8E986", "#FF7B9C"][(i + k) % 4], boxShadow: `0 0 0 3px ${PAL.k}` }} />;
          }),
        )}
      </div>
      {/* 句 24：五个工位围着这个文件 */}
      {f >= c.at(1, 0) &&
        CAPS.map((cap, i) => {
          const p = pop(f, c.at(1, 4) + i * 3);
          const lift = f >= hold + i * 2;
          return (
            <div key={i}>
              <div style={{ position: "absolute", left: hx(i), top: houseY, transform: `scale(${p})`, transformOrigin: "50% 100%" }}>
                <House roof={cap} px={10} lit={1} />
              </div>
              <div style={{ position: "absolute", left: hx(i) + 150, top: houseY + 40 - (lift ? 16 : 0), transform: `scale(${p})` }}>
                <Worker cap={cap} px={6} f={f + i * 2} up={lift} />
                {lift && (
                  <div style={{ position: "absolute", left: 2, top: -54 }}>
                    <Pix map={ICON.doc} px={5} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      {f >= c.at(1, 0) && (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          {CAPS.map((cap, i) => {
            const p = ramp(f, lineAt(i), lineAt(i) + 8);
            const x1 = 1150;
            const y1 = 90 + JW.h * 0.6;
            const x2 = hx(i) + 100;
            const y2 = houseY - 10;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x1 + (x2 - x1) * p}
                y2={y1 + (y2 - y1) * p}
                stroke={cap}
                strokeWidth={8}
                strokeDasharray="18 14"
                strokeDashoffset={-f * 2}
                opacity={p > 0 ? 1 : 0}
              />
            );
          })}
        </svg>
      )}
      {f >= hold && (
        <div style={{ position: "absolute", left: 1370, top: 180, transform: `scale(${pop(f, hold)}) rotate(3deg)` }}>
          <PxLabel size={48} bg={C.red} color="#fff">
            只认这一个文件
          </PxLabel>
        </div>
      )}
      {landAt.map((t, i) => (
        <Sfx key={i} at={t} name="tick" volume={0.45} />
      ))}
      <Sfx at={2} name="shatter" volume={0.4} />
      {CAPS.map((_, i) => (
        <Sfx key={`w${i}`} at={lineAt(i)} name="whoosh" volume={0.2} />
      ))}
      <Sfx at={hold} name="stamp" volume={0.45} />
    </>
  );
};

export const S09: SceneDef = {
  View: S09View,
  cam: (c) => [
    { at: 0, x: 1080, y: 470, s: 1.12 },
    { at: c.at(1, 0), x: 960, y: 540, s: 1 },
  ],
  spots: (c) => [
    { at: 0, x: 1080, y: 410, r: 620 },
    { at: c.at(1, 0), x: 1150, y: 330, r: 420 },
    { at: c.at(1, 20), x: 1150, y: 520, r: 720 },
  ],
};

export { Burst };
