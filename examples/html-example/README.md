# HTML/Vue 3 Best Practice Example

This directory contains a **standalone HTML version** of the `ModelViewer.vue` component, showcasing how to use `three-model-render` in a pure HTML/JS environment using Vue 3 (ESM) and Three.js.

## 🚀 Overview

This example demonstrates a complete 3D model viewer with advanced features, all contained within a single `index.html` file. It bridges the gap between complex Vue bundle-based development and simple script-tag usage.

## 🛠 Prerequisites

Because this project uses **ES Modules** (imports in the browser), you cannot simply double-click the `index.html` file. You must run it through a local web server to avoid CORS (Cross-Origin Resource Sharing) errors.

### Common Ways to Run Locally

1. **Using Node.js (npx)**:
   ```bash
   # Run from the project root or this folder
   npx http-server .
   # Open http://localhost:8080/examples/html-example/
   ```

2. **Using VS Code Live Server**:
   - Install the "Live Server" extension.
   - Right-click `index.html` and select "Open with Live Server".

## 📦 Deployment

To deploy this example:

1. **Upload** `index.html` to your web server.
2. **Library Dependency**:
   - **Default**: Imports from `unpkg` CDN (no build required).
   - **Local Development**: If you want to use the local `dist` folder:
     1. Run `npm run build` in the root.
     2. Update the import map in `index.html` to point to `../../dist/index.mjs`.

## ✨ Features

This example replicates the full functionality of the original Vue component:

- **Automatic Scene Setup**: Effortless camera and lighting configuration.
- **Cinematic Entrance**: Smooth camera animation upon loading.
- **Interactive Views**: Switch between Front, Top, ISO, etc.
- **Explode/Restore**: Animated "Explode" view for model parts.
- **Smart Hover Effects**: High-performance glow/outline on hover.
- **Click Interaction**: Click parts to focus camera and view metadata.

## 📂 File Structure

- `index.html`: The complete application (HTML + CSS + Logic).
- `README.md`: This documentation.
- `...`: Relies on `node_modules` or CDNs for dependencies.
