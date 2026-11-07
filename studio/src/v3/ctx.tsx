import { createContext, useContext } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { ClockCtx } from "../flow/clock";

/**
 * 场景时钟：一幕横跨好几句台词，动画在整幕里连续，不随换句重置。
 * f = 本幕第几帧；beats[i] / ends[i] = 本幕第 i 句的起止帧。
 */
export type SceneClock = {
  f: number;
  dur: number;
  beats: number[];
  ends: number[];
  /** 第 i 句开始后的第 k 帧；frac 为 0–1 时取这句时长的比例 */
  at: (i: number, k?: number) => number;
  /** 当前正在说第几句 */
  line: number;
  /** 第 i 句里说到 word 第一个字的那一帧（本幕帧号）；找不到时退回句首。k 为额外偏移 */
  w: (i: number, word: string, k?: number) => number;
};

export type Mark = { text: string; chars: number[] };
const normChars = (t: string) => Array.from(t.replace(/\*\*/g, "").toLowerCase()).filter((ch) => /[\p{L}\p{N}]/u.test(ch));

export const SceneCtx = createContext<SceneClock>({
  f: 0,
  dur: 1,
  beats: [0],
  ends: [1],
  at: () => 0,
  line: 0,
  w: () => 0,
});

export const useScene = () => useContext(SceneCtx);

export const makeClock = (f: number, beats: number[], ends: number[], dur: number, marks: Mark[] = []): SceneClock => {
  let line = 0;
  for (let i = 0; i < beats.length; i++) if (f >= beats[i]) line = i;
  return {
    f,
    dur,
    beats,
    ends,
    line,
    at: (i, k = 0) => {
      const b = beats[Math.min(i, beats.length - 1)];
      const e = ends[Math.min(i, ends.length - 1)];
      return k > 0 && k < 1 ? Math.round(b + (e - b) * k) : b + k;
    },
    w: (i, word, k = 0) => {
      const m = marks[i];
      const b = beats[Math.min(i, beats.length - 1)];
      if (!m) return b + k;
      const hay = normChars(m.text).join("");
      const idx = hay.indexOf(normChars(word).join(""));
      if (idx < 0) return b + k;
      return b + (m.chars[Array.from(hay.slice(0, idx)).length] ?? 0) + k;
    },
  };
};

/** 同时给卡片（ClockCtx）和场景用的时钟 */
export const SceneProvider: React.FC<{ clock: SceneClock; children: React.ReactNode }> = ({ clock, children }) => (
  <SceneCtx.Provider value={clock}>
    <ClockCtx.Provider value={{ f: clock.f, dur: clock.dur }}>{children}</ClockCtx.Provider>
  </SceneCtx.Provider>
);

/** 在本幕第 at 帧播一个音效（public/sfx/<name>.wav） */
export const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.5 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** 聚光点：背景网纹只在这些点周围亮起（整幅画面坐标） */
export type Spot = { x: number; y: number; r: number; a?: number };

/**
 * 一幕的定义。cam / spots 返回关键帧（帧号是本幕内的帧），由外层统一用弹簧插值。
 * cam：x, y = 场景里放到屏幕中心的点，s = 放大倍数（场景坐标就是 1920×1080 的画面坐标）
 * spots：主焦点（屏幕坐标）x, y, r
 * shake：震屏的帧
 */
export type SceneDef = {
  /** 直接给出镜头（跟拍时用），优先于 cam 关键帧 */
  camAt?: (c: SceneClock) => { x: number; y: number; s: number };
  cam?: (c: SceneClock) => ({ at: number; x: number; y: number; s: number; whip?: number })[];
  spots: (c: SceneClock) => { at: number; x: number; y: number; r: number }[];
  shake?: (c: SceneClock) => number[];
  View: React.FC;
  /** 不跟镜头走的屏幕层（标题牌、计数器） */
  Overlay?: React.FC;
};
