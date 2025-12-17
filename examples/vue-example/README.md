# Three Model Render - Vue Example

This is a **complete runnable** example project demonstrating how to use all 14 tools from the `@chocozhang/three-model-render` package.

## 🚀 Quick Start

### 1. Build the main package

First, ensure the main package is built:

```bash
# In the project root directory
pnpm install
pnpm run build
```

### 2. Install example project dependencies

```bash
# Enter the example directory
cd examples/vue-example
pnpm install
```

### 3. Run the example

```bash
pnpm run dev
```

Open your browser and visit `http://localhost:5173`

---

## ✨ Demonstrated Tools (14/14)

### Setup (1) ✅
- **autoSetupCameraAndLight** - Automatically set optimal lighting and camera position

### Core (3) ✅
- **addChildModelLabels** - Add real-time following labels to sub-meshes
- **enableHoverBreath** - Breathing highlight effect on hover
- **initPostProcessing** - Initialize post-processing (OutlinePass)

### Interaction (3) ✅
- **createModelClickHandler** - Model click event handler
- **ArrowGuide** - Arrow guide to specific objects
- **LiquidFillerGroup** - Liquid level filling animation

### Camera (2) ✅
- **followModels** - Camera smoothly follows models
- **setView** - Quickly switch predefined views (Front/Back/Left/Right/Top/ISO)

### Loader (3) ✅
- **loadModelByUrl** - Automatically detect format and load models
- **SkyboxLoader** - Load skyboxes
- **BlueSky** - Built-in blue sky environment

### UI (1) ✅
- **createModelsLabel** - 3D Labels

### Effect (1) ✅
- **GroupExploder** - Exploded view (Ring/Spiral/Grid/Radial)

---

## 📂 Project Structure

```
vue-example/
├── package.json          # Dependency configuration
├── vite.config.js        # Vite configuration
├── index.html            # HTML Entry
├── src/
│   ├── main.js           # Vue Application Entry
│   ├── App.vue           # Root Component
│   └── components/
│       └── ModelViewer.vue  # Core 3D Viewer (Example of using all tools)
└── README.md
```

---

## 💻 Code Highlights

### 1. Correct Import Method

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

### 2. Model Loading (Using loadModelByUrl)

```javascript
const loadModel = async (file) => {
  const url = URL.createObjectURL(file)
  
  // ✅ Detect format and load automatically
  const model = await loadModelByUrl(url, {
    mergeGeometries: false,
    maxTextureSize: 2048
  })
  
  scene.add(model)
}
```

### 3. Enabling Features

```javascript
// ✅ Auto Lights
const toggleAutoLights = () => {
  if (enabled) {
    managers.value.autoLights = autoSetupCameraAndLight(
      camera, scene, currentModel, { enableShadows: true }
    )
  } else {
    managers.value.autoLights.dispose()
  }
}

// ✅ Labels
const toggleChildLabels = () => {
  managers.value.childLabels = addChildModelLabels(
    camera, renderer, currentModel, labelMap, { enableCache: true }
  )
}

// ✅ Camera View
await setView(camera, controls, currentModel, 'front', { duration: 800 })

// ✅ Exploded View
const exploder = new GroupExploder(scene, camera, controls)
exploder.explode({ mode: 'spiral', distance: 3 })
```

### 4. Resource Cleanup

```javascript
// ✅ Using disposeObject
const disposeModel = () => {
  // Clean up all managers
  Object.values(managers.value).forEach(mgr => {
    if (mgr?.dispose) mgr.dispose()
    else if (typeof mgr === 'function') mgr()
  })
  
  // Dispose model
  if (currentModel) {
    disposeObject(currentModel)
    scene.remove(currentModel)
  }
}
```

---

## 🎮 Usage Flow

1. **Upload Model** - Drag or click to upload GLTF/GLB/FBX/OBJ files
2. **Enable Features** - Use the switches on the right control panel
3. **Test Interaction** - Click models, hover effects, switch views, etc.
4. **View Effects** - Exploded view, liquid filling, arrow guide, etc.

---

## 🔧 Custom Configuration

### Modify Vite Config to use npm package

If you want to use the published npm package instead of the local build:

```javascript
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  // Remove alias configuration
  optimizeDeps: {
    include: ['three', '@chocozhang/three-model-render']
  }
})
```

Then install the package:

```bash
pnpm add @chocozhang/three-model-render
```

---

## 📚 Learning Resources

- **View Source Code** - `src/components/ModelViewer.vue` contains examples of all tools
- **API Documentation** - `../../README.md`

---

## ❓ FAQ
### Q: How to debug?
**A**: 
- Open browser console to check logs
- Check Three.js scene objects
- Use Vue DevTools

### Q: Performance optimization suggestions?
**A**:
- Reduce post-processing resolution (`resolutionScale: 0.5`)
- Reduce label update frequency (`updateInterval: 66`)
- Use model geometry merging

---

## 🎯 What can you learn from this example?

1. ✅ How to install and import the package
2. ✅ How to use the API of each tool
3. ✅ How to manage the state of multiple features
4. ✅ How to properly clean up resources
5. ✅ Complete Vue3 integration best practices

---

**Start Exploring!** 🚀

Feel free to check the source code or submit an Issue if you have any questions.
