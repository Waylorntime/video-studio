# video-studio — 用代码做视频的流水线

这是视频《这支视频，我只动了三次手》的源码。整期视频（配音、动画、音效、字幕、封面）由下面这条流水线产出，人只在三个地方动手：审稿、过素材、看成片。

```
分镜 JSON ──► tts.py（配音 + 逐字时间 + 口型）──► Remotion 渲染 ──► finalize.py（响度 / 字幕 / 封面）
                                                   ▲
                               立绘 + 字体 + 音效（sfx_lib.py 代码合成）
```

> **先看这一节：仓库里缺什么**
>
> 为了能公开，下面这些东西**不在仓库里**，需要你自己准备，否则渲染不出来或者效果不全：
>
> | 缺的东西 | 放哪 | 说明 |
> |---|---|---|
> | **人物立绘** | `studio/public/characters/*.png` | 视频里的主讲和配角是作者自己的角色，不随仓库分发。规格和需要的动作见 [`studio/public/characters/README.md`](studio/public/characters/README.md)。没有立绘时渲染会报找不到图片。 |
> | **口型位置表** | `studio/public/characters/mouths.json` | 现在是空的 `{}`。放好立绘后跑 `python pipeline/mouths.py` 生成；不生成也能渲染，只是人物不张嘴。 |
> | **字体** | `studio/public/fonts/*.ttf` | 全部是 OFL 开源字体，体积大所以不放。下载地址见 [`studio/public/fonts/README.md`](studio/public/fonts/README.md)。缺字体时渲染会直接报错，而不是悄悄用回退字体。 |
> | **背景音乐** | `studio/public/bgm/bgm.mp3` | 自备一首有使用权的音乐。没有就不带 BGM，其他照常。 |
> | **配音音频** | `studio/public/audio/` | 由 `pipeline/tts.py` 生成，需要火山引擎豆包语音的账号；配角用的是克隆音色，ID 要换成你自己的（`pipeline/tts_config.json`）。 |
> | **火山引擎 TTS 协议包** | `pipeline/volc_tts/` | 官方 Python 示例里的 `protocols` 包，从火山引擎「豆包语音合成 · 双向流式 WebSocket」文档下载，放成 `pipeline/volc_tts/__init__.py` 和 `protocols.py`。 |
> | **凭证** | `.env` | 复制 `.env.example` 填写，只留在本机。 |
>
> **这一版的范围**（视频里按「已经跑通」讲，仓库里没包含）：
>
> - **写稿、稿子 → 分镜、生图、三个检查点工作台、单句重渲**：都没有对应的脚本或界面。本期稿子是人机对话定稿，分镜 JSON 手工整理，立绘由外部生图工具生成，仓库里只有立绘校验脚本（`sprites.py`）。
> - **每一幕的画面**是为这一期手写的代码（`studio/src/v3/scenes/`，17 幕），换一期要写新的幕。可复用的是：配音、口型、字幕、进度条、镜头、聚光灯、像素素材库、卡片动效、音效库、收尾脚本。

## 能跑通的部分

- **配音**（`pipeline/tts.py`）：火山引擎豆包语音合成 2.0 双向流式。每个角色的全部台词在一个会话里连着合成，再按逐字时间戳切成一句一句，回写到分镜：每句的音频区间、停留帧数、逐帧口型（RMS）、逐字起始帧。有缓存，改一句只重做那个角色。
- **音效**（`pipeline/sfx_lib.py`）：18 个音效全部用正弦、方波、噪声加包络合成，不依赖任何音频素材。`studio/public/sfx/` 里已经生成好。
- **渲染**（`studio/src/v3/`，Remotion）：
  - 网点背景 + 跟着内容走的聚光灯
  - 立绘换动作动画、按口型轨道张嘴（只叠嘴部小块，避免闪烁）
  - 字幕、顶部进度条
  - 关键帧 + 弹簧的镜头系统，支持快甩（whip）和抖动
  - 像素画素材库（`pixel.tsx`：工人、房子、传送带、图标、爆点）
  - 手绘风窗口和卡片（`flow/`）
  - 场景时钟：`c.w(第几句, "关键词")` 返回那个词开口的帧，动效能对着台词卡点
- **收尾**（`pipeline/finalize.py`）：响度标准化到 -14 LUFS / 真峰值 -1 dBTP，按分镜导出 SRT，渲染封面帧。
- **立绘校验**（`pipeline/sprites.py`）：检查构图、尺寸、闭嘴/张嘴成对，缩放到 1333×2000。
- **预览**（`scripts/preview.sh`）：按帧区间低清渲染并拼缩略图总览。

## 目录

```
.env.example                  凭证模板
requirements.txt              Python 依赖
docs/
  2026-11-06-workflow-video-script.md   本期稿子（与 DeepSeek 对话定稿）
pipeline/
  tts.py          配音 + 逐字时间 + 口型，回写分镜
  tts_config.json 音色配置
  sprites.py      立绘校验、缩放
  mouths.py       定位嘴部，生成 mouths.json
  sfx_lib.py      音效库（代码合成）
  finalize.py     响度、字幕、封面
scripts/preview.sh            帧区间预览
studio/                       Remotion 项目
  src/Root.tsx                注册合成 Ep001
  src/fonts.ts                字体加载
  src/episodes/ep001.json     本期分镜（台词、动作、时间）
  src/v3/Episode3.tsx         整期合成
  src/v3/ctx.tsx              场景时钟、Sfx
  src/v3/cam.ts               镜头
  src/v3/layers.tsx           背景、人物、字幕、进度条
  src/v3/pixel.tsx            像素素材库
  src/v3/common.tsx           本期通用元件（工厂、纸卡、代码窗…）
  src/v3/scenes/ch1–ch6.tsx   17 幕
  src/flow/                   手绘窗口、卡片、时钟工具
  public/sfx/                 音效（已生成）
  public/characters/          立绘（自备，见 README）
  public/fonts/               字体（自备，见 README）
  public/bgm/                 背景音乐（可选）
```

## 环境

- Node.js 18+、Python 3.10+、ffmpeg（在 PATH 里）
- 火山引擎豆包语音合成账号（只有做配音时需要）

## 从零跑一遍

```bash
pip install -r requirements.txt
cd studio && npm ci && cd ..
cp .env.example .env            # 填凭证
```

1. 把火山引擎官方示例的 `protocols` 包放到 `pipeline/volc_tts/`。
2. 改 `pipeline/tts_config.json` 里 `guest.speaker` 为你的克隆音色 ID（或者改成任意公共音色，`resource_id` 相应改为 `seed-tts-2.0`）。
3. 字体放进 `studio/public/fonts/`（见那里的 README）。
4. 立绘放进 `studio/public/characters/`，然后：
   ```bash
   python pipeline/sprites.py <生成图所在文件夹>
   python pipeline/mouths.py
   ```
5. 配音（先 `--dry-run` 看要合成什么，不联网）：
   ```bash
   python pipeline/tts.py studio/src/episodes/ep001.json --dry-run
   python pipeline/tts.py studio/src/episodes/ep001.json
   ```
6. 预览或渲染：
   ```bash
   cd studio
   npm run dev       # 浏览器里逐帧看
   npm run render    # 出 out/ep001-raw.mp4
   ```
7. 收尾：
   ```bash
   python pipeline/finalize.py studio/src/episodes/ep001.json studio/out/ep001-raw.mp4 --cover-frame 120
   ```
   得到 `studio/out/ep001.mp4`、`ep001.srt`、`ep001-cover.png`。

音效如果想改，改 `pipeline/sfx_lib.py` 后重新 `python pipeline/sfx_lib.py`。

## 改一期新的

1. 写稿，整理成 `studio/src/episodes/<新id>.json`（结构照 `ep001.json`：`id`、`lines[]`，每句 `speaker`、`text`、`sprite`）。
2. 跑 `tts.py` 回写时间。
3. 在 `studio/src/v3/scenes/` 写这期的幕，`scenes/index.tsx` 里登记；每幕是一个 `SceneDef`：`View`（画面）、`cam`（镜头关键帧）、`spots`（聚光灯）、可选 `Overlay`。
4. `Root.tsx` 里换 episode 文件。

## 许可

- 代码：MIT（见 `LICENSE`）。
- 字体：各自为 SIL OFL 1.1，不随仓库分发。
- 音效：由代码生成，随代码 MIT。
- 不随仓库分发的东西：角色立绘、配音音频、背景音乐、本期成片。角色形象归作者所有，请勿复现或用于衍生创作。
