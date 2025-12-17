/**
 * @file modelsLabel.ts
 * @description
 * Creates interactive 2D labels (DOM elements) attached to 3D objects with connecting lines.
 *
 * @best-practice
 * - Use `createModelsLabel` to annotate parts of a model.
 * - Supports fading endpoints, pulsing dots, and custom styling.
 * - Performance optimized with caching and RAF throttling.
 */

import * as THREE from 'three';

interface LabelOptions {
  fontSize?: string;
  color?: string;
  background?: string;
  padding?: string;
  borderRadius?: string;
  lift?: number; // Lift pixel amount
  dotSize?: number; // Dot diameter
  dotSpacing?: number; // Spacing between dot and label
  lineColor?: string; // Line color
  lineWidth?: number; // Line width
  updateInterval?: number; // Update interval (ms)
  fadeInDuration?: number; // Fade-in duration (ms)
}

interface LabelManager {
  updateModel: (model: THREE.Object3D) => void;
  updateLabelsMap: (map: Record<string, string>) => void;
  pause: () => void;  // Pause
  resume: () => void;  // Resume
  dispose: () => void;
}

/**
 * Create Model Labels (with connecting lines and pulsing dots) - Optimized
 *
 * Features:
 * - Supports pause/resume
 * - Configurable update interval
 * - Fade in/out effects
 * - Cached bounding box calculation
 * - RAF management optimization
 */
export function createModelsLabel(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  parentModel: THREE.Object3D,
  modelLabelsMap: Record<string, string>,
  options?: LabelOptions
): LabelManager {
  const cfg = {
    fontSize: options?.fontSize || '12px',
    color: options?.color || '#ffffff',
    background: options?.background || '#1890ff',
    padding: options?.padding || '6px 10px',
    borderRadius: options?.borderRadius || '6px',
    lift: options?.lift ?? 100,
    dotSize: options?.dotSize ?? 6,
    dotSpacing: options?.dotSpacing ?? 2,
    lineColor: options?.lineColor || 'rgba(200,200,200,0.7)',
    lineWidth: options?.lineWidth ?? 1,
    updateInterval: options?.updateInterval ?? 0,  // Default update every frame
    fadeInDuration: options?.fadeInDuration ?? 300,  // Fade-in duration
  };

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';
  document.body.appendChild(container);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.overflow = 'visible';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '1';
  container.appendChild(svg);

  let currentModel = parentModel;
  let currentLabelsMap = { ...modelLabelsMap };

  // Cache bounding box
  interface LabelData {
    object: THREE.Object3D;
    el: HTMLDivElement;
    wrapper: HTMLDivElement;
    dot: HTMLDivElement;
    line: SVGLineElement;
    cachedBox: THREE.Box3 | null;  // Cached bounding box
    cachedTopPos: THREE.Vector3 | null;  // Cached top position
  }

  let labels: LabelData[] = [];
  let isActive = true;
  let isPaused = false;
  let rafId: number | null = null;
  let lastUpdateTime = 0;

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
        gap: 8px;
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

  // Get or update cached top position
  const getObjectTopPosition = (labelData: LabelData): THREE.Vector3 => {
    const obj = labelData.object;

    // If cached and object hasn't transformed, return cached
    if (labelData.cachedTopPos && !obj.matrixWorldNeedsUpdate) {
      return labelData.cachedTopPos.clone();
    }

    // Recalculate
    const box = new THREE.Box3().setFromObject(obj);
    labelData.cachedBox = box;

    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const topPos = new THREE.Vector3(center.x, box.max.y, center.z);
      labelData.cachedTopPos = topPos;
      return topPos.clone();
    }

    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    labelData.cachedTopPos = p;
    return p.clone();
  };

  const clearLabels = () => {
    labels.forEach(({ el, line, wrapper }) => {
      el.remove();
      wrapper.remove();
      if (line && line.parentNode) line.parentNode.removeChild(line);
    });
    labels = [];
  };

  const rebuildLabels = () => {
    clearLabels();
    if (!currentModel) return;

    currentModel.traverse((child: any) => {
      if (child.isMesh || child.type === 'Group') {
        const labelText = Object.entries(currentLabelsMap).find(([key]) =>
          child.name.includes(key)
        )?.[1];
        if (!labelText) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'tm-label-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.transform = 'translate(-50%, -100%)';
        wrapper.style.zIndex = '1';

        const el = document.createElement('div');
        el.className = 'tm-label';
        el.style.background = cfg.background;
        el.style.color = cfg.color;
        el.style.padding = cfg.padding;
        el.style.borderRadius = cfg.borderRadius;
        el.style.fontSize = cfg.fontSize;
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
        el.style.backdropFilter = 'blur(4px)';
        el.style.border = '1px solid rgba(255,255,255,0.03)';
        el.style.display = 'inline-block';

        const txt = document.createElement('div');
        txt.className = 'tm-label-text';
        txt.innerText = labelText;
        el.appendChild(txt);

        const dot = document.createElement('div');
        dot.className = 'tm-label-dot';
        dot.style.width = `${cfg.dotSize}px`;
        dot.style.height = `${cfg.dotSize}px`;
        dot.style.background = 'radial-gradient(circle at 30% 30%, #fff, rgba(255,255,255,0.85) 20%, rgba(255,204,0,0.9) 60%, rgba(255,170,0,0.9) 100%)';
        dot.style.boxShadow = '0 0 8px rgba(255,170,0,0.9)';
        dot.style.flex = '0 0 auto';
        dot.style.marginRight = `${cfg.dotSpacing}px`;

        wrapper.appendChild(dot);
        wrapper.appendChild(el);
        container.appendChild(wrapper);

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('stroke', cfg.lineColor);
        line.setAttribute('stroke-width', `${cfg.lineWidth}`);
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0.85');
        svg.appendChild(line);

        labels.push({
          object: child,
          el,
          wrapper,
          dot,
          line,
          cachedBox: null,  // Initialize cache
          cachedTopPos: null
        });
      }
    });
  };

  rebuildLabels();

  // Optimized update function
  const updateLabels = (timestamp: number) => {
    if (!isActive || isPaused) {
      rafId = null;
      return;
    }

    // Throttle
    if (cfg.updateInterval > 0 && timestamp - lastUpdateTime < cfg.updateInterval) {
      rafId = requestAnimationFrame(updateLabels);
      return;
    }
    lastUpdateTime = timestamp;

    const rect = renderer.domElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);

    labels.forEach((labelData) => {
      const { el, wrapper, dot, line } = labelData;
      const topWorld = getObjectTopPosition(labelData);  // Use cache
      const topNDC = topWorld.clone().project(camera);

      const modelX = (topNDC.x * 0.5 + 0.5) * width + rect.left;
      const modelY = (-(topNDC.y * 0.5) + 0.5) * height + rect.top;

      const labelX = modelX;
      const labelY = modelY - cfg.lift;

      wrapper.style.left = `${labelX}px`;
      wrapper.style.top = `${labelY}px`;

      const svgModelX = modelX - rect.left;
      const svgModelY = modelY - rect.top;
      const svgLabelX = labelX - rect.left;
      const svgLabelY =
        labelY - rect.top + (el.getBoundingClientRect().height * 0.5);

      line.setAttribute('x1', `${svgModelX}`);
      line.setAttribute('y1', `${svgModelY}`);
      line.setAttribute('x2', `${svgLabelX}`);
      line.setAttribute('y2', `${svgLabelY}`);

      const visible = topNDC.z < 1;
      wrapper.style.display = visible ? 'flex' : 'none';
      line.setAttribute('visibility', visible ? 'visible' : 'hidden');
      dot.style.opacity = visible ? '1' : '0';
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
      svg.remove();
      container.remove();
    },
  };
}