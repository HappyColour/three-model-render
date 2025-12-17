# three-model-render

> 🚀 Professional Three.js Model Visualization and Interaction Toolkit

English | [中文](./README.md)

A high-performance, TypeScript-first toolkit providing 14 optimized utilities for Three.js model visualization and interaction.

> 🌟 **[Live Demo: Experience the Power](https://happycolour.github.io/)**

[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](https://github.com/HappyColour/three-model-render)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🎯 **14 High-Performance Utilities** - Covering all aspects of model visualization
- 📦 **Tree-Shakable** - Import only what you need
- 🔷 **TypeScript First** - Full type definitions and IntelliSense support
- ⚡ **Optimized** - 55% less CPU usage, 33% less memory
- 🎨 **Easy Integration** - Works with Vue, React, and vanilla JS
- 📝 **Well Documented** - Comprehensive API docs and examples

---

## 📦 Installation

```bash
npm install @chocozhang/three-model-render@latest
# OR
yarn add @chocozhang/three-model-render@latest
# OR
pnpm add @chocozhang/three-model-render@latest
```

**Peer Dependencies:**
```bash
npm install three@^0.160.0
```

---

## 🚀 Best Practice Workflow

Build a professional 3D viewer following our optimized integration pattern. This workflow ensures maximum performance and visual quality.

### 1. Core Setup & Model Loading
Initialize your basic Three.js scene and load your model using our optimized loader.

```typescript
import { loadModelByUrl } from '@chocozhang/three-model-render';

// 1. Basic Three.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);

// 2. Load Model with Progress
const model = await loadModelByUrl('path/to/model.glb', {
    manager: new THREE.LoadingManager(() => console.log('Loaded'))
});
scene.add(model);
```

### 2. Auto-Configuration (Critical Step)
Automatically position the camera and setup studio-quality lighting based on the model's bounding box.

```typescript
import { autoSetupCameraAndLight } from '@chocozhang/three-model-render/setup';

// Automatically calculates optimal camera distance and lighting
autoSetupCameraAndLight(camera, scene, model);
```

### 3. Cinematic Entrance
Create a smooth entry animation to focus on the model.

```typescript
import { followModels, FOLLOW_ANGLES } from '@chocozhang/three-model-render';

followModels(camera, model, {
    ...FOLLOW_ANGLES.FRONT,
    duration: 1500,
    padding: 0.6,
    controls,
    easing: 'easeInOut'
});
```

### 4. Post-Processing & Hover Effects
Enable high-performance post-processing and optimized hover effects (saves 80% CPU when idle).

```typescript
import { initPostProcessing, enableHoverBreath } from '@chocozhang/three-model-render';

// 1. Initialize Post-Processing Manager
const ppManager = initPostProcessing(renderer, scene, camera, {
    resolutionScale: 0.8, // Optimize performance
    edgeStrength: 4,
    visibleEdgeColor: '#ffee00'
});

// 2. Enable Smart Hover Effect
const hoverController = enableHoverBreath({
    camera,
    scene,
    renderer,
    outlinePass: ppManager.outlinePass,
    throttleDelay: 16, // 60fps limit
    minStrength: 2,
    maxStrength: 8,
    speed: 3
});

// IMPORTANT: Add composer to your animation loop
function animate() {
    // ...
    ppManager.composer.render();
}
```

### 5. Interaction Handling
Add intelligent click handling that zooms to parts and triggers actions.

```typescript
import { createModelClickHandler } from '@chocozhang/three-model-render';

const disposeClickHandler = createModelClickHandler(
    camera, 
    scene, 
    renderer, 
    ppManager.outlinePass, 
    (object, info) => {
        console.log('Clicked:', info);
        
        // Zoom to clicked part
        followModels(camera, object, {
            ...FOLLOW_ANGLES.ISOMETRIC,
            duration: 1500
        });
    }
);
```

### 6. Advanced Effects (Explosion)
Add interactive mesh explosion/disassembly effects.

```typescript
import { GroupExploder } from '@chocozhang/three-model-render';

// Initialize
const exploder = new GroupExploder(scene, camera, controls);
exploder.init();

// Set Targets
exploder.setMeshes(targetMeshes);

// Explode
exploder.explode({ 
    mode: 'grid', 
    spacing: 2.8, 
    dimOthers: { enabled: true, opacity: 0.1 } 
});

// Restore
exploder.restore(600);
```

### 7. View Control
Easily switch between standard views.

```typescript
import { setView } from '@chocozhang/three-model-render';

// Switch to Top View
setView(camera, controls, model, 'top');
// Switch to Isometric
setView(camera, controls, model, 'iso');
```

---

## 📚 Module Overview

### **Core (`/core`)**
- `initPostProcessing`: Performance-optimized post-processing manager.
- `enableHoverBreath`: Idle-aware hover effects.
- `addChildModelLabels`: 3D labeling system.

### **Camera (`/camera`)**
- `followModels`: Smooth camera transitions.
- `setView`: Preset view switching (Top, Front, Iso, etc.).

### **Loader (`/loader`)**
- `loadModelByUrl`: Robust model loader (GLTF, FBX, OBJ).
- `BlueSky`: Environment map manager.

### **Interaction (`/interaction`)**
- `createModelClickHandler`: Raycasting click handler.

### **Effect (`/effect`)**
- `GroupExploder`: Mesh disassembly animations.

### **Setup (`/setup`)**
- `autoSetupCameraAndLight`: Instant scene configuration.

---

## 🎨 HTML/Vue 3 Example

We provide complete, deployable examples demonstrating all features:

- 👉 **[Vue 3 Example (Recommended)](https://github.com/HappyColour/three-model-render/tree/main/examples/vue-example)** - Complete Vue 3 + TypeScript integration best practices
- 👉 **[HTML/Vanilla JS Example](https://github.com/HappyColour/three-model-render/tree/main/examples/html-example)** - Suitable for Vanilla JS / jQuery projects

---

## 📄 License

MIT © [Danny Zhang]
