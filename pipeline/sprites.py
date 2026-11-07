"""校验 Codex 生成的人物立绘（v2：膝盖以上构图 + 闭嘴/张嘴成对），通过的缩放到 1333x2000 放进 studio/public/characters/。

用法：python pipeline/sprites.py <文件夹或单张 png> [--force]
构图要求见 studio/public/characters/README.md。
"""
import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "studio/public/characters"
SIZE = (1333, 2000)
NAME = re.compile(r"^(host|guest)_[a-z0-9_]+_(a|b)$")

# 以画布比例表示的构图要求
TOP = (0.03, 0.06)     # 头顶（含耳朵、呆毛）
BOTTOM_MIN = 0.99      # 膝上取景：腿要画到最下沿
LEFT_MIN = 0.18
RIGHT_MAX = 0.82
PAIR_DIFF_MAX = 0.04   # _a 与 _b 的差异面积上限
PAIR_FACE_MAX_Y = 0.5  # 差异区域的中心应在画面上半部（脸）


def alpha_mask(im: Image.Image):
    return im.getchannel("A").point(lambda v: 255 if v > 24 else 0)


def check(path: Path):
    im = Image.open(path)
    problems = []
    if not NAME.match(path.stem):
        problems.append("文件名应为 host_<动作>_a/_b.png 或 guest_<动作>_a/_b.png")
    if im.mode != "RGBA":
        problems.append(f"没有透明通道（{im.mode}）")
        return im, problems
    w, h = im.size
    if abs(w / h - 2 / 3) > 0.01:
        problems.append(f"画布 {w}x{h} 不是 2:3")
    if max(im.getpixel((0, 0))[3], im.getpixel((w - 1, 0))[3]) > 24:
        problems.append("上方两角不透明，背景没去干净")
    box = alpha_mask(im).getbbox()
    if not box:
        problems.append("整张图是空的")
        return im, problems
    left, top, right, bottom = box[0] / w, box[1] / h, box[2] / w, box[3] / h
    if not TOP[0] <= top <= TOP[1]:
        problems.append(f"头顶在距顶 {top:.1%}（应在 {TOP[0]:.0%}–{TOP[1]:.0%}），人物可能被放大或缩小了")
    if bottom < BOTTOM_MIN:
        problems.append(f"腿只画到 {bottom:.1%}，膝上取景应画到最下沿")
    if left < LEFT_MIN:
        problems.append(f"左侧出界：{left:.1%}（应 ≥ {LEFT_MIN:.0%}）")
    if right > RIGHT_MAX:
        problems.append(f"右侧出界：{right:.1%}（应 ≤ {RIGHT_MAX:.0%}），会靠近字幕")
    return im, problems


def check_pair(a: Image.Image, b: Image.Image):
    if a.size != b.size:
        return [f"_a 与 _b 尺寸不同（{a.size} vs {b.size}）"]
    diff = ImageChops.difference(a.convert("RGBA"), b.convert("RGBA")).convert("L").point(lambda v: 255 if v > 40 else 0)
    w, h = a.size
    area = diff.histogram()[255] / (w * h)
    problems = []
    if area > PAIR_DIFF_MAX:
        problems.append(f"_a 与 _b 差异面积 {area:.1%}（应 ≤ {PAIR_DIFF_MAX:.0%}），张嘴版改动了嘴以外的地方")
    box = diff.getbbox()
    if box and (box[1] + box[3]) / 2 / h > PAIR_FACE_MAX_Y:
        problems.append("_a 与 _b 的差异不在脸部")
    return problems


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    src = Path(a.src)
    files = sorted(src.glob("*.png")) if src.is_dir() else [src]
    if not files:
        sys.exit(f"{src} 下没有 png")

    results = {p.stem: check(p) for p in files}

    # 成对检查：有 _b 就必须有 _a，且只有嘴不同
    for stem, (im, problems) in results.items():
        if stem.endswith("_b"):
            pair = stem[:-2] + "_a"
            if pair not in results:
                problems.append(f"缺少对应的闭嘴版 {pair}.png")
            else:
                problems.extend(check_pair(results[pair][0], im))
        elif stem.endswith("_a") and stem[:-2] + "_b" not in results:
            print(f"提示：{stem}.png 还没有张嘴版 _b")

    failed = 0
    for stem, (im, problems) in results.items():
        if problems and not a.force:
            failed += 1
            print(f"✗ {stem}.png")
            for msg in problems:
                print(f"    - {msg}")
            continue
        out = OUT / f"{stem}.png"
        im.convert("RGBA").resize(SIZE, Image.LANCZOS).save(out)
        note = "（已强制写入，存在问题）" if problems else ""
        print(f"✓ {stem}.png → {out.relative_to(ROOT)}{note}")
    if failed:
        sys.exit(f"{failed} 张没通过，改提示词重生或加 --force")


if __name__ == "__main__":
    main()
