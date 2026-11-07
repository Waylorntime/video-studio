import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

/**
 * 全部为 OFL 开源字体，放在 public/fonts/（下载地址见 public/fonts/README.md）。
 * 加载完成前阻塞渲染，避免首帧用回退字体。
 */
const FONTS: { family: string; file: string; weight?: string }[] = [
  { family: "NotoSans", file: "NotoSansSC.ttf", weight: "100 900" },
  { family: "Xiaolai", file: "Xiaolai-Regular.ttf" },
  // Fusion Pixel 12px：像素屏、计数器、像素标签。字号取 12 的整数倍（24/36/48…）才不糊
  { family: "Pixel", file: "fusion-pixel-12px-proportional-zh_hans.ttf" },
  { family: "PixelMono", file: "fusion-pixel-12px-monospaced-zh_hans.ttf" },
];

let started = false;

export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading fonts", { timeoutInMilliseconds: 120000 });
  Promise.all(
    FONTS.map(async ({ family, file, weight }) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, weight ? { weight } : {});
      try {
        await face.load();
      } catch {
        throw new Error(`字体缺失：public/fonts/${file}（下载地址见 public/fonts/README.md）`);
      }
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};
