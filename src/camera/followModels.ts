// src/utils/followModels.ts - 优化版
import * as THREE from 'three'

// ✨ 使用 WeakMap 跟踪动画，支持取消
const _animationMap = new WeakMap<THREE.Camera, number>()

export interface FollowOptions {
  duration?: number      // 动画时长 ms，默认 700
  padding?: number       // 包围球倍数，默认 1.0
  minDistance?: number   // 最小距离（可选）
  maxDistance?: number   // 最大距离（可选）
  controls?: { target?: THREE.Vector3; update?: () => void } | null // 可选 OrbitControls-like
  azimuth?: number       // 水平角度（弧度），默认 Math.PI/4 (≈45°)
  elevation?: number     // 仰角（弧度），默认 Math.PI/4 (≈45°)
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn'  // ✨ 缓动函数类型
  onProgress?: (progress: number) => void  // ✨ 进度回调
}

/**
 * 推荐角度枚举，便于快速选取常见视角
 */
export const FOLLOW_ANGLES = {
  /** 等距斜视（默认视角）- 适合建筑、机械设备展示 */
  ISOMETRIC: { azimuth: Math.PI / 4, elevation: Math.PI / 4 },
  /** 正前视角 - 适合正面展示、UI 对齐 */
  FRONT: { azimuth: 0, elevation: 0 },
  /** 右侧视角 - 适合机械剖面、侧视检查 */
  RIGHT: { azimuth: Math.PI / 2, elevation: 0 },
  /** 左侧视角 */
  LEFT: { azimuth: -Math.PI / 2, elevation: 0 },
  /** 后视角 */
  BACK: { azimuth: Math.PI, elevation: 0 },
  /** 顶视图 - 适合地图、平面布局展示 */
  TOP: { azimuth: 0, elevation: Math.PI / 2 },
  /** 低角度俯视 - 适合车辆、人物等近地物体 */
  LOW_ANGLE: { azimuth: Math.PI / 4, elevation: Math.PI / 6 },
  /** 高角度俯视 - 适合鸟瞰、全景浏览 */
  HIGH_ANGLE: { azimuth: Math.PI / 4, elevation: Math.PI / 3 }
} as const

/**
 * 缓动函数集合
 */
const EASING_FUNCTIONS = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t
}

/**
 * 自动将相机移到目标的斜上角位置，并保证目标在可视范围内（平滑过渡）- 优化版
 * 
 * ✨ 优化内容：
 * - 支持多种缓动函数
 * - 添加进度回调
 * - 支持取消动画
 * - WeakMap 跟踪防止泄漏
 * - 完善错误处理
 */
export function followModels(
  camera: THREE.Camera,
  targets: THREE.Object3D | THREE.Object3D[] | null | undefined,
  options: FollowOptions = {}
): Promise<void> {
  // ✨ 取消之前的动画
  cancelFollow(camera)

  // ✨ 边界检查
  const arr: THREE.Object3D[] = []
  if (!targets) return Promise.resolve()
  if (Array.isArray(targets)) arr.push(...targets.filter(Boolean))
  else arr.push(targets)

  if (arr.length === 0) {
    console.warn('followModels: 目标对象为空')
    return Promise.resolve()
  }

  try {
    const box = new THREE.Box3()
    arr.forEach((o) => box.expandByObject(o))

    // ✨ 检查包围盒有效性
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) {
      console.warn('followModels: 包围盒计算失败')
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

    // ✨ 获取缓动函数
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

    // 根据 azimuth / elevation 计算方向
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

        camera.updateProjectionMatrix?.()

        // ✨ 调用进度回调
        if (onProgress) {
          try {
            onProgress(t)
          } catch (error) {
            console.error('followModels: 进度回调错误', error)
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
    console.error('followModels: 执行失败', error)
    return Promise.reject(error)
  }
}

/**
 * ✨ 取消相机的跟随动画
 */
export function cancelFollow(camera: THREE.Camera) {
  const rafId = _animationMap.get(camera)
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
    _animationMap.delete(camera)
  }
}
