/**
 * @file postProcessing.ts
 * @description
 * Manages the post-processing chain, specifically for Outline effects and Gamma correction.
 *
 * @best-practice
 * - call `initPostProcessing` after creating your renderer and scene.
 * - Use the returned `composer` in your render loop instead of `renderer.render`.
 * - Handles resizing automatically via the `resize` method.
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'

/**
 * Post-processing configuration options
 */
export interface PostProcessingOptions {
  edgeStrength?: number      // Edge strength, default 4
  edgeGlow?: number          // Edge glow, default 1
  edgeThickness?: number     // Edge thickness, default 2
  visibleEdgeColor?: string  // Visible edge color, default '#ffee00'
  hiddenEdgeColor?: string   // Hidden edge color, default '#000000'
  resolutionScale?: number   // Resolution scale, default 1.0 (set to 0.5 to improve performance)
}

/**
 * Post-processing management interface
 */
export interface PostProcessingManager {
  composer: EffectComposer
  outlinePass: OutlinePass
  resize: (width?: number, height?: number) => void
  dispose: () => void
}

/**
 * Initialize outline-related information (contains OutlinePass)
 *
 * Capabilities:
 * - Supports automatic update on window resize
 * - Configurable resolution scale for performance improvement
 * - Comprehensive resource disposal management
 *
 * @param renderer THREE.WebGLRenderer
 * @param scene THREE.Scene
 * @param camera THREE.Camera
 * @param options PostProcessingOptions - Optional configuration
 * @returns PostProcessingManager - Management interface containing composer/outlinePass/resize/dispose
 */
export function initPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PostProcessingOptions = {}
): PostProcessingManager {
  // Default configuration
  const {
    edgeStrength = 4,
    edgeGlow = 1,
    edgeThickness = 2,
    visibleEdgeColor = '#ffee00',
    hiddenEdgeColor = '#000000',
    resolutionScale = 1.0
  } = options

  // Get renderer actual size
  const getSize = () => {
    const width = renderer.domElement.clientWidth
    const height = renderer.domElement.clientHeight
    return {
      width: Math.floor(width * resolutionScale),
      height: Math.floor(height * resolutionScale)
    }
  }

  const size = getSize()

  // Create EffectComposer
  const composer = new EffectComposer(renderer)

  // Basic RenderPass
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // OutlinePass for model outlining
  const outlinePass = new OutlinePass(
    new THREE.Vector2(size.width, size.height),
    scene,
    camera,
  )
  outlinePass.edgeStrength = edgeStrength
  outlinePass.edgeGlow = edgeGlow
  outlinePass.edgeThickness = edgeThickness
  outlinePass.visibleEdgeColor.set(visibleEdgeColor)
  outlinePass.hiddenEdgeColor.set(hiddenEdgeColor)
  composer.addPass(outlinePass)

  // Gamma correction
  const gammaPass = new ShaderPass(GammaCorrectionShader)
  composer.addPass(gammaPass)

  /**
   * Handle resize
   * @param width Optional width, uses renderer.domElement actual width if not provided
   * @param height Optional height, uses renderer.domElement actual height if not provided
   */
  const resize = (width?: number, height?: number) => {
    const actualSize = width !== undefined && height !== undefined
      ? { width: Math.floor(width * resolutionScale), height: Math.floor(height * resolutionScale) }
      : getSize()

    // Update composer size
    composer.setSize(actualSize.width, actualSize.height)

    // Update outlinePass resolution
    outlinePass.resolution.set(actualSize.width, actualSize.height)
  }

  /**
   * Dispose resources
   */
  const dispose = () => {
    // Dipose all passes
    composer.passes.forEach(pass => {
      if (pass.dispose) {
        pass.dispose()
      }
    })
    // Clear passes array
    composer.passes.length = 0
  }

  return {
    composer,
    outlinePass,
    resize,
    dispose
  }
}
