import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { CAM0, SPOT_SPRING, camTransform, shakeAt, track, type CamState } from "./cam";
import { SceneProvider, makeClock, type Mark, type SceneDef, type Spot } from "./ctx";
import { Backdrop, GuestLayer, HostLayer, ProgressBar, Subtitle, guestPresence, type Cue } from "./layers";
import { SCENES } from "./scenes";

export const ep3Schema = z.object({
  id: z.string(),
  title: z.string(),
  chapters: z.array(z.string()),
  bgm: z.string().optional(),
  lines: z.array(
    z.object({
      id: z.string(),
      chapter: z.number(),
      scene: z.string(),
      speaker: z.enum(["host", "guest"]),
      sprite: z.string(),
      text: z.string(),
      frames: z.number().int().positive(),
      audio: z.string(),
      audioStart: z.number(),
      audioEnd: z.number(),
      mouth: z.string(),
      chars: z.array(z.number()).optional(),
    }),
  ),
});
export type Ep3Props = z.infer<typeof ep3Schema>;

type Line = Ep3Props["lines"][number];
type Block = { id: string; start: number; dur: number; beats: number[]; ends: number[]; marks: Mark[]; def: SceneDef };

const build = (lines: Line[]) => {
  const starts: number[] = [];
  let t = 0;
  for (const l of lines) {
    starts.push(t);
    t += l.frames;
  }
  const blocks: Block[] = [];
  lines.forEach((l, i) => {
    let b = blocks[blocks.length - 1];
    if (!b || b.id !== l.scene) {
      const def = SCENES[l.scene];
      if (!def) throw new Error(`没有实现幕 ${l.scene}`);
      b = { id: l.scene, start: starts[i], dur: 0, beats: [], ends: [], marks: [], def };
      blocks.push(b);
    }
    b.beats.push(starts[i] - b.start);
    b.ends.push(starts[i] - b.start + l.frames);
    b.marks.push({ text: l.text, chars: l.chars ?? [] });
    b.dur = starts[i] - b.start + l.frames;
  });
  return { starts, total: t, blocks };
};

const clockOf = (b: Block, lf: number) => makeClock(lf, b.beats, b.ends, b.dur, b.marks);

const camOf = (b: Block, lf: number): CamState => {
  if (b.def.camAt) return b.def.camAt(clockOf(b, lf));
  const keys = b.def.cam?.(clockOf(b, lf));
  return keys && keys.length ? (track(lf, keys) as unknown as CamState) : CAM0;
};

const SceneHost: React.FC<{ b: Block }> = ({ b }) => {
  const lf = useCurrentFrame();
  const clock = clockOf(b, lf);
  const cam = camOf(b, lf);
  const sh = shakeAt(lf, b.def.shake?.(clock) ?? []);
  const V = b.def.View;
  const O = b.def.Overlay;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: camTransform(cam, sh) }}>
        <SceneProvider clock={clock}>
          <V />
        </SceneProvider>
      </div>
      {O && (
        <SceneProvider clock={clock}>
          <O />
        </SceneProvider>
      )}
    </AbsoluteFill>
  );
};

export const Episode3: React.FC<Ep3Props> = ({ lines, chapters, bgm }) => {
  const f = useCurrentFrame();
  const { starts, total, blocks } = build(lines);

  // 当前句
  let li = 0;
  for (let i = 0; i < starts.length; i++) if (f >= starts[i]) li = i;
  const line = lines[li];

  // 章节范围
  const ranges: [number, number][] = chapters.map((_, ci) => {
    const idx = lines.map((l, i) => (l.chapter === ci ? i : -1)).filter((i) => i >= 0);
    return [starts[idx[0]], starts[idx[idx.length - 1]] + lines[idx[idx.length - 1]].frames];
  });

  // 人物口型时间表
  const hostCues: Cue[] = [];
  const guestCues: Cue[] = [];
  lines.forEach((l, i) => (l.speaker === "host" ? hostCues : guestCues).push({ start: starts[i], frames: l.frames, sprite: l.sprite, mouth: l.mouth }));

  // 聚光：所有幕的主焦点关键帧拼成一条全局轨道，换幕时也是弹簧跟过去
  const spotKeys = blocks.flatMap((b) =>
    b.def.spots(clockOf(b, 0)).map((k) => ({ ...k, at: k.at + b.start })),
  );
  const main = track(f, spotKeys.length ? spotKeys : [{ at: 0, x: 1100, y: 450, r: 500 }], SPOT_SPRING);
  const hostTalk = line.speaker === "host" ? 1 : 0.45;
  const g = guestPresence(guestCues, f);
  const spots: Spot[] = [
    { x: main.x, y: main.y, r: main.r, a: 1 },
    { x: 230, y: 560, r: 440, a: hostTalk },
    { x: 1690, y: 640, r: 420 * g, a: g },
  ];

  const blk = blocks.find((b) => f >= b.start && f < b.start + b.dur) ?? blocks[blocks.length - 1];
  const cam = camOf(blk, f - blk.start);

  const fadeOut = interpolate(f, [total - 45, total - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#16171B" }}>
      <Backdrop spots={spots} drift={(cam.x - 960) * 0.25} />

      {blocks.map((b) => (
        <Sequence key={b.id} from={b.start} durationInFrames={b.dur} name={b.id}>
          <SceneHost b={b} />
        </Sequence>
      ))}

      <HostLayer cues={hostCues} />
      <GuestLayer cues={guestCues} />

      <Subtitle key={line.id} text={line.text} lf={f - starts[li]} speaker={line.speaker} />
      <ProgressBar chapters={chapters} ranges={ranges} total={total} />

      {lines.map((l, i) => (
        <Sequence key={l.id} from={starts[i]} durationInFrames={l.frames} name={`voice ${l.id}`} layout="none">
          <Audio src={staticFile(l.audio)} trimBefore={Math.round(l.audioStart * 30)} trimAfter={Math.round(l.audioEnd * 30)} />
        </Sequence>
      ))}
      {bgm && (
        <Audio
          src={staticFile(bgm)}
          loop
          volume={(fr) => 0.1 * interpolate(fr, [0, 20], [0, 1], { extrapolateRight: "clamp" }) * interpolate(fr, [total - 60, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}
      <AbsoluteFill style={{ background: "#000", opacity: 1 - fadeOut, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
