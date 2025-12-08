// src/utils/hoverBreathEffectByNameSingleton.ts
import * as THREE from 'three'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'

export type HoverBreathOptions = {
  camera: THREE.Camera
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  outlinePass: OutlinePass
  // highlightNames: null => 全部对象都可高亮; [] => 无对象可高亮; ['A','B'] => 指定 name 列表
  highlightNames?: string[] | null
  minStrength?: number
  maxStrength?: number
  speed?: number
  throttleDelay?: number // mousemove 节流延迟（ms），默认 16ms (≈60fps)
}

/**
 * 创建单例高亮器 —— 推荐在 mounted 时创建一次
 * 返回 { updateHighlightNames, dispose, getHoveredName } 接口
 * 
 * ✨ 性能优化：
 * - 无 hover 对象时自动暂停动画
 * - mousemove 节流处理，避免过度计算
 * - 使用 passive 事件监听器提升滚动性能
 */
export function enableHoverBreath(opts: HoverBreathOptions) {
  const {
    camera,
    scene,
    renderer,
    outlinePass,
    highlightNames = null,
    minStrength = 2,
    maxStrength = 5,
    speed = 4,
    throttleDelay = 16, // 默认约 60fps
  } = opts

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hovered: THREE.Object3D | null = null
  let time = 0
  let animationId: number | null = null
  // highlightSet: null 表示 all; empty Set 表示 none
  let highlightSet: Set<string> | null = highlightNames === null ? null : new Set(highlightNames)

  // 节流相关
  let lastMoveTime = 0
  let rafPending = false

  function setHighlightNames(names: string[] | null) {
    highlightSet = names === null ? null : new Set(names)
    // 如果当前 hovered 不在新名单中，及时清理 selection
    if (hovered && highlightSet && !highlightSet.has(hovered.name)) {
      hovered = null
      outlinePass.selectedObjects = []
      // 暂停动画
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }
  }

  /**
   * 节流版本的 mousemove 处理
   */
  function onMouseMove(ev: MouseEvent) {
    const now = performance.now()

    // 节流：如果距上次处理时间小于阈值，跳过
    if (now - lastMoveTime < throttleDelay) {
      // 使用 RAF 延迟处理，避免丢失最后一次事件
      if (!rafPending) {
        rafPending = true
        requestAnimationFrame(() => {
          rafPending = false
          processMouseMove(ev)
        })
      }
      return
    }

    lastMoveTime = now
    processMouseMove(ev)
  }

  /**
   * 实际的 mousemove 逻辑
   */
  function processMouseMove(ev: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    // 深度检测 scene 的所有子对象（true）
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      const obj = intersects[0].object
      // 判断是否允许被高亮
      const allowed = highlightSet === null ? true : highlightSet.has(obj.name)
      if (allowed) {
        if (hovered !== obj) {
          hovered = obj
          outlinePass.selectedObjects = [obj]
          // 启动动画（如果未运行）
          if (animationId === null) {
            animate()
          }
        }
      } else {
        if (hovered !== null) {
          hovered = null
          outlinePass.selectedObjects = []
          // 停止动画
          if (animationId !== null) {
            cancelAnimationFrame(animationId)
            animationId = null
          }
        }
      }
    } else {
      if (hovered !== null) {
        hovered = null
        outlinePass.selectedObjects = []
        // 停止动画
        if (animationId !== null) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      }
    }
  }

  /**
   * 动画循环 - 只在有 hovered 对象时运行
   */
  function animate() {
    // 如果没有 hovered 对象，停止动画
    if (!hovered) {
      animationId = null
      return
    }

    animationId = requestAnimationFrame(animate)
    time += speed * 0.02
    const strength = minStrength + ((Math.sin(time) + 1) / 2) * (maxStrength - minStrength)
    outlinePass.edgeStrength = strength
  }

  // 启动（只调用一次）
  // 使用 passive 提升滚动性能
  renderer.domElement.addEventListener('mousemove', onMouseMove, { passive: true })

  // 注意：不在这里启动 animate，等有 hover 对象时再启动

  // refresh: 如果你在某些情况下需要强制清理 selectedObjects
  function refreshSelection() {
    if (hovered && highlightSet && !highlightSet.has(hovered.name)) {
      hovered = null
      outlinePass.selectedObjects = []
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }
  }

  function getHoveredName() {
    return hovered ? hovered.name : null
  }

  function dispose() {
    renderer.domElement.removeEventListener('mousemove', onMouseMove)
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    outlinePass.selectedObjects = []
    // 清空引用
    hovered = null
    highlightSet = null
  }

  return {
    updateHighlightNames: setHighlightNames,
    dispose,
    refreshSelection,
    getHoveredName,
  }
}

