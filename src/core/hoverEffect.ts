/**
 * @file hoverEffect.ts
 * @description
 * Singleton highlight effect manager. Uses OutlinePass to create a breathing highlight effect on hovered objects.
 *
 * @best-practice
 * - Initialize once in your setup/mounted hook.
 * - Call `updateHighlightNames` to filter which objects are interactive.
 * - Automatically handles mousemove throttling and cleanup on dispose.
 */

import * as THREE from 'three'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'

/**
 * Configuration options for the hover breathing effect.
 */
export type HoverBreathOptions = {
  /** The camera used for raycasting. */
  camera: THREE.Camera
  /** The scene containing objects to be tested for hover. */
  scene: THREE.Scene
  /** The renderer used to get the drawing surface dimensions. */
  renderer: THREE.WebGLRenderer
  /** The OutlinePass instance to which the hovered object will be added. */
  outlinePass: OutlinePass
  /** 
   * Array of object names that are allowed to trigger the highlight. 
   * null: all objects highlightable; 
   * []: no objects highlightable; 
   * ['A','B']: only specified names.
   */
  highlightNames?: string[] | null
  /** Minimum edge strength of the breathing effect. */
  minStrength?: number
  /** Maximum edge strength of the breathing effect. */
  maxStrength?: number
  /** Speed of the breathing animation. */
  speed?: number
  /** Throttling delay for mousemove events in milliseconds. Default is 16ms (~60fps). */
  throttleDelay?: number
  /** Whether to enable frustum culling to skip raycasting for off-screen objects. Default is true. */
  enableFrustumCulling?: boolean
}

/**
 * Create a singleton highlighter - Recommended to create once on mount
 * Returns { updateHighlightNames, dispose, getHoveredName } interface
 *
 * Features:
 * - Automatically pauses animation when no object is hovered
 * - Throttles mousemove events to avoid excessive calculation
 * - Uses passive event listeners to improve scrolling performance
 */
export function enableHoverBreath(opts: HoverBreathOptions) {
  const {
    camera,
    scene,
    renderer,
    outlinePass,
    highlightNames = null,
    minStrength = 2,
    maxStrength = 5,
    speed = 4,
    throttleDelay = 16, // Default ~60fps
    enableFrustumCulling = true, // Enable by default
  } = opts

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hovered: THREE.Object3D | null = null
  let time = 0
  let animationId: number | null = null
  // highlightSet: null means all; empty Set means none
  let highlightSet: Set<string> | null = highlightNames === null ? null : new Set(highlightNames)

  // Throttling related
  let lastMoveTime = 0
  let rafPending = false

  // Frustum for culling
  const frustum = new THREE.Frustum()
  const projScreenMatrix = new THREE.Matrix4()

  // Cache for visible objects
  let visibleObjects: THREE.Object3D[] = []
  let lastFrustumUpdate = 0
  const frustumUpdateInterval = 100 // Update frustum every 100ms

  /**
   * Dynamically updates the list of highlightable object names.
   * If the current hovered object is no longer allowed, it will be unselected immediately.
   * @param {string[] | null} names - The new list of names or null for all.
   */
  function setHighlightNames(names: string[] | null) {
    highlightSet = names === null ? null : new Set(names)
    // If current hovered object is not in the new list, clean up selection immediately
    if (hovered && highlightSet && !highlightSet.has(hovered.name)) {
      hovered = null
      outlinePass.selectedObjects = []
      // Pause animation
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }
  }

  /**
   * Throttled mousemove handler
   */
  function onMouseMove(ev: MouseEvent) {
    const now = performance.now()

    // Throttle: if time since last process is less than threshold, skip
    if (now - lastMoveTime < throttleDelay) {
      // Use RAF to process the latest event later, ensuring the last event isn't lost
      if (!rafPending) {
        rafPending = true
        requestAnimationFrame(() => {
          rafPending = false
          processMouseMove(ev)
        })
      }
      return
    }

    lastMoveTime = now
    processMouseMove(ev)
  }

  /**
   * Update visible objects cache using frustum culling
   */
  function updateVisibleObjects() {
    const now = performance.now()
    if (now - lastFrustumUpdate < frustumUpdateInterval) {
      return // Use cached results
    }
    lastFrustumUpdate = now

    // Update frustum from camera
    camera.updateMatrixWorld()
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(projScreenMatrix)

    // Filter visible objects
    visibleObjects = []
    scene.traverse((obj) => {
      // Type-safe check for Mesh objects
      const isMesh = (obj as any).isMesh === true
      const isGroup = (obj as any).isGroup === true

      if (isMesh || isGroup) {
        const mesh = obj as THREE.Mesh
        // Quick bounding sphere check
        if (mesh.geometry && (mesh.geometry as any).boundingSphere) {
          const geom = mesh.geometry as THREE.BufferGeometry
          if (!geom.boundingSphere || !geom.boundingSphere.center) {
            geom.computeBoundingSphere()
          }
          if (geom.boundingSphere) {
            const sphere = geom.boundingSphere.clone()
            sphere.applyMatrix4(obj.matrixWorld)
            if (frustum.intersectsSphere(sphere)) {
              visibleObjects.push(obj)
            }
          }
        } else {
          // If no bounding sphere, include by default
          visibleObjects.push(obj)
        }
      }
    })
  }

  /**
   * Actual mousemove logic (optimized with frustum culling)
   */
  function processMouseMove(ev: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    // Use frustum culling to reduce raycasting load
    let targets: THREE.Object3D[]
    if (enableFrustumCulling) {
      updateVisibleObjects()
      targets = visibleObjects
    } else {
      targets = scene.children
    }

    // Only raycast against visible objects
    const intersects = raycaster.intersectObjects(targets, true)

    if (intersects.length > 0) {
      const obj = intersects[0].object
      // Determine if it is allowed to be highlighted
      const allowed = highlightSet === null ? true : highlightSet.has(obj.name)
      if (allowed) {
        if (hovered !== obj) {
          hovered = obj
          outlinePass.selectedObjects = [obj]
          // Start animation (if not running)
          if (animationId === null) {
            animate()
          }
        }
      } else {
        if (hovered !== null) {
          hovered = null
          outlinePass.selectedObjects = []
          // Stop animation
          if (animationId !== null) {
            cancelAnimationFrame(animationId)
            animationId = null
          }
        }
      }
    } else {
      if (hovered !== null) {
        hovered = null
        outlinePass.selectedObjects = []
        // Stop animation
        if (animationId !== null) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      }
    }
  }

  /**
   * Animation loop - only runs when there is a hovered object
   */
  function animate() {
    // If no hovered object, stop animation
    if (!hovered) {
      animationId = null
      return
    }

    animationId = requestAnimationFrame(animate)
    time += speed * 0.02
    const strength = minStrength + ((Math.sin(time) + 1) / 2) * (maxStrength - minStrength)
    outlinePass.edgeStrength = strength
  }

  // Start (called only once)
  // Use passive to improve scrolling performance
  renderer.domElement.addEventListener('mousemove', onMouseMove, { passive: true })

  // Note: Do not start animate here, wait until there is a hover object

  // refresh: Forcibly clean up selectedObjects if needed
  function refreshSelection() {
    if (hovered && highlightSet && !highlightSet.has(hovered.name)) {
      hovered = null
      outlinePass.selectedObjects = []
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }
  }

  function getHoveredName() {
    return hovered ? hovered.name : null
  }

  /**
   * Cleans up event listeners and cancels active animations.
   * Should be called when the component or view is destroyed.
   */
  function dispose() {
    renderer.domElement.removeEventListener('mousemove', onMouseMove)
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    outlinePass.selectedObjects = []
    // Clear references
    hovered = null
    highlightSet = null
  }

  return {
    updateHighlightNames: setHighlightNames,
    dispose,
    refreshSelection,
    getHoveredName,
  }
}
