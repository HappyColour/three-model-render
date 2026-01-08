/**
 * @file modelsLabel.ts
 * @description
 * Creates interactive 2D labels (DOM elements) attached to 3D objects.
 * unified tool replacing the old labelManager.ts and modelsLabel.ts.
 *
 * @best-practice
 * - Use `createModelsLabel` to annotate parts of a model.
 * - set `style: 'line'` (default) for labels with connecting lines and pulsing dots.
 * - set `style: 'simple'` for simple overhead labels (like the old labelManager).
 */

import * as THREE from 'three';
import { globalPools } from '../core/objectPool';

/**
 * Configuration options for the labeling system.
 */
interface LabelOptions {
  /** 
   * Label style: 
   * - 'simple': Traditional overhead text label.
   * - 'line': Modern callout with a connecting line and pulsing status dot.
   */
  style?: 'simple' | 'line';
  /** Font size for the label text. Default is '12px'. */
  fontSize?: string;
  /** Text color. Default is '#ffffff'. */
  color?: string;
  /** Background color of the label. Supports CSS color strings. */
  background?: string;
  /** CSS padding for the label. Default is '6px 10px'. */
  padding?: string;
  /** CSS border radius for the label. Default is '6px'. */
  borderRadius?: string;
  /** 
   * Vertical lift amount in pixels. 
   * For 'line' style, this determines the length of the callout line. 
   */
  lift?: number;
  /** Diameter of the status dot in pixels (for 'line' style). */
  dotSize?: number;
  /** Spacing between the status dot and the label text. */
  dotSpacing?: number;
  /** Color of the connecting line. */
  lineColor?: string;
  /** Width of the connecting line in pixels. */
  lineWidth?: number;
  /** Throttling interval for position updates in milliseconds. 0 is per-frame. */
  updateInterval?: number;
  /** Duration of the fade-in animation in milliseconds. */
  fadeInDuration?: number;
  /** Number of frames to skip between occlusion checks. Increase to improve performance. */
  occlusionCheckInterval?: number;
  /** Whether to enable raycasting-based occlusion detection. Default is true. */
  enableOcclusionDetection?: boolean;
  /** Threshold for camera movement to trigger an update. Higher values reduce CPU usage. */
  cameraMoveThreshold?: number;
  /** Maximum distance from camera at which labels are visible. */
  maxDistance?: number;
}

/**
 * Interface for controlling the label system instance.
 */
interface LabelManager {
  /** Rebuilds labels for a different model. */
  updateModel: (model: THREE.Object3D) => void;
  /** Updates the mapping of mesh names to label text. */
  updateLabelsMap: (map: Record<string, string>) => void;
  /** Temporarily stops position updates and occlusion checks. */
  pause: () => void;
  /** Resumes position updates. */
  resume: () => void;
  /** Completely removes all labels and cleans up resources. */
  dispose: () => void;
  /** Returns the current running state. */
  isRunning: () => boolean;
}

/**
 * Initializes the unified labeling system for a specific model.
 * 
 * Performance:
 * - Uses Object Pooling for all Vector3/Box3 operations to minimize GC.
 * - Throttles updates based on camera movement and configurable intervals.
 * - Optimized occlusion detection with frame-skipping.
 *
 * @param {THREE.Camera} camera - The active camera used for projection.
 * @param {THREE.WebGLRenderer} renderer - The renderer used for dimension calculations.
 * @param {THREE.Object3D} parentModel - The model to search for meshes to label.
 * @param {Record<string, string>} modelLabelsMap - Mapping of part name substrings to label text.
 * @param {LabelOptions} [options] - Configuration for styles and performance.
 * @returns {LabelManager} Controls to manage the lifecycle of the labels.
 */
export function createModelsLabel(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  parentModel: THREE.Object3D,
  modelLabelsMap: Record<string, string>,
  options?: LabelOptions
): LabelManager {
  const defaults = {
    style: 'line',
    fontSize: '12px',
    color: '#ffffff',
    background: '#1890ff',
    padding: '6px 10px',
    borderRadius: '6px',
    lift: 100,
    dotSize: 6,
    dotSpacing: 2,
    lineColor: 'rgba(200,200,200,0.7)',
    lineWidth: 1,
    updateInterval: 0,
    fadeInDuration: 300,
    // Performance defaults
    occlusionCheckInterval: 3,
    enableOcclusionDetection: true,
    cameraMoveThreshold: 0.001,
    maxDistance: Infinity,
  };

  // Merge options with defaults
  const cfg = {
    ...defaults,
    ...options,
    // Special handling: if style is simple, default lift should be 0 unless specified logic overrides it.
    // But to keep it clean, we'll handle lift logic in render.
  };

  // If simple style is requested, force lift to 0 if not explicitly provided (optional heuristic, 
  // but to match labelManager behavior which sits right on top, lift=0 is appropriate).
  // However, explicit options.lift should be respected.
  if (options?.style === 'simple' && options.lift === undefined) {
    cfg.lift = 0;
  }

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';
  document.body.appendChild(container);

  // SVG only needed for 'line' style
  let svg: SVGElement | null = null;
  const svgNS = 'http://www.w3.org/2000/svg';

  if (cfg.style === 'line') {
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';
    container.appendChild(svg);
  }

  let currentModel = parentModel;
  let currentLabelsMap = { ...modelLabelsMap };

  // Cache bounding box
  interface LabelData {
    object: THREE.Object3D;
    el: HTMLDivElement;
    wrapper: HTMLDivElement;
    dot?: HTMLDivElement;     // Only for line style
    line?: SVGLineElement;    // Only for line style
    cachedBox: THREE.Box3 | null;
    cachedTopPos: THREE.Vector3 | null;
  }

  let labels: LabelData[] = [];
  let isActive = true;
  let isPaused = false;
  let rafId: number | null = null;
  let lastUpdateTime = 0;

  // Performance optimization variables
  let frameCounter = 0;
  const occlusionCache = new Map<LabelData, boolean>();
  const prevCameraPosition = new THREE.Vector3();
  const prevCameraQuaternion = new THREE.Quaternion();
  let cameraHasMoved = true; // Initial state: force first update

  // Inject styles (with fade-in animation)
  const styleId = 'three-model-label-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes pulse-dot {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.6); opacity: 0.45; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fade-in-label {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .tm-label {
        pointer-events: none;
        display: inline-block;
        line-height: 1;
        will-change: transform, opacity;
        transition: opacity 150ms ease;
      }
      .tm-label-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 8px; /* Default gap */
        animation: fade-in-label ${cfg.fadeInDuration}ms ease-out;
      }
      .tm-label-dot {
        border-radius: 50%;
        will-change: transform, opacity;
        animation: pulse-dot 1.2s infinite ease-in-out;
      }
      .tm-label-text {
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  // Get or update cached top position (optimized with object pooling)
  const getObjectTopPosition = (labelData: LabelData): THREE.Vector3 => {
    const obj = labelData.object;

    // If cached and object hasn't transformed, return cached
    if (labelData.cachedTopPos && !obj.matrixWorldNeedsUpdate) {
      return labelData.cachedTopPos.clone();
    }

    // Recalculate using pooled objects
    const box = globalPools.box3.acquire();
    box.setFromObject(obj);

    let result: THREE.Vector3;

    if (!box.isEmpty()) {
      const center = globalPools.vector3.acquire();
      box.getCenter(center);
      const topPos = new THREE.Vector3(center.x, box.max.y, center.z);
      labelData.cachedTopPos = topPos;
      result = topPos.clone();
      globalPools.vector3.release(center);
    } else {
      const p = globalPools.vector3.acquire();
      obj.getWorldPosition(p);
      labelData.cachedTopPos = p.clone();
      result = p.clone();
      globalPools.vector3.release(p);
    }

    // Store box in cache instead of releasing (we cache it)
    labelData.cachedBox = box.clone();
    globalPools.box3.release(box);

    return result;
  };

  const clearLabels = () => {
    labels.forEach(({ el, line, wrapper }) => {
      el.remove();
      wrapper.remove();
      if (line && line.parentNode) line.parentNode.removeChild(line);
    });
    labels = [];
    occlusionCache.clear(); // Clear occlusion cache
    frameCounter = 0; // Reset frame counter
  };

  const rebuildLabels = () => {
    clearLabels();
    if (!currentModel) return;

    currentModel.traverse((child: any) => {
      // Only process Mesh or Group
      if ((child.isMesh || child.type === 'Group')) {
        const labelText = Object.entries(currentLabelsMap).find(([key]) =>
          child.name.includes(key)
        )?.[1];
        if (!labelText) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'tm-label-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.willChange = 'transform'; // Hint for GPU acceleration
        wrapper.style.zIndex = '1';

        // Adjust gap for simple mode (no gap needed as there is no dot)
        if (cfg.style === 'simple') {
          wrapper.style.gap = '0';
        }

        const el = document.createElement('div');
        el.className = 'tm-label';
        el.style.background = cfg.background!;
        el.style.color = cfg.color!;
        el.style.padding = cfg.padding!;
        el.style.borderRadius = cfg.borderRadius!;
        el.style.fontSize = cfg.fontSize!;
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
        el.style.backdropFilter = 'blur(4px)';
        el.style.border = '1px solid rgba(255,255,255,0.03)';
        el.style.display = 'inline-block';

        // Optional: Allow simple mode to override some defaults to look more like old labelManager if needed.
        // But sticking to the unified styles is better.

        const txt = document.createElement('div');
        txt.className = 'tm-label-text';
        txt.innerText = labelText;
        el.appendChild(txt);

        let dot: HTMLDivElement | undefined;
        let line: SVGLineElement | undefined;

        if (cfg.style === 'line') {
          dot = document.createElement('div');
          dot.className = 'tm-label-dot';
          dot.style.width = `${cfg.dotSize}px`;
          dot.style.height = `${cfg.dotSize}px`;
          dot.style.background = 'radial-gradient(circle at 30% 30%, #fff, rgba(255,255,255,0.85) 20%, rgba(255,204,0,0.9) 60%, rgba(255,170,0,0.9) 100%)';
          dot.style.boxShadow = '0 0 8px rgba(255,170,0,0.9)';
          dot.style.flex = '0 0 auto';
          dot.style.marginRight = `${cfg.dotSpacing}px`;

          wrapper.appendChild(dot);

          if (svg) {
            line = document.createElementNS(svgNS, 'line');
            line.setAttribute('stroke', cfg.lineColor!);
            line.setAttribute('stroke-width', `${cfg.lineWidth}`);
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('opacity', '0.85');
            svg.appendChild(line);
          }
        }

        wrapper.appendChild(el);
        container.appendChild(wrapper);

        labels.push({
          object: child,
          el,
          wrapper,
          dot,
          line,
          cachedBox: null,
          cachedTopPos: null
        });
      }
    });
  };

  rebuildLabels();

  // Raycaster for occlusion detection
  const raycaster = new THREE.Raycaster();

  // Camera movement detection helper
  const hasCameraMoved = (): boolean => {
    const currentPos = camera.getWorldPosition(new THREE.Vector3());
    const currentQuat = camera.getWorldQuaternion(new THREE.Quaternion());

    const positionChanged = currentPos.distanceToSquared(prevCameraPosition) > cfg.cameraMoveThreshold! ** 2;
    const rotationChanged = !currentQuat.equals(prevCameraQuaternion);

    if (positionChanged || rotationChanged) {
      prevCameraPosition.copy(currentPos);
      prevCameraQuaternion.copy(currentQuat);
      return true;
    }
    return false;
  };

  // Optimized update function
  const updateLabels = (timestamp: number) => {
    if (!isActive || isPaused) {
      rafId = null;
      return;
    }

    // Throttle by time interval
    if (cfg.updateInterval! > 0 && timestamp - lastUpdateTime < cfg.updateInterval!) {
      rafId = requestAnimationFrame(updateLabels);
      return;
    }
    lastUpdateTime = timestamp;

    // Camera movement detection - skip updates if camera hasn't moved
    cameraHasMoved = hasCameraMoved();
    if (!cameraHasMoved && frameCounter > 0) {
      rafId = requestAnimationFrame(updateLabels);
      return;
    }

    // Increment frame counter for occlusion check interval
    frameCounter++;

    const rect = renderer.domElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (svg) {
      svg.setAttribute('width', `${width}`);
      svg.setAttribute('height', `${height}`);
    }

    // Determine if we should check occlusion this frame
    const shouldCheckOcclusion = cfg.enableOcclusionDetection &&
      (cfg.occlusionCheckInterval === 0 || frameCounter % cfg.occlusionCheckInterval! === 0);

    labels.forEach((labelData) => {
      const { el, wrapper, dot, line, object } = labelData;
      const topWorld = getObjectTopPosition(labelData);  // Use cache
      const topNDC = globalPools.vector3.acquire();
      topNDC.copy(topWorld).project(camera);

      const modelX = (topNDC.x * 0.5 + 0.5) * width + rect.left;
      const modelY = (-(topNDC.y * 0.5) + 0.5) * height + rect.top;

      const labelX = modelX;
      const labelY = modelY - (cfg.lift || 0);

      // Use transform3d for GPU acceleration instead of left/top
      wrapper.style.transform = `translate3d(${labelX}px, ${labelY}px, 0) translate(-50%, -100%)`;

      // Check if behind camera
      let visible = topNDC.z < 1;

      // Distance culling - hide labels beyond maxDistance (optimized with pooling)
      if (visible && cfg.maxDistance! < Infinity) {
        const cameraPos = globalPools.vector3.acquire();
        camera.getWorldPosition(cameraPos);
        const distance = topWorld.distanceTo(cameraPos);
        if (distance > cfg.maxDistance!) {
          visible = false;
        }
        globalPools.vector3.release(cameraPos);
      }

      // Occlusion detection with caching (optimized with pooling)
      if (visible && cfg.enableOcclusionDetection) {
        if (shouldCheckOcclusion) {
          // Perform raycasting check using pooled vectors
          const cameraPos = globalPools.vector3.acquire();
          camera.getWorldPosition(cameraPos);
          const direction = globalPools.vector3.acquire();
          direction.copy(topWorld).sub(cameraPos).normalize();
          const distance = topWorld.distanceTo(cameraPos);

          raycaster.set(cameraPos, direction);
          raycaster.far = distance;

          const intersects = raycaster.intersectObject(currentModel, true);

          let occluded = false;
          if (intersects.length > 0) {
            for (const intersect of intersects) {
              const tolerance = distance * 0.01;
              if (intersect.object !== object && intersect.distance < distance - tolerance) {
                occluded = true;
                break;
              }
            }
          }

          // Cache the result and release pooled vectors
          occlusionCache.set(labelData, occluded);
          visible = !occluded;
          globalPools.vector3.release(cameraPos);
          globalPools.vector3.release(direction);
        } else {
          // Use cached occlusion result
          const cachedOcclusion = occlusionCache.get(labelData);
          if (cachedOcclusion !== undefined) {
            visible = !cachedOcclusion;
          }
        }
      }

      wrapper.style.display = visible ? 'flex' : 'none';

      if (cfg.style === 'line' && line && dot) {
        const svgModelX = modelX - rect.left;
        const svgModelY = modelY - rect.top;
        const svgLabelX = labelX - rect.left;
        // Calculate label connection point (approximate center-bottom/side of the label wrapper)
        // Since it's translated -50%, -100%, the anchor point (labelX, labelY) is the BOTTOM CENTER of the wrapper.
        // The line should go to this point.
        const svgLabelY = labelY - rect.top;

        // For better visuals, maybe offset slightly up into the wrapper or just to the bottom.
        // ModelsLabel original: labelY - rect.top + (el.getBoundingClientRect().height * 0.5)
        // The previous logic was calculating center logic. 
        // Let's stick to the anchor point which is the "target" of the lift.

        line.setAttribute('x1', `${svgModelX}`);
        line.setAttribute('y1', `${svgModelY}`);
        line.setAttribute('x2', `${svgLabelX}`);
        line.setAttribute('y2', `${svgLabelY}`);

        line.setAttribute('visibility', visible ? 'visible' : 'hidden');
        dot.style.opacity = visible ? '1' : '0';
      }

      // Release the topNDC vector back to pool
      globalPools.vector3.release(topNDC);
    });

    rafId = requestAnimationFrame(updateLabels);
  };

  rafId = requestAnimationFrame(updateLabels);

  return {
    updateModel(newModel: THREE.Object3D) {
      if (!newModel || newModel === currentModel) return;
      currentModel = newModel;
      rebuildLabels();
    },
    updateLabelsMap(newMap: Record<string, string>) {
      currentLabelsMap = { ...newMap };
      rebuildLabels();
    },
    // Pause update
    pause() {
      isPaused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Optional: Hide labels when paused? Original implementation didn't enforce hiding, just stopped updating.
    },
    // Resume update
    resume() {
      if (!isPaused) return;
      isPaused = false;
      rafId = requestAnimationFrame(updateLabels);
    },
    dispose() {
      isActive = false;
      isPaused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      clearLabels();
      if (svg) svg.remove();
      container.remove();
    },
    isRunning() {
      return !isPaused;
    }
  };
}