# 午后书房

直接双击 `scene.html`。按住鼠标左键拖动可转动镜头，滚轮缩放，右键拖动可平移。用下方选择框切换视角，“复位”回到开场镜头。“素材署名”可展开来源与许可。

本例以独立绘制的合成图纸为参考。[测绘简报](reference/brief.md)记录房间尺寸、入口、家具布局及一次设计修改，[家具定位图](reference/plan.svg)和[窗洞立面图](reference/elevations.svg)可单独查看。

## 核对模型

- 开场为修改后的西窗。选择“原方案 · 北窗”或“修改后 · 西窗”可在相同视角查看窗位变动。[原方案全景](verification/chrome/before-room.png)与[修改后的全景](verification/chrome/opening.png)保留了完整对照。
- “北墙立面”对应窗洞立面图 A，“西墙立面”对应图 B。可对照[原北墙](verification/chrome/before-north-elevation.png)、[封窗后的北墙](verification/chrome/after-north-elevation.png)及[修改后的西墙](verification/chrome/after-west-elevation.png)。图纸省略了家具，场景画面中的部分窗框会被家具遮挡。
- 从[斜侧核距视角](verification/chrome/after-oblique-clearances.png)看，书桌与朝北的桌椅位于窗侧，北墙左端有门。桌面后缘距北墙 0.20 m，入口西边距西墙 0.10 m。家具坐标按实物外包核对；两次窗位使用同一套家具。
- [数值记录](verification/chrome/measurements.json)包含新旧洞口附近的射线检查、家具外包和实际相机投影。对应立面中，窗框四边投影相对图纸的允许误差为墙面宽高的 0.2%。

## 修改与构建

安装 Node.js 22 或更高版本。在本工程目录中运行：

```sh
npm ci
npm run build
npm run check
```

首次安装依赖需要网络或可用的 npm 缓存。成品离线运行。制作内容与交互在 `src/scene.js` 及其引用的本地文件内，渲染与相机控制在 `src/main.js`，素材说明在 `ASSETS.md`。

检查工具会用本机安装的 Chrome 在断网模式打开单独复制的 HTML，保存截图和结果到 `verification/chrome/`。Windows PowerShell 中可运行 `$env:SCENE_BROWSER_CHANNEL='msedge'` 后执行 `npm run check` 检查 Edge。其他 Chromium 安装位置可用 `SCENE_BROWSER_PATH` 指定。
