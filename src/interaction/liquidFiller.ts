// utils/LiquidFillerGroup.ts
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface LiquidFillerOptions {
  color?: number      // 液体颜色
  opacity?: number    // 液体透明度
  speed?: number      // 液位变化速度
}

interface LiquidItem {
  model: THREE.Object3D
  liquidMesh: THREE.Mesh | null
  clipPlane: THREE.Plane
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  options: Required<LiquidFillerOptions>
  animationId: number | null  // ✨ 跟踪每个模型的动画 ID
}

/**
 * LiquidFillerGroup - 优化版
 * 支持单模型或多模型液位动画、独立颜色控制
 * 
 * ✨ 优化内容：
 * - 使用 renderer.domElement 替代 window 事件
 * - 使用 AbortController 管理事件生命周期
 * - 添加错误处理和边界检查
 * - 优化动画管理，避免内存泄漏
 * - 完善资源释放逻辑
 */
export class LiquidFillerGroup {
  private items: LiquidItem[] = []
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private pointerDownPos: THREE.Vector2 = new THREE.Vector2()
  private clickThreshold: number = 10
  private abortController: AbortController | null = null  // ✨ 事件管理器

  /**
   * 构造函数
   * @param models 单个或多个 THREE.Object3D
   * @param scene 场景
   * @param camera 相机
   * @param renderer 渲染器
   * @param defaultOptions 默认液体选项
   * @param clickThreshold 点击阈值，单位像素
   */
  constructor(
    models: THREE.Object3D | THREE.Object3D[],
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

    // ✨ 创建 AbortController 用于事件管理
    this.abortController = new AbortController()

    const modelArray = Array.isArray(models) ? models : [models]

    modelArray.forEach(model => {
      try {
        const options = {
          color: defaultOptions?.color ?? 0x00ff00,
          opacity: defaultOptions?.opacity ?? 0.6,
          speed: defaultOptions?.speed ?? 0.05,
        }

        // 保存原始材质
        const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
        model.traverse(obj => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            originalMaterials.set(mesh, mesh.material)
          }
        })

        // ✨ 边界检查：确保有材质可以保存
        if (originalMaterials.size === 0) {
          console.warn('LiquidFillerGroup: 模型没有 Mesh 对象', model)
          return
        }

        // 应用淡线框材质
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

        // 创建液体 Mesh
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
          console.warn('LiquidFillerGroup: 模型没有几何体', model)
          return
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
        if (!mergedGeometry) {
          console.error('LiquidFillerGroup: 几何体合并失败', model)
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

        // 设置 clippingPlane
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
          animationId: null  // ✨ 初始化动画 ID
        })
      } catch (error) {
        console.error('LiquidFillerGroup: 初始化模型失败', model, error)
      }
    })

    // ✨ 使用 renderer.domElement 替代 window，使用 AbortController signal
    const signal = this.abortController.signal
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown, { signal })
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp, { signal })
  }

  /** pointerdown 记录位置 */
  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDownPos.set(event.clientX, event.clientY)
  }

  /** pointerup 判断点击空白，恢复原始材质 */
  private handlePointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDownPos.x
    const dy = event.clientY - this.pointerDownPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > this.clickThreshold) return // 拖拽不触发

    // ✨ 使用 renderer.domElement 的实际尺寸
    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointerNDC = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    this.raycaster.setFromCamera(pointerNDC, this.camera)

    // 点击空白 -> 所有模型恢复
    const intersectsAny = this.items.some(item =>
      this.raycaster.intersectObject(item.model, true).length > 0
    )
    if (!intersectsAny) {
      this.restoreAll()
    }
  }

  /**
 * 设置液位
 * @param models 单个模型或模型数组
 * @param percent 液位百分比 0~1
 */
  public fillTo(models: THREE.Object3D | THREE.Object3D[], percent: number) {
    // ✨ 边界检查
    if (percent < 0 || percent > 1) {
      console.warn('LiquidFillerGroup: percent 必须在 0~1 之间', percent)
      percent = Math.max(0, Math.min(1, percent))
    }

    const modelArray = Array.isArray(models) ? models : [models]

    modelArray.forEach(model => {
      const item = this.items.find(i => i.model === model)
      if (!item) {
        console.warn('LiquidFillerGroup: 未找到模型', model)
        return
      }

      if (!item.liquidMesh) {
        console.warn('LiquidFillerGroup: liquidMesh 已被释放', model)
        return
      }

      // ✨ 取消之前的动画
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
        console.error('LiquidFillerGroup: fillTo 执行失败', model, error)
      }
    })
  }

  /** 设置多个模型液位，percentList 与 items 顺序对应 */
  public fillToAll(percentList: number[]) {
    if (percentList.length !== this.items.length) {
      console.warn(
        `LiquidFillerGroup: percentList 长度 (${percentList.length}) 与 items 长度 (${this.items.length}) 不匹配`
      )
    }

    percentList.forEach((p, idx) => {
      if (idx < this.items.length) {
        this.fillTo(this.items[idx].model, p)
      }
    })
  }

  /** 恢复单个模型原始材质并移除液体 */
  public restore(model: THREE.Object3D) {
    const item = this.items.find(i => i.model === model)
    if (!item) return

    // ✨ 取消动画
    if (item.animationId !== null) {
      cancelAnimationFrame(item.animationId)
      item.animationId = null
    }

    // 恢复原始材质
    item.model.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        const original = item.originalMaterials.get(mesh)
        if (original) mesh.material = original
      }
    })

    // 释放液体 Mesh
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

  /** 恢复所有模型 */
  public restoreAll() {
    this.items.forEach(item => this.restore(item.model))
  }

  /** 销毁方法，释放事件和资源 */
  public dispose() {
    // ✨ 先恢复所有模型
    this.restoreAll()

    // ✨ 使用 AbortController 一次性解绑所有事件
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    // ✨ 清空 items
    this.items.length = 0
  }
}

