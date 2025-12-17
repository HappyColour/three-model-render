/**
 * @file setView.ts
 * @description
 * Utility to smoothly transition the camera to preset views (Front, Back, Top, Isometric, etc.).
 *
 * @best-practice
 * - Use `setView` for UI buttons that switch camera angles.
 * - Leverage `ViewPresets` for readable code when using standard views.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { followModels, FOLLOW_ANGLES, cancelFollow } from './followModels'

/**
 * View types
 */
export type ViewPosition = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

/**
 * View configuration options
 */
export interface SetViewOptions {
  distanceFactor?: number  // Distance factor, default 0.8
  duration?: number        // Animation duration, default 1000ms
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn'  // Easing function
  onProgress?: (progress: number) => void  // Progress callback
}

/**
 * Smoothly switches the camera to the optimal angle for the model.
 *
 * Features:
 * - Reuses followModels logic to avoid code duplication
 * - Supports more angles
 * - Enhanced configuration options
 * - Returns Promise to support chaining
 * - Supports animation cancellation
 *
 * @param camera       THREE.PerspectiveCamera instance
 * @param controls     OrbitControls instance
 * @param targetObj    THREE.Object3D model object
 * @param position     View position
 * @param options      Configuration options
 * @returns Promise<void>
 */
export function setView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetObj: THREE.Object3D,
  position: ViewPosition = 'front',
  options: SetViewOptions = {}
): Promise<void> {
  const {
    distanceFactor = 0.8,
    duration = 1000,
    easing = 'easeInOut',
    onProgress
  } = options

  // Boundary check
  if (!targetObj) {
    console.warn('setView: Target object is empty')
    return Promise.reject(new Error('Target object is required'))
  }

  try {
    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(targetObj)
    if (!isFinite(box.min.x)) {
      console.warn('setView: Failed to calculate bounding box')
      return Promise.reject(new Error('Invalid bounding box'))
    }

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z)

    // Use mapping table for creating view angles
    const viewAngles: Record<ViewPosition, { azimuth: number; elevation: number }> = {
      'front': { azimuth: 0, elevation: 0 },
      'back': { azimuth: Math.PI, elevation: 0 },
      'left': { azimuth: -Math.PI / 2, elevation: 0 },
      'right': { azimuth: Math.PI / 2, elevation: 0 },
      'top': { azimuth: 0, elevation: Math.PI / 2 },
      'bottom': { azimuth: 0, elevation: -Math.PI / 2 },
      'iso': { azimuth: Math.PI / 4, elevation: Math.PI / 4 }
    }

    const angle = viewAngles[position] || viewAngles.front

    // Reuse followModels to avoid code duplication
    return followModels(camera, targetObj, {
      duration,
      padding: distanceFactor,
      controls,
      azimuth: angle.azimuth,
      elevation: angle.elevation,
      easing,
      onProgress
    })
  } catch (error) {
    console.error('setView: Execution failed', error)
    return Promise.reject(error)
  }
}

/**
 * Cancel view switch animation
 */
export function cancelSetView(camera: THREE.PerspectiveCamera) {
  cancelFollow(camera)
}

/**
 * Preset view shortcut methods
 */
export const ViewPresets = {
  /**
   * Front View
   */
  front: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'front', options),

  /**
   * Isometric View
   */
  isometric: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'iso', options),

  /**
   * Top View
   */
  top: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'top', options)
}
