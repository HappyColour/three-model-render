import * as THREE from 'three'

export interface AutoSetupOptions {
  /** 相机在包围球基础上的额外填充倍数（>1 扩大可视范围） */
  padding?: number
  /** 相机仰角偏移（弧度），默认小俯视（0.2 rad ≈ 11°） */
  elevation?: number
  /** 是否启用阴影（shadow） - 性能开销大，默认 false */
  enableShadows?: boolean
  /** 阴影贴图尺寸，越高越清晰越耗性能，默认 1024 */
  shadowMapSize?: number
  /** DirectionalLights 的数量（均匀分布在四面） */
  directionalCount?: number
  /** 是否自动把 mesh.castShadow / mesh.receiveShadow 设置为 true（默认 true） */
  setMeshShadowProps?: boolean
  /** 如果传入 renderer，则工具会自动启用 renderer.shadowMap（如果 enableShadows 为 true） */
  renderer?: THREE.WebGLRenderer | null
}

/**
 * 返回值句柄，包含 created lights group、computed center/radius、以及 dispose 方法
 */
export type AutoSetupHandle = {
  lightsGroup: THREE.Group
  center: THREE.Vector3
  radius: number
  dispose: () => void
  updateLightIntensity: (factor: number) => void  // ✨ 新增
}

/**
 * 自动设置相机与基础灯光 - 优化版
 * 
 * ✨ 优化内容：
 * - 添加灯光强度调整方法
 * - 完善错误处理
 * - 优化dispose逻辑
 *
 * - camera: THREE.PerspectiveCamera（会被移动并指向模型中心）
 * - scene: THREE.Scene（会把新创建的 light group 加入 scene）
 * - model: THREE.Object3D 已加载的模型（任意 transform/坐标）
 * - options: 可选配置（见 AutoSetupOptions）
 *
 * 返回 AutoSetupHandle，调用方在组件卸载/切换时请调用 handle.dispose()
 */
export function autoSetupCameraAndLight(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  model: THREE.Object3D,
  options: AutoSetupOptions = {}
): AutoSetupHandle {
  // ✨ 边界检查
  if (!camera || !scene || !model) {
    throw new Error('autoSetupCameraAndLight: camera, scene, model are required')
  }

  const opts: Required<AutoSetupOptions> = {
    padding: options.padding ?? 1.2,
    elevation: options.elevation ?? 0.2,
    enableShadows: options.enableShadows ?? false,
    shadowMapSize: options.shadowMapSize ?? 1024,
    directionalCount: options.directionalCount ?? 4,
    setMeshShadowProps: options.setMeshShadowProps ?? true,
    renderer: options.renderer ?? null,
  }

  try {
    // --- 1) 计算包围数据
    const box = new THREE.Box3().setFromObject(model)

    // ✨ 检查包围盒有效性
    if (!isFinite(box.min.x)) {
      throw new Error('autoSetupCameraAndLight: Invalid bounding box')
    }

    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    const center = sphere.center.clone()
    const radius = Math.max(0.001, sphere.radius)

    // --- 2) 计算相机位置
    const fov = (camera.fov * Math.PI) / 180
    const halfFov = fov / 2
    const sinHalfFov = Math.max(Math.sin(halfFov), 0.001)
    const distance = (radius * opts.padding) / sinHalfFov

    const dir = new THREE.Vector3(
      0,
      Math.sin(opts.elevation),
      Math.cos(opts.elevation)
    ).normalize()

    const desiredPos = center.clone().add(dir.multiplyScalar(distance))

    camera.position.copy(desiredPos)
    camera.lookAt(center)
    camera.near = Math.max(0.001, radius / 1000)
    camera.far = Math.max(1000, radius * 50)
    camera.updateProjectionMatrix()

    // --- 3) 启用阴影
    if (opts.renderer && opts.enableShadows) {
      opts.renderer.shadowMap.enabled = true
      opts.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    // --- 4) 创建灯光组
    const lightsGroup = new THREE.Group()
    lightsGroup.name = 'autoSetupLightsGroup'
    lightsGroup.position.copy(center)
    scene.add(lightsGroup)

    // 4.1 基础光
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    hemi.name = 'auto_hemi'
    hemi.position.set(0, radius * 2.0, 0)
    lightsGroup.add(hemi)

    const ambient = new THREE.AmbientLight(0xffffff, 0.25)
    ambient.name = 'auto_ambient'
    lightsGroup.add(ambient)

    // 4.2 方向光
    const dirCount = Math.max(1, Math.floor(opts.directionalCount))
    const directionalLights: THREE.DirectionalLight[] = []
    const dirs: THREE.Vector3[] = []

    dirs.push(new THREE.Vector3(0, 1, 0))

    for (let i = 0; i < Math.max(1, dirCount); i++) {
      const angle = (i / Math.max(1, dirCount)) * Math.PI * 2
      const v = new THREE.Vector3(Math.cos(angle), 0.3, Math.sin(angle)).normalize()
      dirs.push(v)
    }

    const shadowCamSize = Math.max(1, radius * 1.5)
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i]
      const light = new THREE.DirectionalLight(0xffffff, i === 0 ? 1.5 : 1.2)
      light.position.copy(d.clone().multiplyScalar(radius * 2.5))
      light.target.position.copy(center)
      light.name = `auto_dir_${i}`
      lightsGroup.add(light)
      lightsGroup.add(light.target)

      if (opts.enableShadows) {
        light.castShadow = true
        light.shadow.mapSize.width = opts.shadowMapSize
        light.shadow.mapSize.height = opts.shadowMapSize

        const cam = light.shadow.camera as THREE.OrthographicCamera
        const s = shadowCamSize
        cam.left = -s
        cam.right = s
        cam.top = s
        cam.bottom = -s
        cam.near = 0.1
        cam.far = radius * 10 + 50
        light.shadow.bias = -0.0005
      }
      directionalLights.push(light)
    }

    // 4.3 点光补光
    const fill1 = new THREE.PointLight(0xffffff, 0.5, radius * 4)
    fill1.position.copy(center).add(new THREE.Vector3(radius * 0.5, 0.2 * radius, 0))
    fill1.name = 'auto_fill1'
    lightsGroup.add(fill1)

    const fill2 = new THREE.PointLight(0xffffff, 0.3, radius * 3)
    fill2.position.copy(center).add(new THREE.Vector3(-radius * 0.5, -0.2 * radius, 0))
    fill2.name = 'auto_fill2'
    lightsGroup.add(fill2)

    // --- 5) 设置 Mesh 阴影属性
    if (opts.setMeshShadowProps) {
      model.traverse((ch) => {
        if ((ch as any).isMesh) {
          const mesh = ch as THREE.Mesh
          const isSkinned = (mesh as any).isSkinnedMesh
          mesh.castShadow = opts.enableShadows && !isSkinned ? true : mesh.castShadow
          mesh.receiveShadow = opts.enableShadows ? true : mesh.receiveShadow
        }
      })
    }

    // --- 6) 返回 handle ---
    const handle: AutoSetupHandle = {
      lightsGroup,
      center,
      radius,
      // ✨ 新增灯光强度调整
      updateLightIntensity(factor: number) {
        lightsGroup.traverse((node) => {
          if ((node as any).isLight) {
            const light = node as THREE.Light
            const originalIntensity = parseFloat(light.name.split('_').pop() || '1')
            light.intensity = originalIntensity * Math.max(0, factor)
          }
        })
      },
      dispose: () => {
        try {
          // 移除灯光组
          if (lightsGroup.parent) lightsGroup.parent.remove(lightsGroup)

          // 清理阴影资源
          lightsGroup.traverse((node) => {
            if ((node as any).isLight) {
              const l = node as THREE.Light & { shadow?: any }
              if (l.shadow && l.shadow.map) {
                try { l.shadow.map.dispose() } catch (err) {
                  console.warn('Failed to dispose shadow map:', err)
                }
              }
            }
          })
        } catch (error) {
          console.error('autoSetupCameraAndLight: dispose failed', error)
        }
      }
    }

    return handle
  } catch (error) {
    console.error('autoSetupCameraAndLight: setup failed', error)
    throw error
  }
}
