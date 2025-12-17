/**
 * @file followModels.ts
 * @description
 * Camera utility to automatically follow and focus on 3D models.
 * It smoothly moves the camera to an optimal viewing position relative to the target object(s).
 *
 * @best-practice
 * - Use `followModels` to focus on a newly selected object.
 * - Call `cancelFollow` before starting a new manual camera interaction if needed.
 * - Adjust `padding` to control how tight the camera framing is.
 */

import * as THREE from 'three'

// Use WeakMap to track animations, allowing for cancellation
const _animationMap = new WeakMap<THREE.Camera, number>()

export interface FollowOptions {
  duration?: number      // Animation duration in ms, default is 700
  padding?: number       // Bounding sphere multiplier, default is 1.0
  minDistance?: number   // Minimum distance (optional)
  maxDistance?: number   // Maximum distance (optional)
  controls?: { target?: THREE.Vector3; update?: () => void } | null // Optional OrbitControls-like object
  azimuth?: number       // Horizontal angle (radians), default is Math.PI/4 (~45°)
  elevation?: number     // Vertical angle (radians), default is Math.PI/4 (~45°)
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn'  // Easing function type
  onProgress?: (progress: number) => void  // Progress callback
}

/**
 * Recommended camera angles for quick selection of common views
 */
export const FOLLOW_ANGLES = {
  /** Isometric view (default) - suitable for architecture, mechanical equipment */
  ISOMETRIC: { azimuth: Math.PI / 4, elevation: Math.PI / 4 },
  /** Front view - suitable for frontal display, UI alignment */
  FRONT: { azimuth: 0, elevation: 0 },
  /** Right view - suitable for mechanical sections, side inspection */
  RIGHT: { azimuth: Math.PI / 2, elevation: 0 },
  /** Left view */
  LEFT: { azimuth: -Math.PI / 2, elevation: 0 },
  /** Back view */
  BACK: { azimuth: Math.PI, elevation: 0 },
  /** Top view - suitable for maps, layout display */
  TOP: { azimuth: 0, elevation: Math.PI / 2 },
  /** Low angle view - suitable for vehicles, characters near the ground */
  LOW_ANGLE: { azimuth: Math.PI / 4, elevation: Math.PI / 6 },
  /** High angle view - suitable for bird's eye view, panoramic browsing */
  HIGH_ANGLE: { azimuth: Math.PI / 4, elevation: Math.PI / 3 }
} as const

/**
 * Collection of easing functions
 */
const EASING_FUNCTIONS = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t
}

/**
 * Automatically moves the camera to a diagonal position relative to the target,
 * ensuring the target is within the field of view (smooth transition).
 *
 * Features:
 * - Supports multiple easing functions
 * - Adds progress callback
 * - Supports animation cancellation
 * - Uses WeakMap to track and prevent memory leaks
 * - Robust error handling
 */
export function followModels(
  camera: THREE.Camera,
  targets: THREE.Object3D | THREE.Object3D[] | null | undefined,
  options: FollowOptions = {}
): Promise<void> {
  // Cancel previous animation
  cancelFollow(camera)

  // Boundary check
  const arr: THREE.Object3D[] = []
  if (!targets) return Promise.resolve()
  if (Array.isArray(targets)) arr.push(...targets.filter(Boolean))
  else arr.push(targets)

  if (arr.length === 0) {
    console.warn('followModels: Target object is empty')
    return Promise.resolve()
  }

  try {
    const box = new THREE.Box3()
    arr.forEach((o) => box.expandByObject(o))

    // Check bounding box validity
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) {
      console.warn('followModels: Failed to calculate bounding box')
      return Promise.resolve()
    }

    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    const center = sphere.center.clone()
    const radiusBase = Math.max(0.001, sphere.radius)

    const duration = options.duration ?? 700
    const padding = options.padding ?? 1.0
    const minDistance = options.minDistance
    const maxDistance = options.maxDistance
    const controls = options.controls ?? null
    const azimuth = options.azimuth ?? Math.PI / 4
    const elevation = options.elevation ?? Math.PI / 4
    const easing = options.easing ?? 'easeOut'
    const onProgress = options.onProgress

    // Get easing function
    const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.easeOut

    let distance = 10
    if ((camera as any).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera
      const halfV = THREE.MathUtils.degToRad(cam.fov * 0.5)
      const halfH = Math.atan(Math.tan(halfV) * cam.aspect)
      const halfMin = Math.min(halfV, halfH)
      distance = (radiusBase * padding) / Math.sin(halfMin)
      if (minDistance != null) distance = Math.max(distance, minDistance)
      if (maxDistance != null) distance = Math.min(distance, maxDistance)
    } else if ((camera as any).isOrthographicCamera) {
      distance = camera.position.distanceTo(center)
    } else {
      distance = camera.position.distanceTo(center)
    }

    // Calculate direction based on azimuth / elevation
    const hx = Math.sin(azimuth)
    const hz = Math.cos(azimuth)
    const dir = new THREE.Vector3(
      hx * Math.cos(elevation),
      Math.sin(elevation),
      hz * Math.cos(elevation)
    ).normalize()

    const desiredPos = center.clone().add(dir.multiplyScalar(distance))

    const startPos = camera.position.clone()
    const startTarget = controls && controls.target
      ? controls.target.clone()
      : camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1))
    const endTarget = center.clone()

    const startTime = performance.now()

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime
        const t = Math.min(1, duration > 0 ? elapsed / duration : 1)
        const k = easingFn(t)

        camera.position.lerpVectors(startPos, desiredPos, k)

        if (controls && controls.target) {
          const newTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, k)
          controls.target.copy(newTarget)
          if (typeof controls.update === 'function') controls.update()
        } else {
          camera.lookAt(endTarget)
        }

        if ((camera as any).updateProjectionMatrix) {
          (camera as any).updateProjectionMatrix()
        }

        // Call progress callback
        if (onProgress) {
          try {
            onProgress(t)
          } catch (error) {
            console.error('followModels: Progress callback error', error)
          }
        }

        if (t < 1) {
          const rafId = requestAnimationFrame(step)
          _animationMap.set(camera, rafId)
        } else {
          _animationMap.delete(camera)
          camera.position.copy(desiredPos)
          if (controls && controls.target) {
            controls.target.copy(endTarget)
            if (typeof controls.update === 'function') controls.update()
          } else {
            camera.lookAt(endTarget)
          }
          resolve()
        }
      }

      const rafId = requestAnimationFrame(step)
      _animationMap.set(camera, rafId)
    })
  } catch (error) {
    console.error('followModels: Execution failed', error)
    return Promise.reject(error)
  }
}

/**
 * Cancel the camera follow animation
 */
export function cancelFollow(camera: THREE.Camera) {
  const rafId = _animationMap.get(camera)
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
    _animationMap.delete(camera)
  }
}
