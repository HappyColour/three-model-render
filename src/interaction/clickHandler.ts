/**
 * @file clickHandler.ts
 * @description
 * Tool for handling model clicks and highlighting (OutlinePass version).
 *
 * @best-practice
 * - Use `createModelClickHandler` to setup interaction.
 * - Handles debouncing and click threshold automatically.
 * - Cleanup using the returned dispose function.
 */

import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';

/**
 * Click Handler Options
 */
export interface ClickHandlerOptions {
  clickThreshold?: number                    // Drag threshold, default 3px
  debounceDelay?: number                     // Debounce delay, default 0 (no debounce)
  raycasterParams?: {                        // RAYCASTER custom parameters
    near?: number
    far?: number
    pointsPrecision?: number
  }
  enableDynamicThickness?: boolean           // Whether to enable dynamic outline thickness, default true
  minThickness?: number                      // Minimum thickness, default 1
  maxThickness?: number                      // Maximum thickness, default 10
}

/**
 * Create Model Click Highlight Tool (OutlinePass Version) - Optimized
 *
 * Features:
 * - Uses AbortController to unify event lifecycle management
 * - Supports debounce to avoid frequent triggering
 * - Customizable Raycaster parameters
 * - Dynamically adjusts outline thickness based on camera distance
 *
 * @param camera Camera
 * @param scene Scene
 * @param renderer Renderer
 * @param outlinePass Initialized OutlinePass
 * @param onClick Click callback
 * @param options Optional configuration
 * @returns Dispose function, used to clean up events and resources
 */
export function createModelClickHandler(
  camera: THREE.Camera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  outlinePass: OutlinePass,
  onClick: (object: THREE.Object3D | null, info?: { name?: string; position?: THREE.Vector3; uuid?: string }) => void,
  options: ClickHandlerOptions = {}
) {
  // Configuration
  const {
    clickThreshold = 3,
    debounceDelay = 0,
    raycasterParams = {},
    enableDynamicThickness = true,
    minThickness = 1,
    maxThickness = 10
  } = options

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Apply Raycaster custom parameters
  if (raycasterParams.near !== undefined) raycaster.near = raycasterParams.near
  if (raycasterParams.far !== undefined) raycaster.far = raycasterParams.far
  if (raycasterParams.pointsPrecision !== undefined) {
    if (!raycaster.params.Points) {
      raycaster.params.Points = { threshold: raycasterParams.pointsPrecision }
    } else {
      raycaster.params.Points.threshold = raycasterParams.pointsPrecision
    }
  }

  let startX = 0;
  let startY = 0;
  let selectedObject: THREE.Object3D | null = null;
  let debounceTimer: number | null = null;

  // Use AbortController to manage events uniformly
  const abortController = new AbortController();
  const signal = abortController.signal;

  /** Get object and its child Meshes */
  function getMeshes(obj: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes;
  }

  /** Highlight object: Update OutlinePass.selectedObjects and adjust outline thickness */
  function _highlightObject(obj: THREE.Object3D) {
    const meshes = getMeshes(obj);
    outlinePass.selectedObjects = meshes;

    if (enableDynamicThickness) {
      // Dynamically adjust outline thickness based on distance from camera to model
      const center = new THREE.Vector3();
      obj.getWorldPosition(center);
      const distance = camera.position.distanceTo(center);
      const thickness = Math.min(maxThickness, Math.max(minThickness, 100 / distance));
      outlinePass.edgeThickness = thickness;
    }
  }

  /** Restore object highlight (Clear OutlinePass.selectedObjects) */
  function restoreObject() {
    outlinePass.selectedObjects = [];
  }

  // _highlightObject is available for optional use (see processClick)
  void _highlightObject;

  /** Record mouse down position */
  function handleMouseDown(event: MouseEvent) {
    startX = event.clientX;
    startY = event.clientY;
  }

  /** Mouse up determines click or drag (with debounce) */
  function handleMouseUp(event: MouseEvent) {
    const dx = Math.abs(event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (dx > clickThreshold || dy > clickThreshold) return; // Drag does not trigger click

    // Debounce processing
    if (debounceDelay > 0) {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        processClick(event);
        debounceTimer = null;
      }, debounceDelay);
    } else {
      processClick(event);
    }
  }

  /** Actual click processing logic */
  function processClick(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      let object = intersects[0].object;
      // Click different model, clear previous highlight first
      if (selectedObject && selectedObject !== object) restoreObject();

      selectedObject = object;
      // highlightObject(selectedObject); // Optional: whether to auto highlight

      onClick(selectedObject, {
        name: selectedObject.name || 'Unnamed Model',
        position: selectedObject.getWorldPosition(new THREE.Vector3()),
        uuid: selectedObject.uuid
      });
    } else {
      // Click blank -> Clear highlight
      if (selectedObject) restoreObject();
      selectedObject = null;
      onClick(null);
    }
  }

  // Register events using signal from AbortController
  renderer.domElement.addEventListener('mousedown', handleMouseDown, { signal });
  renderer.domElement.addEventListener('mouseup', handleMouseUp, { signal });

  /** Dispose function: Unbind events and clear highlight */
  return () => {
    // Clear debounce timer
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // Unbind all events at once
    abortController.abort();
    // Clear highlight
    restoreObject();
    // Clear reference
    selectedObject = null;
  };
}
