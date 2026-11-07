"""生成音效库到 studio/public/sfx/<名字>.wav，场景里用 <Sfx at={帧} name="pop" /> 放在动作发生的那一帧。

全部用代码合成（正弦、方波、噪声 + 包络），不依赖任何音频素材，可以随项目一起开源。
用法：python pipeline/sfx_lib.py
"""
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "studio/public/sfx"
SR = 48000


def t_axis(length):
    return np.arange(int(length * SR)) / SR


def env(n, attack=0.002, decay=0.1):
    """快速起音 + 指数衰减"""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / max(decay, 1e-4))


def sine(freqs, length, decay, attack=0.002):
    t = t_axis(length)
    sig = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    return sig * env(len(t), attack, decay)


def square(freqs, length, decay=0.08, duty=0.5):
    t = t_axis(length)
    sig = sum(np.where((t * f) % 1 < duty, 1.0, -1.0) for f in freqs) / len(freqs)
    return sig * env(len(t), 0.001, decay) * 0.35


def noise(length, seed=1):
    return np.random.default_rng(seed).uniform(-1, 1, int(length * SR))


def sweep(f0, f1, length):
    """频率按指数从 f0 滑到 f1"""
    t = t_axis(length)
    f = f0 * (f1 / f0) ** (t / length)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def lowpass(sig, cutoff):
    """一阶低通"""
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(sig)
    y = 0.0
    for i, x in enumerate(sig):
        y = (1 - a) * x + a * y
        out[i] = y
    return out


def seq(*parts):
    return np.concatenate(parts)


def hit_env(length, decay):
    return env(int(length * SR), 0.0005, decay)


SOUNDS = {
    # 基础
    "click": lambda: sine([2400], 0.03, 0.006) * 0.8 + noise(0.03, 2) * hit_env(0.03, 0.003) * 0.3,
    "tick": lambda: sine([1800, 3600], 0.05, 0.012),
    "pop": lambda: sweep(300, 900, 0.09) * hit_env(0.09, 0.03),
    "success": lambda: seq(sine([784], 0.09, 0.06), sine([1047, 1319], 0.35, 0.16)),
    "whoosh": lambda: lowpass(noise(0.4, 3), 2200) * np.hanning(int(0.4 * SR)) * 2.2,
    "impact": lambda: sweep(160, 45, 0.45) * hit_env(0.45, 0.14) + lowpass(noise(0.45, 5), 900) * hit_env(0.45, 0.05) * 1.5,
    "kick": lambda: sweep(140, 50, 0.25) * hit_env(0.25, 0.08),
    "riser": lambda: lowpass(noise(0.8, 7), 4000) * np.linspace(0, 1, int(0.8 * SR)) ** 2 * 1.6 + sweep(200, 1200, 0.8) * np.linspace(0, 0.4, int(0.8 * SR)),
    # 8-bit 方波，配像素画面
    "blip": lambda: square([1320], 0.07, 0.03),
    "blip_low": lambda: square([660], 0.08, 0.035),
    "coin": lambda: seq(square([988], 0.06, 0.05), square([1319], 0.25, 0.09)),
    "levelup": lambda: seq(*[square([f], 0.07, 0.05) for f in (523, 659, 784, 1047)]),
    "type": lambda: noise(0.025, 11) * hit_env(0.025, 0.004) * 0.5 + sine([1800], 0.025, 0.004) * 0.3,
    "stamp": lambda: sweep(220, 60, 0.25) * hit_env(0.25, 0.06) + lowpass(noise(0.25, 4), 1500) * hit_env(0.25, 0.02) * 1.2,
    "chunk": lambda: sweep(180, 70, 0.18) * hit_env(0.18, 0.05),
    "shatter": lambda: seq(*[square([np.random.default_rng(i).integers(500, 1600)], 0.035, 0.02) for i in range(7)]),
    "error": lambda: seq(square([220], 0.12, 0.1), square([165], 0.22, 0.15)),
    "slide": lambda: lowpass(noise(0.22, 9), 3500) * np.hanning(int(0.22 * SR)) * 1.6,
}


def write_wav(path: Path, sig: np.ndarray):
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in SOUNDS.items():
        sig = fn()
        sig = sig / (np.abs(sig).max() or 1) * 0.7
        write_wav(OUT / f"{name}.wav", np.concatenate([sig, np.zeros(int(0.05 * SR))]))
    print(f"{len(SOUNDS)} 个音效 → {OUT}: {', '.join(SOUNDS)}")


if __name__ == "__main__":
    main()
