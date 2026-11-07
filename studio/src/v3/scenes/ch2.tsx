import { C } from "../../ref/kit";
import { track } from "../cam";
import { Sfx, useScene, type SceneClock, type SceneDef } from "../ctx";
import { Burst, CAT, ICON, PAL, Pix, PxLabel } from "../pixel";
import { BELT_Y, FLAG_NAMES, FLAG_X, Factory, HOUSE_W, HOUSE_X, STATIONS, clamp01, ease, pop, ramp } from "../common";

/** 分段路径：keys = [帧, 值]，每段在 len 帧内缓动到位后停住 */
export const stepPath = (f: number, keys: [number, number][], len = 10) => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t, x] = keys[i];
    if (f < t - len) break;
    const prev = keys[i - 1][1];
    v = prev + (x - prev) * ease(ramp(f, t - len, t));
  }
  return v;
};

/** 世界坐标 → 屏幕坐标 */
const toScreen = (cam: { x: number; y: number; s: number }, x: number, y: number) => ({ x: (x - cam.x) * cam.s + 960, y: (y - cam.y) * cam.s + 540 });

/* =============== 幕 4　工厂全景 =============== */

const st4 = (c: SceneClock) => {
  const houseAt = HOUSE_X.map((_, i) => c.at(0, 0.12 + i * 0.12));
  const putAt = c.w(1, "送进去", -6);
  const arrive = STATIONS.map((s) => c.w(2, s, -2));
  const endAt = c.w(2, "一支视频", -2);
  const keys: [number, number][] = [
    [0, 260],
    [putAt + 10, 330],
    [c.at(1, 0.95), 520],
    ...arrive.map((t, i) => [t, HOUSE_X[i] + HOUSE_W / 2] as [number, number]),
    [endAt, 3300],
  ];
  return { houseAt, putAt, arrive, endAt, keys };
};

const pkgAt = (c: SceneClock, f: number) => {
  const s = st4(c);
  return stepPath(f, s.keys, 9);
};

const cam4 = (c: SceneClock, f: number) => {
  // 句 9 宽景看全厂；句 10 推近到左边入口；句 11 拉开一些，跟着包裹横移
  const wide = { x: 1480, y: 520, s: 0.52 };
  const p10 = ease(ramp(f, c.at(1, 0), c.at(1, 0) + 24));
  const p11 = ease(ramp(f, c.at(2, 0), c.at(2, 0) + 18));
  const px = pkgAt(c, f);
  const near = { x: Math.max(900, px + 420), y: 560, s: 1 };
  const follow = { x: Math.min(2350, Math.max(1350, px + 250)), y: 560, s: 0.62 };
  const a = { x: wide.x + (near.x - wide.x) * p10, y: wide.y + (near.y - wide.y) * p10, s: wide.s + (near.s - wide.s) * p10 };
  return { x: a.x + (follow.x - a.x) * p11, y: a.y + (follow.y - a.y) * p11, s: a.s + (follow.s - a.s) * p11 };
};

const S04View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st4(c);
  const x = pkgAt(c, f);
  const passed = s.arrive.filter((t) => f >= t).length;
  const pkgOn = f >= s.putAt;
  const drop = pkgOn ? ease(ramp(f, s.putAt, s.putAt + 8)) : 0;
  return (
    <>
      <Factory
        f={f}
        st={{
          houseAt: s.houseAt,
          signAt: s.arrive,
          actAt: s.arrive,
          pkgX: pkgOn ? x : null,
          pkgForm: passed,
          lit: s.arrive.map((t) => (f >= t ? 1 : 0)),
        }}
      />
      {/* 包裹被放上传送带：从上方落下 */}
      {pkgOn && drop < 1 && <div style={{ position: "absolute", left: x - 60, top: BELT_Y - 260 + drop * 150, width: 120, height: 10, background: "rgba(0,0,0,0.25)" }} />}
      <Burst x={3300} y={BELT_Y - 80} f={f} at={s.endAt} n={22} seed="mp4" size={22} power={1.4} stars />
      {s.houseAt.map((t, i) => (
        <Sfx key={i} at={t} name="blip" volume={0.35 + i * 0.04} />
      ))}
      <Sfx at={s.putAt} name="chunk" volume={0.5} />
      {s.arrive.map((t, i) => (
        <Sfx key={`a${i}`} at={t} name={i % 2 ? "stamp" : "chunk"} volume={0.35} />
      ))}
      <Sfx at={s.endAt} name="levelup" volume={0.45} />
    </>
  );
};

export const S04: SceneDef = {
  View: S04View,
  camAt: (c) => cam4(c, c.f),
  spots: (c) => {
    const out = [];
    for (let t = 0; t < c.dur; t += 6) {
      const cam = cam4(c, t);
      const p = toScreen(cam, pkgAt(c, t), BELT_Y - 120);
      const wideP = t < c.at(1, 0);
      out.push({ at: t, x: wideP ? 1120 : p.x, y: wideP ? 520 : p.y, r: wideP ? 760 : 520 });
    }
    return out;
  },
};

/* =============== 幕 5　你是厂长 =============== */

const CAM5 = { x: 1480, y: 540, s: 0.52 };

const st5 = (c: SceneClock) => {
  const flagAt = [c.w(1, "审稿", -4), c.w(1, "审素材", -4), c.w(1, "审片", -4)];
  const stampAt = flagAt.map((t, i) => (i < 2 ? Math.min(t + 12, flagAt[i + 1] - 2) : t + 12));
  return { flagAt, stampAt, bossAt: c.w(1, "厂长", -4), fast: c.w(2, "代码", -4) };
};

const S05View: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st5(c);
  const speed = f >= s.fast ? 2.2 : 1;
  // 厂长猫头：在三面旗子之间跳
  let bx = FLAG_X[0] - 260;
  let by = BELT_Y - 150;
  let k = -1;
  s.stampAt.forEach((t, i) => {
    if (f >= t - 10) k = i;
  });
  if (k >= 0) {
    const t0 = s.stampAt[k] - 10;
    const from = k === 0 ? FLAG_X[0] - 260 : FLAG_X[k - 1] + 120;
    const to = FLAG_X[k] + 120;
    const q = ramp(f, t0, t0 + 10);
    bx = from + (to - from) * q;
    by = BELT_Y - 150 - Math.sin(q * Math.PI) * 260;
  }
  const bossP = pop(f, s.bossAt);
  return (
    <>
      <Factory
        f={f}
        st={{ signAt: [-1, -1, -1, -1, -1], lit: [1, 1, 1, 1, 1], flagAt: s.flagAt, flagPx: 16, flagLit: s.stampAt.map((t) => (f >= t ? 1 : 0)), speed }}
      />
      {bossP > 0 && (
        <div style={{ position: "absolute", left: bx - 65, top: by - 60, transform: `scale(${bossP})`, transformOrigin: "50% 100%" }}>
          <div style={{ position: "absolute", left: 10, top: -78 }}>
            <PxLabel size={36} bg={C.orange} color="#fff">
              厂长
            </PxLabel>
          </div>
          <Pix map={CAT} px={13} />
        </div>
      )}
      {s.stampAt.map((t, i) =>
        f >= t ? (
          <div key={i} style={{ position: "absolute", left: FLAG_X[i] + 4, top: BELT_Y - 13 * 16 - 190, transform: `scale(${1 + 1.4 * Math.exp(-(f - t) / 3)})` }}>
            <Pix map={ICON.check} px={13} />
          </div>
        ) : null,
      )}
      {s.stampAt.map((t, i) => (
        <Burst key={i} x={FLAG_X[i] + 70} y={BELT_Y - 230} f={f} at={t} n={12} seed={`st${i}`} colors={[C.green, "#fff", C.yellow]} size={20} />
      ))}
      {s.flagAt.map((t, i) => (
        <Sfx key={`f${i}`} at={t} name="kick" volume={0.45} />
      ))}
      {s.stampAt.map((t, i) => (
        <Sfx key={`s${i}`} at={t} name="stamp" volume={0.55} />
      ))}
      <Sfx at={s.bossAt} name="coin" volume={0.35} />
      <Sfx at={s.fast} name="riser" volume={0.35} />
    </>
  );
};

/** 屏幕上方三块关卡牌：盖章时依次点亮；最后一句弹出「其余：代码在干」 */
const S05Overlay: React.FC = () => {
  const c = useScene();
  const f = c.f;
  const s = st5(c);
  return (
    <>
      <div style={{ position: "absolute", left: 470, top: 120, display: "flex", gap: 30 }}>
        {FLAG_NAMES.map((n, i) => {
          const p = pop(f, s.flagAt[i]);
          const lit = f >= s.stampAt[i];
          return (
            <div key={n} style={{ transform: `scale(${p})`, opacity: clamp01(p * 3) }}>
              <PxLabel size={48} bg={lit ? C.red : "#3A3D45"} color="#fff">
                {`0${i + 1} ${n}${lit ? " ✓" : ""}`}
              </PxLabel>
            </div>
          );
        })}
      </div>
      {f >= s.fast && (
        <div style={{ position: "absolute", left: 1260, top: 112, transform: `scale(${pop(f, s.fast)}) rotate(-3deg)` }}>
          <PxLabel size={48} bg={C.yellow}>
            其余：代码在干
          </PxLabel>
        </div>
      )}
    </>
  );
};

const cam5Keys = (c: SceneClock) => {
  const s = st5(c);
  const S = 0.92;
  const at = (x: number) => ({ x: x - (1120 - 960) / S, y: BELT_Y - 180, s: S });
  return [
    { at: 0, x: 2350, y: 560, s: 0.62 },
    { at: 2, ...CAM5 },
    ...s.flagAt.map((t, i) => ({ at: t - 6, ...at(FLAG_X[i] + 70), whip: i > 0 ? 1 : 0 })),
    { at: s.stampAt[2] + 14, ...CAM5 },
  ];
};

export const S05: SceneDef = {
  View: S05View,
  Overlay: S05Overlay,
  cam: cam5Keys,
  spots: (c) => {
    const s = st5(c);
    const keys = cam5Keys(c);
    const out = [{ at: 0, x: 1150, y: 520, r: 700 }];
    for (let t = s.flagAt[0] - 6; t < s.stampAt[2] + 14; t += 4) {
      const cam = track(t, keys) as unknown as { x: number; y: number; s: number };
      let k = 0;
      s.flagAt.forEach((ft, i) => {
        if (t >= ft - 6) k = i;
      });
      const p = toScreen(cam, FLAG_X[k] + 70, BELT_Y - 150);
      out.push({ at: t, x: p.x, y: p.y, r: 480 });
    }
    out.push({ at: s.stampAt[2] + 14, x: 1150, y: 420, r: 720 });
    return out;
  },
  shake: (c) => st5(c).stampAt,
};

export { PAL };
