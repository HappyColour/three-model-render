/**
 * @file liquidFiller.ts
 * @description
 * Liquid filling effect for single or multiple models using local clipping planes.
 *
 * @best-practice
 * - Use `fillTo` to animate liquid level.
 * - Supports multiple independent liquid levels.
 * - Call `dispose` to clean up resources and event listeners.
 */

import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface LiquidFillerOptions {
  color?: number      // Liquid color
  opacity?: number    // Liquid opacity
  speed?: number      // Filling speed
}

interface LiquidItem {
  model: THREE.Object3D
  liquidMesh: THREE.Mesh | null
  clipPlane: THREE.Plane
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  options: Required<LiquidFillerOptions>
  animationId: number | null  // Track animation ID for each model
}

export type LiquidModelInput = THREE.Object3D | THREE.Object3D[] | Iterable<THREE.Object3D>;

/**
 * LiquidFillerGroup - Optimized
 * Supports single or multi-model liquid level animation with independent color control.
 *
 * Capabilities:
 * - Supports THREE.Object3D, Array<THREE.Object3D>, Set<THREE.Object3D> etc.
 * - Uses renderer.domElement instead of window events
 * - Uses AbortController to manage event lifecycle
 * - Adds error handling and boundary checks
 * - Optimized animation management to prevent memory leaks
 * - Comprehensive resource disposal logic
 */
export class LiquidFillerGroup {
  private items: LiquidItem[] = []
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private pointerDownPos: THREE.Vector2 = new THREE.Vector2()
  private clickThreshold: number = 10
  private abortController: AbortController | null = null  // Event manager

  /**
   * Constructor
   * @param models Single or multiple THREE.Object3D (Array, Set, etc.)
   * @param scene Scene
   * @param camera Camera
   * @param renderer Renderer
   * @param defaultOptions Default liquid options
   * @param clickThreshold Click threshold in pixels
   */
  constructor(
    models: LiquidModelInput,
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    defaultOptions?: LiquidFillerOptions,
    clickThreshold: number = 10
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.clickThreshold = clickThreshold

    // Create AbortController for event management
    this.abortController = new AbortController()

    const modelArray = this.normalizeInput(models)

    modelArray.forEach(model => {
      try {
        const options = {
          color: defaultOptions?.color ?? 0x00ff00,
          opacity: defaultOptions?.opacity ?? 0.6,
          speed: defaultOptions?.speed ?? 0.05,
        }

        // Save original materials
        const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
        model.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            originalMaterials.set(mesh, mesh.material)
          }
        })

        // Boundary check: ensure there are materials to save
        if (originalMaterials.size === 0) {
          console.warn('LiquidFillerGroup: Model has no Mesh objects', model)
          return
        }

        // Apply faded wireframe material
        model.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            mesh.material = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              wireframe: true,
              transparent: true,
              opacity: 0.2,
            })
          }
        })

        // Create liquid Mesh
        const geometries: THREE.BufferGeometry[] = []
        model.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            const geom = (mesh.geometry as THREE.BufferGeometry).clone()
            geom.applyMatrix4(mesh.matrixWorld)
            geometries.push(geom)
          }
        })

        if (geometries.length === 0) {
          console.warn('LiquidFillerGroup: Model has no geometries', model)
          return
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
        if (!mergedGeometry) {
          console.error('LiquidFillerGroup: Failed to merge geometries', model)
          return
        }

        const material = new THREE.MeshPhongMaterial({
          color: options.color,
          transparent: true,
          opacity: options.opacity,
          side: THREE.DoubleSide,
        })
        const liquidMesh = new THREE.Mesh(mergedGeometry, material)
        this.scene.add(liquidMesh)

        // Set clippingPlane
        const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
        const mat = liquidMesh.material as THREE.Material & { clippingPlanes?: THREE.Plane[] }
        mat.clippingPlanes = [clipPlane]
        this.renderer.localClippingEnabled = true

        this.items.push({
          model,
          liquidMesh,
          clipPlane,
          originalMaterials,
          options,
          animationId: null  // Initialize animation ID
        })
      } catch (error) {
        console.error('LiquidFillerGroup: Failed to initialize model', model, error)
      }
    })

    // Use renderer.domElement instead of window, use AbortController signal
    const signal = this.abortController.signal
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown, { signal })
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp, { signal })
  }

  /**
   * Helper to normalize input to Array<THREE.Object3D>
   */
  private normalizeInput(models: LiquidModelInput): THREE.Object3D[] {
    if (models instanceof THREE.Object3D) {
      return [models]
    }
    if (Array.isArray(models)) {
      return models
    }
    // Handle Iterable (Set, etc.)
    return Array.from(models as Iterable<THREE.Object3D>)
  }

  /** pointerdown record position */
  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDownPos.set(event.clientX, event.clientY)
  }

  /** pointerup check click blank, restore original material */
  private handlePointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDownPos.x
    const dy = event.clientY - this.pointerDownPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > this.clickThreshold) return // Do not trigger on drag

    // Use renderer.domElement actual size
    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointerNDC = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    this.raycaster.setFromCamera(pointerNDC, this.camera)

    // Click blank -> Restore all models
    const intersectsAny = this.items.some(item =>
      this.raycaster.intersectObject(item.model, true).length > 0
    )
    if (!intersectsAny) {
      this.restoreAll()
    }
  }

  /**
   * Set liquid level
   * @param models Single model or array/iterable of models
   * @param percent Liquid level percentage 0~1
   */
  public fillTo(models: LiquidModelInput, percent: number) {
    // Boundary check
    if (percent < 0 || percent > 1) {
      console.warn('LiquidFillerGroup: percent must be between 0 and 1', percent)
      percent = Math.max(0, Math.min(1, percent))
    }

    const modelArray = this.normalizeInput(models)

    modelArray.forEach(model => {
      const item = this.items.find(i => i.model === model)
      if (!item) {
        console.warn('LiquidFillerGroup: Model not found', model)
        return
      }

      if (!item.liquidMesh) {
        console.warn('LiquidFillerGroup: liquidMesh already disposed', model)
        return
      }

      // Cancel previous animation
      if (item.animationId !== null) {
        cancelAnimationFrame(item.animationId)
        item.animationId = null
      }

      try {
        const box = new THREE.Box3().setFromObject(item.liquidMesh)
        const min = box.min.y
        const max = box.max.y
        const targetHeight = min + (max - min) * percent

        const animate = () => {
          if (!item.liquidMesh) {
            item.animationId = null
            return
          }

          const diff = targetHeight - item.clipPlane.constant
          if (Math.abs(diff) > 0.01) {
            item.clipPlane.constant += diff * item.options.speed
            item.animationId = requestAnimationFrame(animate)
          } else {
            item.clipPlane.constant = targetHeight
            item.animationId = null
          }
        }
        animate()
      } catch (error) {
        console.error('LiquidFillerGroup: fillTo execution failed', model, error)
      }
    })
  }

  /** Set multiple model levels, percentList corresponds to items order */
  public fillToAll(percentList: number[]) {
    if (percentList.length !== this.items.length) {
      console.warn(
        `LiquidFillerGroup: percentList length (${percentList.length}) does not match items length (${this.items.length})`
      )
    }

    percentList.forEach((p, idx) => {
      if (idx < this.items.length) {
        this.fillTo(this.items[idx].model, p)
      }
    })
  }

  /** Restore single model original material and remove liquid */
  public restore(model: THREE.Object3D) {
    const item = this.items.find(i => i.model === model)
    if (!item) return

    // Cancel animation
    if (item.animationId !== null) {
      cancelAnimationFrame(item.animationId)
      item.animationId = null
    }

    // Restore original material
    item.model.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        const original = item.originalMaterials.get(mesh)
        if (original) mesh.material = original
      }
    })

    // Dispose liquid Mesh
    if (item.liquidMesh) {
      this.scene.remove(item.liquidMesh)
      item.liquidMesh.geometry.dispose()
      if (Array.isArray(item.liquidMesh.material)) {
        item.liquidMesh.material.forEach(m => m.dispose())
      } else {
        item.liquidMesh.material.dispose()
      }
      item.liquidMesh = null
    }
  }

  /** Restore all models */
  public restoreAll() {
    this.items.forEach(item => this.restore(item.model))
  }

  /** Dispose method, release events and resources */
  public dispose() {
    // Restore all models first
    this.restoreAll()

    // Unbind all events at once using AbortController
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Clear items
    this.items.length = 0
  }
}
