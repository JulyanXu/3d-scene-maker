# 把画面要求写成可验收的行为

上游 [3D Prompt Collection](https://github.com/petergpt/3d-prompt-collection/tree/b5b5df94ae9326523d57b70708a81f457e30fac0) 包含六组、63 条提示，提供设计意图和观察条件。下面把其中的方法转为独立的制作决策。

| 何时使用 | 几何、镜头或运动怎么选 | 验收时怎么看 |
| --- | --- | --- |
| 整座城市或很大的环境 | 安排全景、中景、近景的特征，优先建出独特轮廓，再铺可重复物件。 | 从全景定位目的地，靠近后辨认同一地标和街面参照。[案例 1](https://github.com/petergpt/3d-prompt-collection#prompt-01) |
| 真实材料变化 | 把原始、加工中和完成的表面放在一个可读的主体上。对变化量使用同一个进度参数，局部事件从接触点发出。 | 开场读懂中间态；特写能分辨粗糙度和工具痕迹；拖动进度会改变剪影。[案例 43](https://github.com/petergpt/3d-prompt-collection#prompt-43) |
| 绘画与照片的空间化 | 保存与原图画幅匹配的相机，把前景、主体和远景放到合理深度。 | 主视角核对构图，偏移相机看视差和遮挡，复位后返回原构图。[案例 45](https://github.com/petergpt/3d-prompt-collection#prompt-45) |
| 微观世界 | 先设观察者的眼高和已知尺度的参照物，再确定纹理频率与景深。 | 水滴和叶脉在同一尺度体系下可读。[案例 50](https://github.com/petergpt/3d-prompt-collection#prompt-50) |
| 动态环境与游戏 | 给主要动作安排触发条件、环境后果和回看方式；交互入口放在能看见结果的视角。 | 从冰块入水到波浪抵达船体有可追踪的时序；短玩法能跑通出发与抵达。[案例 54](https://github.com/petergpt/3d-prompt-collection#prompt-54) · [案例 31](https://github.com/petergpt/3d-prompt-collection#prompt-31) |

以每个题材真正要求的内容作为验收依据。安静的书房用朝向、开口、材质与桌墙间距来评估。性能预算紧张时，先削减对当前视角影响小的重复物、远景纹理或粒子。
