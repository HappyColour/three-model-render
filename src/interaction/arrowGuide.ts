/**
 * @file arrowGuide.ts
 * @description
 * Arrow guide effect tool, supports highlighting models and fading other objects.
 *
 * @best-practice
 * - Use `highlight` to focus on specific models.
 * - Automatically manages materials and memory using WeakMap.
 * - Call `dispose` when component unmounts.
 */

import * as THREE from 'three'

export type FilterFn = (obj: THREE.Object3D) => boolean

/**
 * ArrowGuide - Optimized Version
 * Arrow guide effect tool, supports highlighting models and fading other objects.
 *
 * Features:
 * - Uses WeakMap for automatic material recycling, preventing memory leaks
 * - Uses AbortController to manage event lifecycle
 * - Adds material reuse mechanism to reuse materials
 * - Improved dispose logic ensuring complete resource release
 * - Adds error handling and boundary checks
 */
export class ArrowGuide {
  private lxMesh: THREE.Mesh | null = null
  private flowActive = false
  private modelBrightArr: THREE.Object3D[] = []
  private pointerDownPos = new THREE.Vector2()
  private clickThreshold = 10
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()

  // Use WeakMap for automatic material recycling (GC friendly)
  private originalMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>()
  private fadedMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>()

  // AbortController for event management
  private abortController: AbortController | null = null

  // Optional: Ignore raycast names (e.g. ground)
  private ignoreRaycastNames: Set<string>

  // Config: Non-highlight opacity and brightness
  private fadeOpacity = 0.5
  private fadeBrightness = 0.1

  constructor(
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.Camera,
    private scene: THREE.Scene,
    options?: {
      clickThreshold?: number
      ignoreRaycastNames?: string[]
      fadeOpacity?: number
      fadeBrightness?: number
    }
  ) {
    this.clickThreshold = options?.clickThreshold ?? 10
    this.ignoreRaycastNames = new Set(options?.ignoreRaycastNames || [])
    this.fadeOpacity = options?.fadeOpacity ?? 0.5
    this.fadeBrightness = options?.fadeBrightness ?? 0.1

    this.abortController = new AbortController()
    this.initEvents()
  }

  // Tool: Cache original material (first time only)
  private cacheOriginalMaterial(mesh: THREE.Mesh) {
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(mesh, mesh.material)
    }
  }

  // Tool: Clone a "translucent version" for a material, preserving all maps and parameters
  private makeFadedClone(mat: THREE.Material): THREE.Material {
    const clone = mat.clone()
    const c: any = clone
    // Only modify transparency parameters, do not modify detail maps like map / normalMap / roughnessMap
    c.transparent = true
    if (typeof c.opacity === 'number') c.opacity = this.fadeOpacity

    if (c.color && c.color.isColor) {
      c.color.multiplyScalar(this.fadeBrightness) // Darken color overall
    }
    // Common strategy for fluid display behind transparent objects: do not write depth, only test depth
    clone.depthWrite = false
    clone.depthTest = true
    clone.needsUpdate = true
    return clone
  }

  // Tool: Batch clone "translucent version" for mesh.material (could be array)
  private createFadedMaterialFrom(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    const orig = mesh.material
    if (Array.isArray(orig)) {
      return orig.map(m => this.makeFadedClone(m))
    }
    return this.makeFadedClone(orig)
  }

  /**
   * Set Arrow Mesh
   */
  setArrowMesh(mesh: THREE.Mesh) {
    this.lxMesh = mesh
    this.cacheOriginalMaterial(mesh)

    try {
      const mat = mesh.material as any
      if (mat && mat.map) {
        const map: THREE.Texture = mat.map
        map.wrapS = THREE.RepeatWrapping
        map.wrapT = THREE.RepeatWrapping
        map.needsUpdate = true
      }
      mesh.visible = false
    } catch (error) {
      console.error('ArrowGuide: Failed to set arrow material', error)
    }
  }

  /**
   * Highlight specified models
   */
  highlight(models: THREE.Object3D[]) {
    if (!models || models.length === 0) {
      console.warn('ArrowGuide: Highlight model list is empty')
      return
    }

    this.modelBrightArr = models
    this.flowActive = true
    if (this.lxMesh) this.lxMesh.visible = true
    this.applyHighlight()
  }

  // Apply highlight effect: Non-highlighted models preserve details -> use "cloned translucent material"
  private applyHighlight() {
    // Use Set to improve lookup performance
    const keepMeshes = new Set<THREE.Mesh>()
    this.modelBrightArr.forEach(obj => {
      obj.traverse(child => {
        if ((child as THREE.Mesh).isMesh) keepMeshes.add(child as THREE.Mesh)
      })
    })

    try {
      this.scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh

          // Cache original material (for restoration)
          this.cacheOriginalMaterial(mesh)

          if (!keepMeshes.has(mesh)) {
            // Non-highlighted: if no "translucent clone material" generated yet, create one
            if (!this.fadedMaterials.has(mesh)) {
              const faded = this.createFadedMaterialFrom(mesh)
              this.fadedMaterials.set(mesh, faded)
            }
            // Replace with clone material (preserve all maps/normals details)
            const fadedMat = this.fadedMaterials.get(mesh)
            if (fadedMat) mesh.material = fadedMat
          } else {
            // Highlighted object: ensure return to original material (avoid leftover from previous highlight)
            const orig = this.originalMaterials.get(mesh)
            if (orig && mesh.material !== orig) {
              mesh.material = orig
                ; (mesh.material as any).needsUpdate = true
            }
          }
        }
      })
    } catch (error) {
      console.error('ArrowGuide: Failed to apply highlight', error)
    }
  }

  // Restore to original material & dispose clone material
  restore() {
    this.flowActive = false
    if (this.lxMesh) this.lxMesh.visible = false

    try {
      // Collect all materials to dispose
      const materialsToDispose: THREE.Material[] = []

      this.scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          const orig = this.originalMaterials.get(mesh)
          if (orig) {
            mesh.material = orig
              ; (mesh.material as any).needsUpdate = true
          }

          // Collect faded materials to dispose
          const faded = this.fadedMaterials.get(mesh)
          if (faded) {
            if (Array.isArray(faded)) {
              materialsToDispose.push(...faded)
            } else {
              materialsToDispose.push(faded)
            }
          }
        }
      })

      // Batch dispose materials (do not touch texture resources)
      materialsToDispose.forEach(mat => {
        try {
          mat.dispose()
        } catch (error) {
          console.error('ArrowGuide: Failed to dispose material', error)
        }
      })

      // Create new WeakMap (equivalent to clearing)
      this.fadedMaterials = new WeakMap()
    } catch (error) {
      console.error('ArrowGuide: Failed to restore material', error)
    }
  }

  /**
   * Animation update (called every frame)
   */
  animate() {
    if (!this.flowActive || !this.lxMesh) return

    try {
      const mat: any = this.lxMesh.material
      if (mat && mat.map) {
        const map: THREE.Texture = mat.map
        map.offset.y -= 0.01
        map.needsUpdate = true
      }
    } catch (error) {
      console.error('ArrowGuide: Animation update failed', error)
    }
  }

  /**
   * Initialize event listeners
   */
  private initEvents() {
    const dom = this.renderer.domElement
    const signal = this.abortController!.signal

    // Use AbortController signal to automatically manage event lifecycle
    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.pointerDownPos.set(e.clientX, e.clientY)
    }, { signal })

    dom.addEventListener('pointerup', (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - this.pointerDownPos.x)
      const dy = Math.abs(e.clientY - this.pointerDownPos.y)
      if (dx > this.clickThreshold || dy > this.clickThreshold) return // Dragging

      const rect = dom.getBoundingClientRect()
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObjects(this.scene.children, true)

      const filtered = intersects.filter(i => {
        if (!i.object) return false
        if (this.ignoreRaycastNames.has(i.object.name)) return false
        return true
      })

      if (filtered.length === 0) this.restore() // Click blank space to restore
    }, { signal })
  }

  /**
   * Dispose all resources
   */
  dispose() {
    // Restore materials first
    this.restore()

    // Unbind all events at once using AbortController
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // Clear references
    this.modelBrightArr = []
    this.lxMesh = null
    this.fadedMaterials = new WeakMap()
    this.originalMaterials = new WeakMap()
    this.ignoreRaycastNames.clear()
  }
}
