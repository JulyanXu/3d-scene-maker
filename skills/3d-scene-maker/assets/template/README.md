# 使用这个场景

直接双击 `scene.html`。按住鼠标左键拖动可转动镜头，滚轮缩放，右键拖动可平移。用下方选择框切换视角，“复位”回到开场镜头。“素材署名”可展开来源与许可。

## 修改与构建

安装 Node.js 22 或更高版本。在本工程目录中运行：

```sh
npm ci
npm run build
npm run check
```

首次安装依赖需要网络或可用的 npm 缓存。成品离线运行。制作内容与交互在 `src/scene.js` 及其引用的本地文件内，渲染与相机控制在 `src/main.js`，素材说明在 `ASSETS.md`。

检查工具会用本机安装的 Chrome 在断网模式打开单独复制的 HTML，保存截图和结果到 `verification/chrome/`。Windows PowerShell 中可运行 `$env:SCENE_BROWSER_CHANNEL='msedge'` 后执行 `npm run check` 检查 Edge。其他 Chromium 安装位置可用 `SCENE_BROWSER_PATH` 指定。
