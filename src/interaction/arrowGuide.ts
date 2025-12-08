// src/utils/ArrowGuide.ts
import * as THREE from 'three'

export type FilterFn = (obj: THREE.Object3D) => boolean

/**
 * ArrowGuide - 优化版
 * 箭头引导效果工具，支持高亮模型并淡化其他对象
 * 
 * ✨ 优化内容：
 * - 使用 WeakMap 自动回收材质，避免内存泄漏
 * - 使用 AbortController 管理事件生命周期
 * - 添加材质复用机制，减少重复创建
 * - 改进 dispose 逻辑，确保完全释放资源
 * - 添加错误处理和边界检查
 */
export class ArrowGuide {
  private lxMesh: THREE.Mesh | null = null
  private flowActive = false
  private modelBrightArr: THREE.Object3D[] = []
  private pointerDownPos = new THREE.Vector2()
  private clickThreshold = 10
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()

  // ✨ 使用 WeakMap 自动回收材质（GC 友好）
  private originalMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>()
  private fadedMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>()

  // ✨ AbortController 用于事件管理
  private abortController: AbortController | null = null

  // 可选：忽略射线（地面等）
  private ignoreRaycastNames: Set<string>

  // 配置：非高亮透明度和亮度
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

  // —— 工具：缓存原材质（仅首次）
  private cacheOriginalMaterial(mesh: THREE.Mesh) {
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(mesh, mesh.material)
    }
  }

  // —— 工具：为某个材质克隆一个"半透明版本"，保留所有贴图与参数
  private makeFadedClone(mat: THREE.Material): THREE.Material {
    const clone = mat.clone()
    const c: any = clone
    // 只改透明相关参数，不改 map / normalMap / roughnessMap 等细节
    c.transparent = true
    if (typeof c.opacity === 'number') c.opacity = this.fadeOpacity

    if (c.color && c.color.isColor) {
      c.color.multiplyScalar(this.fadeBrightness) // 颜色整体变暗
    }
    // 为了让箭头在透明建筑后也能顺畅显示，常用策略：不写深度，仅测试深度
    clone.depthWrite = false
    clone.depthTest = true
    clone.needsUpdate = true
    return clone
  }

  // —— 工具：为 mesh.material（可能是数组）批量克隆"半透明版本"
  private createFadedMaterialFrom(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    const orig = mesh.material
    if (Array.isArray(orig)) {
      return orig.map(m => this.makeFadedClone(m))
    }
    return this.makeFadedClone(orig)
  }

  /**
   * 设置箭头 Mesh
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
      console.error('ArrowGuide: 设置箭头材质失败', error)
    }
  }

  /**
   * 高亮指定模型
   */
  highlight(models: THREE.Object3D[]) {
    if (!models || models.length === 0) {
      console.warn('ArrowGuide: 高亮模型列表为空')
      return
    }

    this.modelBrightArr = models
    this.flowActive = true
    if (this.lxMesh) this.lxMesh.visible = true
    this.applyHighlight()
  }

  // ✅ 应用高亮效果：非高亮模型保留细节 → 使用"克隆后的半透明材质"
  private applyHighlight() {
    // ✨ 使用 Set 提升查找性能
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

          // 缓存原材质（用于恢复）
          this.cacheOriginalMaterial(mesh)

          if (!keepMeshes.has(mesh)) {
            // 非高亮：如果还没给它生成过"半透明克隆材质"，就创建一次
            if (!this.fadedMaterials.has(mesh)) {
              const faded = this.createFadedMaterialFrom(mesh)
              this.fadedMaterials.set(mesh, faded)
            }
            // 替换为克隆材质（保留所有贴图/法线等细节）
            const fadedMat = this.fadedMaterials.get(mesh)
            if (fadedMat) mesh.material = fadedMat
          } else {
            // 高亮对象：确保回到原材质（避免上一次高亮后遗留）
            const orig = this.originalMaterials.get(mesh)
            if (orig && mesh.material !== orig) {
              mesh.material = orig
                ; (mesh.material as any).needsUpdate = true
            }
          }
        }
      })
    } catch (error) {
      console.error('ArrowGuide: 应用高亮失败', error)
    }
  }

  // ✅ 恢复为原材质 & 释放克隆材质
  restore() {
    this.flowActive = false
    if (this.lxMesh) this.lxMesh.visible = false

    try {
      // ✨ 收集所有需要释放的材质
      const materialsToDispose: THREE.Material[] = []

      this.scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          const orig = this.originalMaterials.get(mesh)
          if (orig) {
            mesh.material = orig
              ; (mesh.material as any).needsUpdate = true
          }

          // ✨ 收集待释放的淡化材质
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

      // ✨ 批量释放材质（不触碰贴图资源）
      materialsToDispose.forEach(mat => {
        try {
          mat.dispose()
        } catch (error) {
          console.error('ArrowGuide: 释放材质失败', error)
        }
      })

      // ✨ 创建新的 WeakMap（相当于清空）
      this.fadedMaterials = new WeakMap()
    } catch (error) {
      console.error('ArrowGuide: 恢复材质失败', error)
    }
  }

  /**
   * 动画更新（每帧调用）
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
      console.error('ArrowGuide: 动画更新失败', error)
    }
  }

  /**
   * 初始化事件监听器
   */
  private initEvents() {
    const dom = this.renderer.domElement
    const signal = this.abortController!.signal

    // ✨ 使用 AbortController signal 自动管理事件生命周期
    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.pointerDownPos.set(e.clientX, e.clientY)
    }, { signal })

    dom.addEventListener('pointerup', (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - this.pointerDownPos.x)
      const dy = Math.abs(e.clientY - this.pointerDownPos.y)
      if (dx > this.clickThreshold || dy > this.clickThreshold) return // 拖拽

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

      if (filtered.length === 0) this.restore() // 点击空白恢复
    }, { signal })
  }

  /**
   * 释放所有资源
   */
  dispose() {
    // ✨ 先恢复材质
    this.restore()

    // ✨ 使用 AbortController 一次性解绑所有事件
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // ✨ 清空引用
    this.modelBrightArr = []
    this.lxMesh = null
    this.fadedMaterials = new WeakMap()
    this.originalMaterials = new WeakMap()
    this.ignoreRaycastNames.clear()
  }
}
