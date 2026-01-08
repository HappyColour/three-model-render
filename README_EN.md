# three-model-render

> 🚀 Professional Three.js Model Visualization & Interaction Toolkit

English | [中文](./README.md)

A high-performance, TypeScript-first toolkit providing 16 optimized utilities designed to solve core challenges in Three.js model visualization and user interaction.

> 🌟 **[Live Demo](https://happycolour.github.io/)**

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/HappyColour/three-model-render)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ Key Features

- ⚡ **Cutting-edge Performance (v3.0)** - Built-in **Object Pooling** and **Automatic Frustum Culling** reduce idle CPU usage by up to 80%.
- 📊 **Real-time Monitoring** - Integrated performance monitor to track FPS, Memory, Draw Calls, and Triangles.
- 🎯 **Unified Labeling System** - Combined 3D annotations and callouts with occlusion detection and distance culling.
- 📦 **Tree-Shaking Support** - Pure ES Modules for minimal bundle size.
- 🎨 **Seamless Integration** - Works perfectly with Vue 3, React, and Vanilla JavaScript.
- 📝 **Professional Documentation** - Full JSDoc coverage and verified best practice workflows.

---

## 📦 Installation

```bash
npm install @chocozhang/three-model-render@latest
# or
pnpm add @chocozhang/three-model-render@latest
```

**Peer Dependencies:**
```bash
npm install three@^0.160.0
```

---

## 🚀 v3.0 Performance Black Magic

In v3.0, we introduced aggressive optimization techniques to ensure smooth experiences even in complex scenes.

### 1. Object Pooling System
Reuse high-frequency objects like `Vector3`, `Box3`, and `Matrix4` to minimize Garbage Collection (GC) overhead.
*   **Benefit**: ~70% reduction in GC-related stutters.

### 2. Automatic Frustum Culling
Hover effects and click handlers now automatically skip off-screen objects, performing raycasting only on visible targets.
*   **Benefit**: ~70% reduction in raycasting overhead in complex scenes.

### 3. Smart Throttling
Calculations are automatically throttled when the camera is static or the user is idle, entering a low-power state.

---

## 📊 Performance Monitor

v3.0 adds a lightweight monitoring overlay to help you understand your scene's health.

```typescript
import { createPerformanceMonitor } from '@chocozhang/three-model-render/ui';

const perfMonitor = createPerformanceMonitor({
    position: 'top-left',
    renderer: renderer,
    enableWarnings: true // Alerts for low FPS or high memory usage
});

// Inside your animation loop
function animate() {
    perfMonitor.update();
    renderer.render(scene, camera);
}
```

---

## 🚀 Best Practice Workflow

### 1. Basic Scene & Model Loading
```typescript
import { loadModelByUrl } from '@chocozhang/three-model-render';

const model = await loadModelByUrl('path/to/model.glb', {
    manager: new THREE.LoadingManager(() => console.log('Loaded'))
});
scene.add(model);
```

### 2. Automated Scene Setup
```typescript
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup';

// Single call for studio-grade lighting and optimal camera framing
autoSetupCameraAndLight(camera, scene, model);
```

### 3. Unified Labeling
Supports both 'simple' (overhead) and 'line' (callout) professional styles.

```typescript
import { createModelsLabel } from '@chocozhang/three-model-render/ui';

const labelManager = createModelsLabel(camera, renderer, model, labelsMap, {
    style: 'line',
    lift: 100, // Callout line length
    enableOcclusionDetection: true // Hide labels behind geometry
});
```

### 4. Interactive Effects
```typescript
import { initPostProcessing, enableHoverBreath } from '@chocozhang/three-model-render';

const ppManager = initPostProcessing(renderer, scene, camera);
const hoverController = enableHoverBreath({
    camera, scene, renderer, 
    outlinePass: ppManager.outlinePass,
    enableFrustumCulling: true // Highly recommended in v3.0
});
```

---

## 📚 Complete Feature Overview

### **Core Utilities (Core `/core`)**

#### 🎯 Model Loading & Resource Management
- **`loadModelByUrl`** - Asynchronous GLTF/GLB model loading with loading manager support
- **`disposeObject`** - Deep cleanup of Three.js objects to prevent memory leaks
- **`objectPool`** - Global object pool system (`globalPools`), reduces GC pressure by 70%

#### ✨ Post-Processing & Interactive Effects
- **`initPostProcessing`** - High-performance post-processing pipeline with built-in OutlinePass
- **`enableHoverBreath`** - Intelligent hover highlights with frustum culling and throttling
- **`createModelClickHandler`** - Model click event handling with integrated raycasting

### **Camera Control (Camera `/camera`)**
- **`followModels`** - Smooth camera transitions with multiple preset angles and easing functions
- **`setView`** - One-click switching between 6 preset views (front/back/left/right/top/iso)
- **`FOLLOW_ANGLES`** - Predefined camera angle constants

### **Interaction Effects (Interaction `/interaction`)**
- **`LiquidFillerGroup`** - Liquid filling animations with batch object support
- Features: realistic wave effects, adjustable fill speed, automatic restore function

### **Visual Effects (Effect `/effect`)**
- **`GroupExploder`** - Intelligent model explosion/disassembly system
- Modes: `grid` (grid layout) | `radial` (radial) | `random` (random)
- Features: automatic camera following, part dimming, customizable spacing and lift height

### **UI Components (UI `/ui`)**

#### 📊 Performance Monitoring
- **`createPerformanceMonitor`** - Real-time performance overlay panel
- Metrics: FPS, memory usage, draw calls, triangle count
- Features: automatic warnings, configurable thresholds, minimal overhead design

#### 🏷️ Unified Labeling System
- **`createModelsLabel`** - Professional 3D annotation system
- **Style Modes**:
  - `'simple'`: Overhead text labels (lightweight)
  - `'line'`: Callout lines + status dots (professional)
- **Advanced Features**:
  - Occlusion detection (auto-hide when objects are occluded)
  - Distance culling (auto-hide beyond max distance)
  - Smart throttling (pause updates when camera is static)
  - Object pool optimization (reuse Vector3/Box3)

### **Scene Setup (Setup `/setup`)**
- **`autoSetupCameraAndLight`** - Studio-grade lighting and camera auto-configuration
- Includes: ambient light, main light source, fill lights, optimal viewpoint calculation

---

## 💡 Complete Usage Examples

### Basic Scene Setup
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

### Add Interactive Highlight & Click
```typescript
import { initPostProcessing, enableHoverBreath, createModelClickHandler, followModels, FOLLOW_ANGLES } from '@chocozhang/three-model-render'

const { composer, outlinePass } = initPostProcessing(renderer, scene, camera)

// Hover highlight (v3.0 performance optimizations)
const hoverCtrl = enableHoverBreath({
  camera, scene, renderer, outlinePass,
  enableFrustumCulling: true,  // 🔥 Enable frustum culling
  throttleDelay: 16             // 60fps throttling
})

// Click to focus
const dispose = createModelClickHandler(camera, scene, renderer, outlinePass, (object, info) => {
  console.log('Clicked:', object.name, info)
  followModels(camera, object, {
    ...FOLLOW_ANGLES.ISOMETRIC,
    duration: 1500,
    controls
  })
})
```

### Liquid Filling Effect
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

filler.fillTo(targetMeshes, 0.8)  // Fill to 80%
// filler.restoreAll()  // Restore original state
```

### Model Explosion & Disassembly
```typescript
import { GroupExploder } from '@chocozhang/three-model-render/effect'

const exploder = new GroupExploder(scene, camera, controls)
exploder.init()

const parts = new Set()
model.traverse(child => {
  if (child.name.includes('component')) parts.add(child)
})

exploder.setMeshes(parts, { autoRestorePrev: true })
exploder.explode({
  mode: 'grid',
  spacing: 2.8,
  duration: 1100,
  lift: 1.2,
  cameraPadding: 0.8,
  dimOthers: { enabled: true, opacity: 0.1 }
})

// exploder.restore(600)  // 600ms restore animation
```

### Professional Labeling System
```typescript
import { createModelsLabel } from '@chocozhang/three-model-render/ui'

const labelsMap = {
  'engine': 'Engine',
  'wheel': 'Wheel',
  'chassis': 'Chassis'
}

const labelMgr = createModelsLabel(camera, renderer, model, labelsMap, {
  style: 'line',                      // Callout style
  lift: 120,                          // Line length
  enableOcclusionDetection: true,     // 🔥 Occlusion detection
  occlusionCheckInterval: 3,          // Check every 3 frames
  maxDistance: 50,                    // Distance culling
  cameraMoveThreshold: 0.001          // Camera movement threshold optimization
})
```

### Performance Monitor Panel
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

// In render loop
function animate() {
  perfMonitor.update()  // ✅ Must call
  composer.render()     // or renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

### Resource Cleanup (Prevent Memory Leaks)
```typescript
import { disposeObject } from '@chocozhang/three-model-render'

// Component unmount
disposeObject(model)
hoverCtrl?.dispose()
dispose?.()  // Click handler
exploder?.dispose()
filler?.dispose()
labelMgr?.dispose()
perfMonitor?.dispose()
controls?.dispose()
renderer?.dispose()
```

---

## 🎨 Complete Example Projects

Both example projects demonstrate the **complete integration of all 16+ tools**:

- 👉 **[Vue 3 Complete Example (Recommended)](https://github.com/HappyColour/three-model-render/tree/main/examples/vue-example)**
  - Includes: liquid filling, model explosion, smart labels, performance monitoring, and all features
  - TypeScript + Composition API best practices
  
- 👉 **[Vanilla HTML Example](https://github.com/HappyColour/three-model-render/tree/main/examples/html-example)**
  - Zero build tools, directly use via CDN
  - Perfect for rapid prototyping

---

## 🔧 Advanced Configuration

### Object Pool Usage (Advanced)
```typescript
import { globalPools, withPooledVector3 } from '@chocozhang/three-model-render'

// Method 1: Manual management
const v = globalPools.vector3.acquire()
v.set(1, 2, 3)
// ... use v ...
globalPools.vector3.release(v)

// Method 2: Automatic management (recommended)
const distance = withPooledVector3(v => {
  v.set(1, 2, 3)
  return v.length()
})  // Auto-release
```

### View Switching
```typescript
import { setView } from '@chocozhang/three-model-render'

setView(camera, controls, model, 'front')   // Front view
setView(camera, controls, model, 'iso')     // Isometric (45°)
```

---

## 📄 License

MIT © [Danny Zhang]
