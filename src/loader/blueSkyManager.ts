/**
 * @file blueSkyManager.ts
 * @description
 * Global singleton manager for loading and managing HDR/EXR blue sky environment maps.
 *
 * @best-practice
 * - Call `init` once before use.
 * - Use `loadAsync` to load skyboxes with progress tracking.
 * - Automatically handles PMREM generation for realistic lighting.
 */

import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

/**
 * Load progress callback type
 */
export type LoadProgressCallback = (progress: number) => void

/**
 * Load options
 */
export interface LoadSkyOptions {
  background?: boolean              // Whether to apply as scene background, default true
  onProgress?: LoadProgressCallback // Load progress callback
  onComplete?: () => void          // Load complete callback
  onError?: (error: any) => void   // Error callback
}

/**
 * BlueSkyManager - Optimized
 * ---------------------------------------------------------
 * A global singleton manager for loading and managing HDR/EXR based blue sky environment maps.
 *
 * Features:
 * - Adds load progress callback
 * - Supports load cancellation
 * - Improved error handling
 * - Returns Promise for async operation
 * - Adds loading state management
 */
class BlueSkyManager {
  /** three.js renderer instance */
  private renderer!: THREE.WebGLRenderer

  /** three.js scene instance */
  private scene!: THREE.Scene

  /** PMREM generator, used to convert HDR/EXR to efficient reflection maps */
  private pmremGen!: THREE.PMREMGenerator

  /** RenderTarget for current environment map, used for subsequent disposal */
  private skyRT: THREE.WebGLRenderTarget | null = null

  /** Whether already initialized */
  private isInitialized = false

  /** Current loader, used for cancelling load */
  private currentLoader: EXRLoader | null = null

  /** Loading state */
  private loadingState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle'

  /**
   * Initialize
   * ---------------------------------------------------------
   * Must be called once before using BlueSkyManager.
   * @param renderer WebGLRenderer instance
   * @param scene Three.js Scene
   * @param exposure Exposure (default 1.0)
   */
  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, exposure = 1.0) {
    if (this.isInitialized) {
      console.warn('BlueSkyManager: Already initialized, skipping duplicate initialization')
      return
    }

    this.renderer = renderer
    this.scene = scene

    // Use ACESFilmicToneMapping, effect is closer to reality
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = exposure

    // Initialize PMREM generator (only one needed globally)
    this.pmremGen = new THREE.PMREMGenerator(renderer)
    this.pmremGen.compileEquirectangularShader()

    this.isInitialized = true
  }

  /**
   * Load blue sky HDR/EXR map and apply to scene (Promise version)
   * ---------------------------------------------------------
   * @param exrPath HDR/EXR file path
   * @param options Load options
   * @returns Promise<void>
   */
  loadAsync(exrPath: string, options: LoadSkyOptions = {}): Promise<void> {
    if (!this.isInitialized) {
      return Promise.reject(new Error('BlueSkyManager not initialized!'))
    }

    // Cancel previous load
    this.cancelLoad()

    const {
      background = true,
      onProgress,
      onComplete,
      onError
    } = options

    this.loadingState = 'loading'
    this.currentLoader = new EXRLoader()

    return new Promise((resolve, reject) => {
      this.currentLoader!.load(
        exrPath,
        // Success callback
        (texture) => {
          try {
            // Set texture mapping to EquirectangularReflectionMapping
            texture.mapping = THREE.EquirectangularReflectionMapping

            // Clear old environment map
            this.dispose()

            // Generate efficient environment map using PMREM
            this.skyRT = this.pmremGen.fromEquirectangular(texture)

            // Apply to scene: Environment Lighting & Background
            this.scene.environment = this.skyRT.texture
            if (background) this.scene.background = this.skyRT.texture

            // Dispose original HDR/EXR texture immediately to save memory
            texture.dispose()

            this.loadingState = 'loaded'
            this.currentLoader = null

            console.log('✅ Blue sky EXR loaded:', exrPath)

            if (onComplete) onComplete()
            resolve()
          } catch (error) {
            this.loadingState = 'error'
            this.currentLoader = null
            console.error('❌ Processing EXR sky failed:', error)
            if (onError) onError(error)
            reject(error)
          }
        },
        // Progress callback
        (xhr) => {
          if (onProgress && xhr.lengthComputable) {
            const progress = xhr.loaded / xhr.total
            onProgress(progress)
          }
        },
        // Error callback
        (err) => {
          this.loadingState = 'error'
          this.currentLoader = null
          console.error('❌ Failed to load EXR sky:', err)
          if (onError) onError(err)
          reject(err)
        }
      )
    })
  }

  /**
   * Load blue sky HDR/EXR map and apply to scene (Sync API, for backward compatibility)
   * ---------------------------------------------------------
   * @param exrPath HDR/EXR file path
   * @param background Whether to apply as scene background (default true)
   */
  load(exrPath: string, background = true) {
    this.loadAsync(exrPath, { background }).catch((error) => {
      console.error('BlueSkyManager load error:', error)
    })
  }

  /**
   * Cancel current load
   */
  cancelLoad() {
    if (this.currentLoader) {
      // EXRLoader itself does not have abort method, but we can clear the reference
      this.currentLoader = null
      this.loadingState = 'idle'
    }
  }

  /**
   * Get loading state
   */
  getLoadingState(): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingState
  }

  /**
   * Is loading
   */
  isLoading(): boolean {
    return this.loadingState === 'loading'
  }

  /**
   * Release current sky texture resources
   * ---------------------------------------------------------
   * Only cleans up skyRT, does not destroy PMREM
   * Suitable for calling when switching HDR/EXR files
   */
  dispose() {
    if (this.skyRT) {
      this.skyRT.texture.dispose()
      this.skyRT.dispose()
      this.skyRT = null
    }
    if (this.scene && this.scene.background) this.scene.background = null
    if (this.scene && this.scene.environment) this.scene.environment = null
  }

  /**
   * Completely destroy BlueSkyManager
   * ---------------------------------------------------------
   * Includes destruction of PMREMGenerator
   * Usually called when the scene is completely destroyed or the application exits
   */
  destroy() {
    this.cancelLoad()
    this.dispose()
    this.pmremGen?.dispose()
    this.isInitialized = false
    this.loadingState = 'idle'
  }
}

/**
 * Global Singleton
 * ---------------------------------------------------------
 * Directly export a globally unique BlueSkyManager instance,
 * Ensuring only one PMREMGenerator is used throughout the application for best performance.
 */
export const BlueSky = new BlueSkyManager()
