# 人物立绘（不随仓库提供）

把你自己的立绘放在这里，规格如下：

- 文件名：`host_<动作>_a.png`（闭嘴）、`host_<动作>_b.png`（张嘴）；配角用 `guest_` 开头
- 1333×2000（2:3），透明背景，膝盖以上构图
- 本期用到的动作见 `docs/2026-11-06-workflow-video-script.md` 第四节

放好后运行：

```bash
python pipeline/sprites.py <生成图所在文件夹>   # 校验并缩放，写进这里
python pipeline/mouths.py                        # 找出每张图的嘴部位置，写 mouths.json（口型用）
```

`mouths.json` 现在是空的：没有它也能渲染，只是人物不会张嘴。
