// src/utils/setView.ts - 优化版
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { followModels, FOLLOW_ANGLES, cancelFollow } from './followModels'

/**
 * 视角类型
 */
export type ViewPosition = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

/**
 * 视角配置选项
 */
export interface SetViewOptions {
  distanceFactor?: number  // 距离系数，默认 0.8
  duration?: number        // 动画时长，默认 1000ms
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn'  // 缓动函数
  onProgress?: (progress: number) => void  // 进度回调
}

/**
 * 平滑切换相机到模型的最佳视角 - 优化版
 * 
 * ✨ 优化内容：
 * - 复用 followModels 逻辑，避免代码重复
 * - 支持更多视角
 * - 配置选项增强
 * - 返回 Promise 支持链式调用
 * - 支持取消动画
 * 
 * @param camera       THREE.PerspectiveCamera 相机实例
 * @param controls     OrbitControls 控制器实例
 * @param targetObj    THREE.Object3D 模型对象
 * @param position     视角位置
 * @param options      配置选项
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

  // ✨ 边界检查
  if (!targetObj) {
    console.warn('setView: 目标对象为空')
    return Promise.reject(new Error('Target object is required'))
  }

  try {
    // 计算包围盒
    const box = new THREE.Box3().setFromObject(targetObj)
    if (!isFinite(box.min.x)) {
      console.warn('setView: 包围盒计算失败')
      return Promise.reject(new Error('Invalid bounding box'))
    }

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z)

    // ✨ 使用映射表简化视角计算
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

    // ✨ 复用 followModels，避免代码重复
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
    console.error('setView: 执行失败', error)
    return Promise.reject(error)
  }
}

/**
 * ✨ 取消视角切换动画
 */
export function cancelSetView(camera: THREE.PerspectiveCamera) {
  cancelFollow(camera)
}

/**
 * ✨ 预设视角快捷方法
 */
export const ViewPresets = {
  /**
   * 前视图
   */
  front: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'front', options),

  /**
   * 等距视图
   */
  isometric: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'iso', options),

  /**
   * 顶视图
   */
  top: (camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Object3D, options?: SetViewOptions) =>
    setView(camera, controls, target, 'top', options)
}
