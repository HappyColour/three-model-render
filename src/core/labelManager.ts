/**
 * @file labelManager.ts
 * @description
 * Manages HTML labels attached to 3D objects. Efficiently updates label positions based on camera movement.
 *
 * @best-practice
 * - Use `addChildModelLabels` to label parts of a loaded model.
 * - Labels are HTML elements overlaid on the canvas.
 * - Supports performance optimization via caching and visibility culling.
 */

import * as THREE from 'three';

interface LabelOptions {
  fontSize?: string;       // Label font size
  color?: string;          // Font color
  background?: string;     // Background color
  padding?: string;        // Padding
  borderRadius?: string;   // Border radius
  updateInterval?: number; // Update interval (ms), default updates every frame. Set to >0 to update on interval.
  enableCache?: boolean;   // Whether to enable bounding box caching, default true
}

interface LabelManager {
  pause: () => void;
  resume: () => void;
  dispose: () => void;
  isRunning: () => boolean;
}

/**
 * Add overhead labels to child models (supports Mesh and Group)
 *
 * Features:
 * - Caches bounding boxes to avoid repetitive calculation every frame
 * - Supports pause/resume
 * - Configurable update interval to reduce CPU usage
 * - Automatically pauses when hidden
 *
 * @param camera THREE.Camera - Scene camera
 * @param renderer THREE.WebGLRenderer - Renderer, used for screen size
 * @param parentModel THREE.Object3D - FBX root node or Group
 * @param modelLabelsMap Record<string,string> - Map of model name to label text
 * @param options LabelOptions - Optional label style configuration
 * @returns LabelManager - Management interface containing pause/resume/dispose
 */
export function addChildModelLabels(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  parentModel: THREE.Object3D,
  modelLabelsMap: Record<string, string>,
  options?: LabelOptions
): LabelManager {
  // Defensive check: ensure parentModel is loaded
  if (!parentModel || typeof parentModel.traverse !== 'function') {
    console.error('parentModel invalid, please ensure the FBX model is loaded');
    return {
      pause: () => { },
      resume: () => { },
      dispose: () => { },
      isRunning: () => false
    };
  }

  // Configuration
  const enableCache = options?.enableCache !== false;
  const updateInterval = options?.updateInterval || 0;

  // Create label container, absolute positioning, attached to body
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.pointerEvents = 'none'; // Avoid blocking mouse events
  container.style.zIndex = '1000';
  document.body.appendChild(container);

  // Save model object and cached bounding box corresponding to each label
  interface LabelData {
    object: THREE.Object3D;
    el: HTMLDivElement;
    cachedBox: THREE.Box3;
    cachedTopPos: THREE.Vector3;
    needsUpdate: boolean;
  }
  const labels: LabelData[] = [];

  // State management
  let rafId: number | null = null;
  let isPaused = false;
  let lastUpdateTime = 0;

  // Traverse all child models
  parentModel.traverse((child: any) => {
    // Only process Mesh or Group
    if ((child.isMesh || child.type === 'Group')) {
      // Dynamic matching of name to prevent undefined
      const labelText = Object.entries(modelLabelsMap).find(([key]) => child.name.includes(key))?.[1];
      if (!labelText) return; // Skip if no matching label

      // Create DOM label
      const el = document.createElement('div');
      el.innerText = labelText;

      // Styles defined in JS, can be overridden via options
      el.style.position = 'absolute';
      el.style.color = options?.color || '#fff';
      el.style.background = options?.background || 'rgba(0,0,0,0.6)';
      el.style.padding = options?.padding || '4px 8px';
      el.style.borderRadius = options?.borderRadius || '4px';
      el.style.fontSize = options?.fontSize || '14px';
      el.style.transform = 'translate(-50%, -100%)'; // Position label directly above the model
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'none';
      el.style.transition = 'opacity 0.2s ease';

      // Append to container
      container.appendChild(el);

      // Initialize cache
      const cachedBox = new THREE.Box3().setFromObject(child);
      const center = new THREE.Vector3();
      cachedBox.getCenter(center);
      const cachedTopPos = new THREE.Vector3(center.x, cachedBox.max.y, center.z);

      labels.push({
        object: child,
        el,
        cachedBox,
        cachedTopPos,
        needsUpdate: true
      });
    }
  });

  /**
   * Update cached bounding box (called only when model transforms)
   */
  const updateCache = (labelData: LabelData) => {
    labelData.cachedBox.setFromObject(labelData.object);
    const center = new THREE.Vector3();
    labelData.cachedBox.getCenter(center);
    labelData.cachedTopPos.set(center.x, labelData.cachedBox.max.y, center.z);
    labelData.needsUpdate = false;
  };

  /**
   * Get object top world coordinates (using cache)
   */
  const getObjectTopPosition = (labelData: LabelData): THREE.Vector3 => {
    if (enableCache) {
      // Check if object has transformed
      if (labelData.needsUpdate || labelData.object.matrixWorldNeedsUpdate) {
        updateCache(labelData);
      }
      return labelData.cachedTopPos;
    } else {
      // Do not use cache, recalculate every time
      const box = new THREE.Box3().setFromObject(labelData.object);
      const center = new THREE.Vector3();
      box.getCenter(center);
      return new THREE.Vector3(center.x, box.max.y, center.z);
    }
  };

  /**
   * Update label positions function
   */
  function updateLabels(timestamp: number = 0) {
    // Check pause state
    if (isPaused) {
      rafId = null;
      return;
    }

    // Check update interval
    if (updateInterval > 0 && timestamp - lastUpdateTime < updateInterval) {
      rafId = requestAnimationFrame(updateLabels);
      return;
    }
    lastUpdateTime = timestamp;

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    labels.forEach((labelData) => {
      const { el } = labelData;
      const pos = getObjectTopPosition(labelData); // Use cached top position
      pos.project(camera); // Convert to screen coordinates

      const x = (pos.x * 0.5 + 0.5) * width; // Screen X
      const y = (-(pos.y * 0.5) + 0.5) * height; // Screen Y

      // Control label visibility (hidden when behind camera)
      const isVisible = pos.z < 1;
      el.style.opacity = isVisible ? '1' : '0';
      el.style.display = isVisible ? 'block' : 'none';
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`; // Screen position
    });

    rafId = requestAnimationFrame(updateLabels); // Loop update
  }

  // Start update
  updateLabels();

  /**
   * Pause updates
   */
  const pause = () => {
    isPaused = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  /**
   * Resume updates
   */
  const resume = () => {
    if (!isPaused) return;
    isPaused = false;
    updateLabels();
  };

  /**
   * Check if running
   */
  const isRunning = () => !isPaused;

  /**
   * Cleanup function: Remove all DOM labels, cancel animation, avoid memory leaks
   */
  const dispose = () => {
    pause();
    labels.forEach(({ el }) => {
      if (container.contains(el)) {
        container.removeChild(el);
      }
    });
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    labels.length = 0;
  };

  return {
    pause,
    resume,
    dispose,
    isRunning
  };
}
