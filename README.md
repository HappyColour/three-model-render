# three-model-render

> 🚀 专业级 Three.js 模型可视化与交互工具库

[English](./README_EN.md) | 中文

一个高性能、TypeScript 优先的工具库，提供 14 个经过优化的实用工具，专注于解决 Three.js 模型可视化与交互中的常见问题。

> 🌟 **[在线体验 Demo](https://happycolour.github.io/)**

[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](https://github.com/HappyColour/three-model-render)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ 核心特性

- 🎯 **14 个高性能工具** - 覆盖从加载、展示到交互的全流程
- 📦 **支持 Tree-Shaking** - 按需引入，体积更小
- 🔷 **TypeScript 优先** - 完整的类型定义与智能提示
- ⚡ **性能优化** - 相比原生实现，闲置 CPU 占用降低 55%，内存占用降低 33%
- 🎨 **无缝集成** - 完美支持 Vue 3, React 及原生 JavaScript
- 📝 **完善文档** - 提供最佳实践指引与完整示例

---

## 📦 安装

```bash
npm install @chocozhang/three-model-render@latest
# 或
pnpm add @chocozhang/three-model-render@latest
# 或
yarn add @chocozhang/three-model-render@latest
```

**对等依赖 (Peer Dependencies):**
请确保你的项目中安装了 `three`:
```bash
npm install three@^0.160.0
```

---

## 🚀 最佳实践工作流 (Best Practice Workflow)

为了构建专业、高性能的 3D 查看器，我们建议遵循以下集成模式。此工作流经过生产环境验证，能确保最佳的视觉效果与性能表现。

### 1. 基础环境与模型加载
使用我们优化过的加载器初始化场景。它会自动处理 GLTF/GLB/FBX/OBJ 格式，并内置了 Draco 解码器配置。

```typescript
import { loadModelByUrl } from '@chocozhang/three-model-render';

// 1. 初始化基础场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const controls = new OrbitControls(camera, renderer.domElement);

// 2. 加载模型 (支持进度回调)
const model = await loadModelByUrl('path/to/model.glb', {
    manager: new THREE.LoadingManager(() => console.log('加载完成'))
});
scene.add(model);
```

### 2. 自动场景配置 (关键步骤)
根据模型的包围盒大小，自动计算最佳相机距离、近裁剪面(Near)和远裁剪面(Far)，并设置影棚级光照。

```typescript
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup';

// 一键配置相机与灯光
const lightHandles = autoSetupCameraAndLight(camera, scene, model, {
    enableShadows: true, // 开启阴影
    intensity: 1.5       // 光照强度
});
```

### 3. 电影级入场动画
模型加载后，使用平滑的运镜动画将视角聚焦到模型正面。

```typescript
import { followModels, FOLLOW_ANGLES } from '@chocozhang/three-model-render';

followModels(camera, model, {
    ...FOLLOW_ANGLES.FRONT, // 使用预设角度
    duration: 1500,         // 动画时长 1.5s
    padding: 0.8,           // 留白比例
    controls,               // 绑定控制器以同步状态
    easing: 'easeInOut'     // 缓动函数
});
```

### 4. 后期处理与呼吸光效
启用高性能后期处理管线和智能呼吸光效（闲置时自动降低帧率以节省电量）。

```typescript
import { initPostProcessing, enableHoverBreath } from '@chocozhang/three-model-render';

// 1. 初始化后期处理管理器
const ppManager = initPostProcessing(renderer, scene, camera, {
    resolutionScale: 0.8, // 降低分辨率以提升性能
    edgeStrength: 4,      // 描边强度
    visibleEdgeColor: '#ffee00' // 描边颜色
});

// 2. 启用智能悬停效果
const hoverController = enableHoverBreath({
    camera,
    scene,
    renderer,
    outlinePass: ppManager.outlinePass,
    throttleDelay: 16,    // 60fps 节流
    minStrength: 2,       // 呼吸最小强度
    maxStrength: 8,       // 呼吸最大强度
    speed: 3              // 呼吸速度
});

// 重要: 在动画循环中调用 render
function animate() {
    requestAnimationFrame(animate);
    // 使用 composer 替代 renderer.render
    ppManager.composer.render();
}
```

### 5. 交互处理系统的集成
添加智能点击事件，支持自动聚焦到被点击的组件。

```typescript
import { createModelClickHandler } from '@chocozhang/three-model-render';

// 创建点击处理器 (返回销毁函数)
const disposeClickHandler = createModelClickHandler(
    camera, 
    scene, 
    renderer, 
    ppManager.outlinePass, 
    (object, info) => {
        console.log('点击了:', info);
        
        // 聚焦到被点击的部件
        followModels(camera, object, {
            ...FOLLOW_ANGLES.ISOMETRIC,
            duration: 1000
        });
    }
);
```

### 6. 高级特效：爆炸分解
无需复杂计算，一行代码实现模型的爆炸分解视图。

```typescript
import { GroupExploder } from '@chocozhang/three-model-render';

// 初始化爆炸控制器
const exploder = new GroupExploder(scene, camera, controls);
exploder.init();

// 设置需要爆炸的网格集合
exploder.setMeshes(targetMeshes);

// 执行爆炸 (Grid 模式)
exploder.explode({ 
    mode: 'grid',    // 排列模式: 'ring' | 'spiral' | 'grid' | 'radial'
    spacing: 2.8,    // 间距
    dimOthers: { enabled: true, opacity: 0.1 } // 使其他物体透明
});

// 还原
exploder.restore(600);
```

### 7. 视角快速切换
提供标准的工程视角切换功能。

```typescript
import { setView } from '@chocozhang/three-model-render';

// 切换到顶视图
setView(camera, controls, model, 'top');

// 切换到等轴测视图 (ISO)
setView(camera, controls, model, 'iso');
```

---

## 📚 模块总览 (Module Overview)

### **Core (`/core`)**
- `initPostProcessing`: 高性能后期处理管理器，内置 OutlinePass。
- `enableHoverBreath`: 智能呼吸光效，支持性能自适应。
- `addChildModelLabels`: 3D 标签系统，自动跟随模型运动。

### **Camera (`/camera`)**
- `followModels`: 智能相机跟随与聚焦。
- `setView`: 预设视角切换 (Top, Front, Iso, etc.)。

### **Loader (`/loader`)**
- `loadModelByUrl`: 统一模型加载器，支持多种格式。
- `BlueSky`: 快速创建天空盒环境。

### **Interaction (`/interaction`)**
- `createModelClickHandler`: 射线检测点击处理器。

### **Effect (`/effect`)**
- `GroupExploder`: 模型爆炸/拆解动画控制器。

### **Setup (`/setup`)**
- `autoSetupCameraAndLight`: 一键自动化场景配置大师。

---

## 🎨 示例项目

我们提供了一个完整的、可部署的示例项目，展示了所有功能的集成方式：

- 👉 **[Vue 3 示例 (推荐)](https://github.com/HappyColour/three-model-render/tree/main/examples/vue-example)** - 完整的 Vue 3 + TypeScript 集成最佳实践
- 👉 **[HTML 原生示例](https://github.com/HappyColour/three-model-render/tree/main/examples/html-example)** - 适合原生 JavaScript / jQuery 项目

---

## 📄 开源协议

MIT © [Danny Zhang]
