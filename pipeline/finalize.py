"""成片收尾：响度标准化、导出字幕和封面。

用法：python pipeline/finalize.py studio/src/episodes/<期>.json <渲染出的 mp4> [--cover-frame 120]

产出（与输入 mp4 同目录）：
  <id>.mp4    画面原样拷贝，音轨做响度标准化（-14 LUFS，真峰值 -1 dBTP）
  <id>.srt    字幕：每句一条，时间取这句配音在全片里的起止
  <id>-cover.png  封面：渲染指定帧
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FPS = 30


def ts(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def write_srt(ep, path: Path):
    starts, t = [], 0
    for line in ep["lines"]:
        starts.append(t / FPS)
        t += line["frames"]
    starts.append(t / FPS)
    out = []
    for i, line in enumerate(ep["lines"]):
        start = starts[i]
        # 配音切片按帧取整，可能比下一句的起点多出几毫秒，截到下一句之前
        end = min(start + (line["audioEnd"] - line["audioStart"]), starts[i + 1] - 0.01)
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", line["text"])
        out.append(f"{i + 1}\n{ts(start)} --> {ts(end)}\n{text}\n")
    path.write_text("\n".join(out), encoding="utf-8")


def run(cmd):
    r = subprocess.run(cmd)
    if r.returncode:
        sys.exit(f"失败：{' '.join(map(str, cmd))}")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("video")
    ap.add_argument("--cover-frame", type=int, default=120)
    ap.add_argument("--composition", default="Ep001")
    a = ap.parse_args()

    ep = json.loads(Path(a.episode).read_text(encoding="utf-8"))
    src = Path(a.video).resolve()
    out_dir = src.parent
    final = out_dir / f"{ep['id']}.mp4"

    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", str(final)])
    print(f"✓ 成片 {final.relative_to(ROOT)}")

    srt = out_dir / f"{ep['id']}.srt"
    write_srt(ep, srt)
    print(f"✓ 字幕 {srt.relative_to(ROOT)}（{len(ep['lines'])} 条）")

    cover = out_dir / f"{ep['id']}-cover.png"
    npx = shutil.which("npx") or "npx"
    r = subprocess.run([npx, "remotion", "still", "src/index.ts", a.composition, str(cover), f"--frame={a.cover_frame}", "--log=error"], cwd=ROOT / "studio")
    if r.returncode:
        sys.exit("封面渲染失败")
    print(f"✓ 封面 {cover.relative_to(ROOT)}")

    st = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(final), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    summary = st[st.rfind("Summary:"):]
    lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
    print(f"响度 {lufs.group(1) if lufs else '?'} LUFS（目标 -14），真峰值 {peak.group(1) if peak else '?'} dBFS（应低于 -1）")


if __name__ == "__main__":
    main()
