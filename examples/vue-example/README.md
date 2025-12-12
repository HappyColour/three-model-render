# Three Model Render - Vue Example

这是一个**完整可运行**的示例项目，展示如何使用 `@chocozhang/three-model-render` 包的所有14个工具。

## 🚀 快速开始

### 1. 构建主包

首先，确保主包已构建：

```bash
# 在项目根目录
pnpm install
pnpm run build
```

### 2. 安装示例项目依赖

```bash
# 进入示例目录
cd examples/vue-example
pnpm install
```

### 3. 运行示例

```bash
pnpm run dev
```

打开浏览器访问 `http://localhost:5173`

---

## ✨ 展示的所有工具 (14/14)

### Setup (1个) ✅
- **autoSetupCameraAndLight** - 自动设置最佳灯光和相机位置

### Core (3个) ✅
- **addChildModelLabels** - 为子网格添加实时跟随标签
- **enableHoverBreath** - 鼠标悬停呼吸高亮效果
- **initPostProcessing** - 初始化后期处理（OutlinePass）

### Interaction (3个) ✅
- **createModelClickHandler** - 模型点击事件处理
- **ArrowGuide** - 箭头引导到特定对象
- **LiquidFillerGroup** - 液位填充动画

### Camera (2个) ✅
- **followModels** - 相机平滑跟随模型
- **setView** - 快速切换预设视角（Front/Back/Left/Right/Top/ISO）

### Loader (3个) ✅
- **loadModelByUrl** - 自动检测格式并加载模型
- **SkyboxLoader** - 加载天空盒
- **BlueSky** - 内置蓝天环境

### UI (1个) ✅
- **createModelsLabel** - 3D标签

### Effect (1个) ✅
- **GroupExploder** - 爆炸视图（Ring/Spiral/Grid/Radial）

---

## 📂 项目结构

```
vue-example/
├── package.json          # 依赖配置
├── vite.config.js        # Vite 配置
├── index.html            # HTML 入口
├── src/
│   ├── main.js           # Vue 应用入口
│   ├── App.vue           # 根组件
│   └── components/
│       └── ModelViewer.vue  # 核心3D查看器（所有工具使用示例）
└── README.md
```

---

## 💻 代码亮点

### 1. 正确的导入方式

```javascript
import { loadModelByUrl, disposeObject } from '@chocozhang/three-model-render'
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render'
import { addChildModelLabels, enableHoverBreath, initPostProcessing } from '@chocozhang/three-model-render'
...
// or
import { loadModelByUrl, disposeObject } from '@chocozhang/three-model-render/loader'
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup'
import { addChildModelLabels, enableHoverBreath, initPostProcessing } from '@chocozhang/three-model-render/core'
...
//

```

### 2. 模型加载（使用 loadModelByUrl）

```javascript
const loadModel = async (file) => {
  const url = URL.createObjectURL(file)
  
  // ✅ 自动检测格式并加载
  const model = await loadModelByUrl(url, {
    mergeGeometries: false,
    maxTextureSize: 2048
  })
  
  scene.add(model)
}
```

### 3. 功能启用

```javascript
// ✅ 自动灯光
const toggleAutoLights = () => {
  if (enabled) {
    managers.value.autoLights = autoSetupCameraAndLight(
      camera, scene, currentModel, { enableShadows: true }
    )
  } else {
    managers.value.autoLights.dispose()
  }
}

// ✅ 标签
const toggleChildLabels = () => {
  managers.value.childLabels = addChildModelLabels(
    camera, renderer, currentModel, labelMap, { enableCache: true }
  )
}

// ✅ 相机视角
await setView(camera, controls, currentModel, 'front', { duration: 800 })

// ✅ 爆炸视图
const exploder = new GroupExploder(scene, camera, controls)
exploder.explode({ mode: 'spiral', distance: 3 })
```

### 4. 资源清理

```javascript
// ✅ 使用 disposeObject
const disposeModel = () => {
  // 清理所有管理器
  Object.values(managers.value).forEach(mgr => {
    if (mgr?.dispose) mgr.dispose()
    else if (typeof mgr === 'function') mgr()
  })
  
  // 清理模型
  if (currentModel) {
    disposeObject(currentModel)
    scene.remove(currentModel)
  }
}
```

---

## 🎮 使用流程

1. **上传模型** - 拖拽或点击上传 GLTF/GLB/FBX/OBJ 等文件
2. **开启功能** - 使用右侧控制面板的开关
3. **测试交互** - 点击模型、悬停效果、视角切换等
4. **查看效果** - 爆炸视图、液位填充、箭头引导等

---

## 🔧 自定义配置

### 修改 Vite 配置使用 npm 包

如果你想使用已发布的 npm 包而不是本地构建：

```javascript
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  // 移除 alias 配置
  optimizeDeps: {
    include: ['three', '@chocozhang/three-model-render']
  }
})
```

然后安装包：

```bash
pnpm add @chocozhang/three-model-render
```

---

## 📚 学习资源

- **查看源码** - `src/components/ModelViewer.vue` 包含所有工具的使用示例
- **API 文档** - `../../README.md`

---

## ❓ 常见问题
### Q: 如何调试？
**A**: 
- 打开浏览器控制台查看日志
- 检查 Three.js 场景对象
- 使用 Vue DevTools

### Q: 性能优化建议？
**A**:
- 降低后期处理分辨率 (`resolutionScale: 0.5`)
- 减少标签更新频率 (`updateInterval: 66`)
- 使用模型几何体合并

---

## 🎯 从这个示例中学到什么？

1. ✅ 如何安装和导入包
2. ✅ 如何使用每个工具的 API
3. ✅ 如何管理多个功能的状态
4. ✅ 如何正确清理资源
5. ✅ 完整的 Vue3 集成最佳实践

---

**开始探索！** 🚀

有问题欢迎查看源码或提 Issue。
