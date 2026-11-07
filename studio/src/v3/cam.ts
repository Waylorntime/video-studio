import { spring, type SpringConfig } from "remotion";

/**
 * 关键帧 + 弹簧：每到一个关键帧，就用弹簧从上一个值过渡到这个值。
 * 多段过渡可以叠在一起（前一段没走完就开始下一段），始终连续。
 */
export type Key = { at: number } & Record<string, number>;

export const CAM_SPRING: SpringConfig = { damping: 22, stiffness: 70, mass: 1, overshootClamping: false };
export const SPOT_SPRING: SpringConfig = { damping: 20, stiffness: 120, mass: 0.8, overshootClamping: false };
export const WHIP: SpringConfig = { damping: 26, stiffness: 260, mass: 0.7, overshootClamping: true };

export const track = <T extends Key>(f: number, keys: T[], cfg: SpringConfig = CAM_SPRING): T => {
  // 关键帧里写 whip: 1 表示这一段用甩镜（快速、不过冲）
  const out = { ...keys[0] } as Record<string, number>;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i] as Record<string, number>;
    if (f < k.at) break;
    const p = spring({ frame: f - k.at, fps: 30, config: k.whip ? WHIP : cfg });
    const prev = keys[i - 1] as Record<string, number>;
    for (const name of Object.keys(k)) {
      if (name === "at" || name === "whip") continue;
      const a = prev[name] ?? keys[0][name];
      out[name] = out[name] + (k[name] - a) * p;
    }
  }
  return out as T;
};

/** 镜头：场景里的点 (x, y) 放在屏幕中心，放大 s 倍 */
export type CamState = { x: number; y: number; s: number };
export const CAM0: CamState = { x: 960, y: 540, s: 1 };

export const camTransform = (c: CamState, shake: [number, number] = [0, 0]) =>
  `translate(${960 + shake[0]}px, ${540 + shake[1]}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`;

/** 震屏：在 at 帧起 len 帧内小幅抖动 */
export const shakeAt = (f: number, ats: number[], amp = 10, len = 9): [number, number] => {
  let x = 0;
  let y = 0;
  for (const a of ats) {
    const t = f - a;
    if (t < 0 || t >= len) continue;
    const k = 1 - t / len;
    x += Math.sin(t * 2.9 + a) * amp * k;
    y += Math.cos(t * 3.7 + a) * amp * 0.7 * k;
  }
  return [x, y];
};
