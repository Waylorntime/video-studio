"""找出每个姿势「闭嘴 _a / 张嘴 _b」两张图里嘴巴所在的小块，写进 studio/public/characters/mouths.json。

渲染时始终画 _a，张嘴时只把 _b 的这一小块叠上去：两张图其余部分的细微差异（轮廓噪点）就不会在说话时闪烁。
用法：python pipeline/mouths.py [--sheet qa/mouths.jpg]
"""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / "studio/public/characters"

# 自动定位失败时手动指定（画布比例）。None = 这个姿势不做口型（张嘴版整张重画过，叠不上）
OVERRIDES = {
    # 自动定位失败的立绘在这里手填嘴部矩形（画布比例），例如：
    # "host_point_right": {"x": 0.505, "y": 0.32, "w": 0.09, "h": 0.055},
    # 填 None 表示这张不做口型
}


def locate(a: Image.Image, b: Image.Image):
    A = np.asarray(a.convert("RGBA"), dtype=np.int16)
    B = np.asarray(b.convert("RGBA"), dtype=np.int16)
    h, w = A.shape[:2]
    diff = np.abs(A - B).max(axis=2) > 60
    # 只在头部范围里找：避开衣服和手的边缘噪点
    y0, y1, x0, x1 = int(h * 0.12), int(h * 0.42), int(w * 0.22), int(w * 0.80)
    sub = diff[y0:y1, x0:x1].astype(np.float32)
    k = 40  # 约 2% 画布宽的窗口里数差异像素，最密的地方就是嘴
    ii = sub.cumsum(0).cumsum(1)
    pad = np.pad(ii, ((1, 0), (1, 0)))
    dens = pad[k:, k:] - pad[:-k, k:] - pad[k:, :-k] + pad[:-k, :-k]
    cy, cx = np.unravel_index(np.argmax(dens), dens.shape)
    cy, cx = cy + k / 2 + y0, cx + k / 2 + x0
    # 以最密点为中心取 ±60px 内的差异像素，求外框
    win = diff[int(cy - 60):int(cy + 60), int(cx - 60):int(cx + 60)]
    ys, xs = np.nonzero(win)
    if len(xs) < 20:
        return None
    bx0, bx1 = xs.min() + cx - 60, xs.max() + cx - 60
    by0, by1 = ys.min() + cy - 60, ys.max() + cy - 60
    m = 14
    return {
        "x": round((bx0 - m) / w, 4), "y": round((by0 - m) / h, 4),
        "w": round((bx1 - bx0 + 2 * m) / w, 4), "h": round((by1 - by0 + 2 * m) / h, 4),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet")
    a = ap.parse_args()
    out, crops = {}, []
    for pa in sorted(D.glob("*_a.png")):
        pb = pa.with_name(pa.stem[:-2] + "_b.png")
        if not pb.exists():
            continue
        A, B = Image.open(pa), Image.open(pb)
        name = pa.stem[:-2]
        r = OVERRIDES[name] if name in OVERRIDES else locate(A, B)
        if name in OVERRIDES and r is None:
            print(f"- {name}: 按设置跳过口型")
            continue
        if not r:
            print(f"✗ {name}: 没找到嘴巴差异")
            continue
        out[name] = r
        w, h = A.size
        box = (int((r["x"] - 0.04) * w), int((r["y"] - 0.03) * h), int((r["x"] + r["w"] + 0.04) * w), int((r["y"] + r["h"] + 0.03) * h))
        crops.append((name, A.crop(box), B.crop(box), r, box))
    (D / "mouths.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"写入 {len(out)} 个姿势 → {D / 'mouths.json'}")
    if a.sheet and crops:
        from PIL import ImageDraw
        cw = 220
        sheet = Image.new("RGB", (cw * 2 + 10, cw * len(crops)), (40, 42, 48))
        for i, (name, ca, cb, r, box) in enumerate(crops):
            for j, c in enumerate((ca, cb)):
                bg = Image.new("RGBA", c.size, (230, 230, 230, 255)); bg.alpha_composite(c.convert("RGBA"))
                t = bg.convert("RGB").resize((cw, int(cw * c.size[1] / c.size[0])))
                dr = ImageDraw.Draw(t); s = cw / c.size[0]; W, H = A.size
                dr.rectangle(((r["x"] * W - box[0]) * s, (r["y"] * H - box[1]) * s, ((r["x"] + r["w"]) * W - box[0]) * s, ((r["y"] + r["h"]) * H - box[1]) * s), outline=(255, 0, 0), width=2)
                dr.text((4, 4), name if j == 0 else "", fill=(255, 0, 0))
                sheet.paste(t, (j * (cw + 10), i * cw))
        sheet.save(a.sheet, quality=85)


if __name__ == "__main__":
    main()
