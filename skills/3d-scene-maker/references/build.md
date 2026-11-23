# 从源码到可以直接打开的网页

工程需要 Node.js 22+ 及 npm。复制模板后，运行 `npm ci`，编写场景，再运行 `npm run build`。独立 HTML 位于工程根目录。用户打开成品只需要支持 WebGL 2 的桌面浏览器。

## 场景接口

`src/scene.js` 导出 `meta = {title, subtitle?}` 与 `createScene({THREE, scene, view, ui, renderer})`，可以是异步函数。把物体与灯光加入 scene。返回值可以包含 `update(dt, elapsed)`（秒）以及只读的 `inspect()`（返回实际几何或动作状态，供验收）。

- `view.preset('主视角', [x,y,z], [tx,ty,tz], { fov: 42 })` 注册镜头，首项为开场与复位镜头；`view.go(名称)` 立即切换。所有预设共享轨道镜头。可通过 `view.controls` 约束距离和角度。
- `ui.button(名称, 回调)`、`ui.slider(名称, 最小, 最大, 步长, 当前值, 数值变化回调)` 返回 DOM 控件。控件应描述可见行为，标签用于键盘操作与浏览器检查。
- 在主视角和检查视角调好光照。物体需要投影时显式设置物体与灯的 castShadow / receiveShadow，并限制阴影覆盖范围。

## 随 HTML 内嵌素材

以静态导入把本地资源纳入构建。图片、音频、字体会变为内嵌 URL，GLB、BIN、HDR 会变为 Uint8Array。任意本地文件可用 `?inline` 后缀显式取得 data URL。脚本、字体、贴图、外部引用缓冲及解码器均需在成品中可解析。优先采用包含全部纹理的 GLB。

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import model from './assets/hero.glb';
import grain from './assets/grain.jpg';
const texture = await new THREE.TextureLoader().loadAsync(grain);
texture.colorSpace = THREE.SRGBColorSpace;
const buffer = model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength);
const gltf = await new GLTFLoader().parseAsync(buffer, '');
scene.add(gltf.scene);
```

使用压缩模型时按资产使用的扩展加载解码器。下例将 Draco 的 WASM 和包装脚本都内嵌；KTX2 同样用导入的 basis_transcoder.js 与 basis_transcoder.wasm 建表，交给 KTX2Loader 的 LoadingManager 后调用 detectSupport(renderer)。EXT_meshopt_compression 可静态导入 three/addons/libs/meshopt_decoder.module.js。用实际压缩资产完成一次离线验收；必要时改用在制作阶段解压后的资产。

```js
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import wrapper from 'three/addons/libs/draco/gltf/draco_wasm_wrapper.js?inline';
import wasm from 'three/addons/libs/draco/gltf/draco_decoder.wasm?inline';
const files = { 'draco_wasm_wrapper.js': wrapper, 'draco_decoder.wasm': wasm };
const manager = new THREE.LoadingManager().setURLModifier(url => files[url] ?? url);
const draco = new DRACOLoader(manager).setDecoderConfig({ type: 'wasm' });
const loader = new GLTFLoader().setDRACOLoader(draco);
// 使用 loader.parseAsync 读取内嵌模型，所有依赖载入后 draco.dispose()。
```

在 ASSETS.md 写入署名，把需要附带的文本许可放在 licenses/ 的 .txt 或 .md 文件中。打包时这些说明以及 Three.js 的 MIT 许可会嵌入网页的“素材署名”。

## 可重复验收

`npm run check` 把唯一成品复制到新的临时空目录，用无网络的新浏览器上下文从 file: 打开。它检查控制台、外部请求、首帧绘制、不同视角、拖动、缩放与复位，并保存截图和结果。通过 SCENE_BROWSER_CHANNEL=msedge 可测 Edge；支持 SCENE_BROWSER_PATH 指向已安装的 Chromium。

用 `scene-check.mjs` 导出 `default async function(page, assert, capture)`，补上题材特有的检查。例如按下“落凿”后核对冲击位置与新碎屑，或从实际墙体几何核对净宽度。读取 `window.sceneMaker.inspect()`，用 `await capture('状态名')` 保存关键画面。需要视觉对比时锁定画幅、相机、时间或随机种子。打开截图检查画面，修正后重建并复验。
