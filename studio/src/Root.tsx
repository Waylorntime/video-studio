import { Composition, getStaticFiles } from "remotion";
import ep001 from "./episodes/ep001.json";
import { loadFonts } from "./fonts";
import { Episode3, ep3Schema, type Ep3Props } from "./v3/Episode3";

loadFonts();

/** 背景音乐自备，放到 public/bgm/bgm.mp3；没有就不放 */
const BGM = "bgm/bgm.mp3";

export const RemotionRoot: React.FC = () => {
  const hasBgm = getStaticFiles().some((f) => f.name === BGM);
  // 分镜写错就立刻失败，而不是渲染到一半才发现
  const props = ep3Schema.parse({ ...ep001, bgm: hasBgm ? BGM : undefined }) as Ep3Props;
  return (
    <Composition
      id="Ep001"
      component={Episode3}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={props.lines.reduce((n, l) => n + l.frames, 0)}
      defaultProps={props}
    />
  );
};
