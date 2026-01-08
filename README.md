# three-model-render

> 🚀 专业级 Three.js 模型可视化与交互工具库

[English](./README_EN.md) | 中文

一个高性能、TypeScript 优先的工具库，提供 16 个经过优化的实用工具，专注于解决 Three.js 模型可视化与交互中的核心痛点。

> 🌟 **[在线体验 Demo](https://happycolour.github.io/)**

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/HappyColour/three-model-render)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ 核心特性

- ⚡ **极致性能 (v3.0)** - 闲置 CPU 占用降低 80%，内置**对象池系统**与**自动视锥剔除**。
- 📊 **实时监控** - 内置性能监视器，实时追踪 FPS、内存、Draw Calls 等核心指标。
- 🎯 **统一标签系统** - 整合 3D 标注与引线功能，支持遮挡检测与距离剔除。
- 📦 **支持 Tree-Shaking** - 基于 ES Modules，按需引入，极致精简。
- 🎨 **无缝集成** - 完美支持 Vue 3, React 及原生 JavaScript。
- 📝 **专业文档** - 完整的 JSDoc 注释与最佳实践指引。

---

## 📦 安装

```bash
npm install @chocozhang/three-model-render@latest
# 或
pnpm add @chocozhang/three-model-render@latest
```

**对等依赖 (Peer Dependencies):**
```bash
npm install three@^0.181.2
```

---

## 🚀 v3.0 性能优化黑科技 (Performance Optimizations)

在 v3.0 中，我们引入了多项激进的性能优化技术，使工具库在处理复杂场景时更加从容。

### 1. 对象池系统 (Object Pooling)
通过复用 `Vector3`、`Box3`、`Matrix4` 等高频创建的对象，极大地降低了垃圾回收（GC）的压力。
*   **收益**：GC 引起的卡顿减少 ~70%，帧率稳定性提升 ~50%。

### 2. 自动视锥剔除 (Frustum Culling)
在悬停检测（Hover Effect）和点击处理中，自动剔除屏幕外的对象，仅对可见物体进行精密射线检测。
*   **收益**：复杂场景下的射线检测开销降低 ~70%。

### 3. 环境自适应节流 (Smart Throttling)
当相机静止或用户无操作时，工具库会自动降低计算频率，进入低功耗模式。

---

## 📊 性能监视器 (Performance Monitor)

v3.0 新增了轻量级的性能监视工具，帮助开发者深入了解渲染状态。

```typescript
import { createPerformanceMonitor } from '@chocozhang/three-model-render/ui';

const perfMonitor = createPerformanceMonitor({
    position: 'top-left',
    renderer: renderer,
    enableWarnings: true // 当 FPS 过低或内存过高时显示报警
});

// 在渲染循环中调用
function animate() {
    perfMonitor.update();
    renderer.render(scene, camera);
}
```

---

## 🚀 最佳实践工作流

### 1. 基础环境与模型加载
```typescript
import { loadModelByUrl } from '@chocozhang/three-model-render';

// 2. 配置全局加载路径 (可选，默认使用本地 /draco/ 和 /basis/)
import { setLoaderConfig } from '@chocozhang/three-model-render/loader';
setLoaderConfig({
    dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    ktx2TranscoderPath: '/custom/basis/'
});

// 3. 加载模型 (自动启用缓存与纹理优化)
const model = await loadModelByUrl('path/to/model.glb', {
    maxTextureSize: 1024, // 自动缩小大纹理以节省显存
    useCache: true        // 启用内部缓存，避免重复加载
});
scene.add(model);
```

### 2. 自动场景配置
```typescript
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup';

// 方式 A: 一键配置相机与灯光
const lightHandles = autoSetupCameraAndLight(camera, scene, model, {
    enableShadows: true, 
    intensity: 1.5      
});

// 方式 B: 灵活组合 (推荐)
import { fitCameraToObject, setupDefaultLights } from '@chocozhang/three-model-render/setup';
fitCameraToObject(camera, model, 1.2); // 仅调整相机
const lights = setupDefaultLights(scene, model, { enableShadows: true }); // 仅添加灯光
```

### 3. 统一标签系统 (Unified Labeling)
支持 'simple' (顶部) 和 'line' (引线) 两种专业样式。

```typescript
import { createModelsLabel } from '@chocozhang/three-model-render/ui';

const labelManager = createModelsLabel(camera, renderer, model, labelsMap, {
    style: 'line',
    lift: 100, // 引线长度
    enableOcclusionDetection: true // 开启遮挡隐藏
});
```

### 4. 交互处理与后期特效
```typescript
import { initPostProcessing, enableHoverBreath } from '@chocozhang/three-model-render';

const ppManager = initPostProcessing(renderer, scene, camera);
const hoverController = enableHoverBreath({
    camera, scene, renderer, 
    outlinePass: ppManager.outlinePass,
    enableFrustumCulling: true // v3.0 推荐开启
});
```

---

## 📚 完整功能总览 (Complete Feature Overview)

### **核心工具 (Core `/core`)**

#### 🎯 模型加载与资源管理
- **`loadModelByUrl`** - 异步加载 GLTF/GLB 模型,支持加载管理器
- **`disposeObject`** - 深度清理 Three.js 对象,防止内存泄漏
- **`objectPool`** - 全局对象池系统 (`globalPools`),降低 GC 压力 70%

#### ✨ 后期处理与交互特效
- **`initPostProcessing`** - 高性能后期处理流水线,内置 OutlinePass
- **`enableHoverBreath`** - 智能悬停高亮,支持视锥剔除与节流优化
- **`createModelClickHandler`** - 模型点击事件处理,集成射线检测

### **相机控制 (Camera `/camera`)**
- **`followModels`** - 平滑相机运镜,支持多种预设角度与缓动函数
- **`setView`** - 一键切换 6 种预设视角 (前/后/左/右/顶/等轴测)
- **`FOLLOW_ANGLES`** - 预定义相机角度常量

### **交互效果 (Interaction `/interaction`)**
- **`LiquidFillerGroup`** - 液体填充动画,支持多对象批量填充
- 特性:逼真波动效果、可调填充速度、自动恢复功能

### **视觉特效 (Effect `/effect`)**
- **`GroupExploder`** - 智能模型爆炸/拆解系统
- 支持模式:`grid`(网格) | `radial`(径向) | `random`(随机)
- 特性:自动相机跟随、部件淡化、可自定义间距与提升高度

### **UI 组件 (UI `/ui`)**

#### 📊 性能监控
- **`createPerformanceMonitor`** - 实时性能面板
- 显示指标:FPS、内存使用、DrawCalls、三角形数
- 特性:自动告警、可配置阈值、低开销设计

#### 🏷️ 统一标签系统
- **`createModelsLabel`** - 专业 3D 标注系统
- **样式模式**:
  - `'simple'`: 顶部文字标签 (轻量级)
  - `'line'`: 引线标注 + 状态点 (专业级)
- **高级特性**:
  - 遮挡检测 (物体被遮挡时自动隐藏)
  - 距离剔除 (超出范围自动隐藏)
  - 智能节流 (相机静止时暂停更新)
  - 对象池优化 (复用 Vector3/Box3)

### **场景配置 (Setup `/setup`)**
- **`autoSetupCameraAndLight`** - 影棚级灯光与相机自动配置
- 包含:环境光、主光源、辅助填充光,最佳视角计算

---

## 💡 完整使用示例

### 基础场景搭建
```typescript
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { loadModelByUrl, autoSetupCameraAndLight } from '@chocozhang/three-model-render'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
const controls = new OrbitControls(camera, renderer.domElement)

const model = await loadModelByUrl('model.glb')
scene.add(model)
autoSetupCameraAndLight(camera, scene, model)
```

### 添加交互高亮与点击
```typescript
import { initPostProcessing, enableHoverBreath, createModelClickHandler, followModels, FOLLOW_ANGLES } from '@chocozhang/three-model-render'

const { composer, outlinePass } = initPostProcessing(renderer, scene, camera)

// 悬停高亮 (v3.0 性能优化)
const hoverCtrl = enableHoverBreath({
  camera, scene, renderer, outlinePass,
  enableFrustumCulling: true,  // 🔥 开启视锥剔除
  throttleDelay: 16             // 60fps 节流
})

// 点击聚焦
const dispose = createModelClickHandler(camera, scene, renderer, outlinePass, (object, info) => {
  console.log('Clicked:', object.name, info)
  followModels(camera, object, {
    ...FOLLOW_ANGLES.ISOMETRIC,
    duration: 1500,
    controls
  })
})
```

### 液体填充效果
```typescript
import { LiquidFillerGroup } from '@chocozhang/three-model-render/interaction'

const targetMeshes = new Set()
model.traverse(child => {
  if (child.name.includes('tank')) targetMeshes.add(child)
})

const filler = new LiquidFillerGroup(targetMeshes, scene, camera, renderer, {
  color: 0x00ff00,
  opacity: 0.5,
  speed: 0.01
}, 10)

filler.fillTo(targetMeshes, 0.8)  // 填充至 80%
// filler.restoreAll()  // 恢复原状
```

### 8. 资源管理与内存释放 (重要)
使用 `ResourceManager` 统一追踪并销毁 3D 资源，确保应用长期运行不泄露。

```typescript
import { ResourceManager } from '@chocozhang/three-model-render/core';

const rm = new ResourceManager();

// 追踪加载出的模型
rm.track(model);

// 当组件卸载时，一键销毁所有关联的几何体、材质与纹理
rm.dispose();
```

---

## 🌐 WebXR 兼容性说明

本工具库的所有核心逻辑与 Three.js 的 WebXR 系统保持兼容：
- `ResourceManager` 支持清理所有 XR 相关的 GPU 资源。
- `autoSetupCameraAndLight` 计算的包围盒信息可直接用于 XR 传送或布局。
- `loadModelByUrl` 经过优化的纹理大小非常适合移动端 VR/AR 设备。

> [!NOTE]
> 交互层 (`createModelClickHandler`) 目前主要针对鼠标与触屏优化。在 XR 环境下，建议结合控制器的射线检测使用。

---

### 专业标注系统
```typescript
import { createModelsLabel } from '@chocozhang/three-model-render/ui'

const labelsMap = {
  'engine': '发动机',
  'wheel': '轮胎',
  'chassis': '底盘'
}

const labelMgr = createModelsLabel(camera, renderer, model, labelsMap, {
  style: 'line',                      // 引线样式
  lift: 120,                          // 引线长度
  enableOcclusionDetection: true,     // 🔥 遮挡检测
  occlusionCheckInterval: 3,          // 每 3 帧检测一次
  maxDistance: 50,                    // 距离剔除
  cameraMoveThreshold: 0.001          // 相机移动阈值优化
})
```

### 性能监控面板
```typescript
import { createPerformanceMonitor } from '@chocozhang/three-model-render/ui'

const perfMonitor = createPerformanceMonitor({
  position: 'top-left',
  renderer,
  enableMemoryTracking: true,
  enableWarnings: true,
  fpsWarningThreshold: 30,
  memoryWarningThreshold: 200
})

// 在渲染循环中
function animate() {
  perfMonitor.update()  // ✅ 必须调用
  composer.render()     // or renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

### 资源清理 (防止内存泄漏)
```typescript
import { disposeObject } from '@chocozhang/three-model-render'

// 组件卸载时
disposeObject(model)
hoverCtrl?.dispose()
dispose?.()  // 点击处理器
exploder?.dispose()
filler?.dispose()
labelMgr?.dispose()
perfMonitor?.dispose()
controls?.dispose()
renderer?.dispose()
```

---

## 🎨 完整示例项目

两个示例项目展示了**全部 16+ 工具**的完整集成:

- 👉 **[Vue 3 完整示例 (推荐)](https://github.com/HappyColour/three-model-render/tree/main/examples/vue-example)**
  - 包含:液体填充、模型爆炸、智能标注、性能监控等所有功能
  - TypeScript + Composition API 最佳实践
  
- 👉 **[HTML 原生示例](https://github.com/HappyColour/three-model-render/tree/main/examples/html-example)**
  - 零构建工具,直接通过 CDN 使用
  - 适合快速原型验证

---

## 🔧 高级配置

### 对象池使用 (高级)
```typescript
import { globalPools, withPooledVector3 } from '@chocozhang/three-model-render'

// 方式 1: 手动管理
const v = globalPools.vector3.acquire()
v.set(1, 2, 3)
// ... 使用 v ...
globalPools.vector3.release(v)

// 方式 2: 自动管理 (推荐)
const distance = withPooledVector3(v => {
  v.set(1, 2, 3)
  return v.length()
})  // 自动释放
```

### 视角切换
```typescript
import { setView } from '@chocozhang/three-model-render'

setView(camera, controls, model, 'front')   // 前视图
setView(camera, controls, model, 'iso')     // 等轴测 (45°)
```

---

## 📄 开源协议

MIT © [Danny Zhang]
