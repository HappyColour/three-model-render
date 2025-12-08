import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'

/**
 * 后期处理配置选项
 */
export interface PostProcessingOptions {
  edgeStrength?: number      // 描边强度，默认 4
  edgeGlow?: number          // 描边发光，默认 1
  edgeThickness?: number     // 描边厚度，默认 2
  visibleEdgeColor?: string  // 可见描边颜色，默认 '#ffee00'
  hiddenEdgeColor?: string   // 隐藏描边颜色，默认 '#000000'
  resolutionScale?: number   // 分辨率缩放，默认 1.0（设置为 0.5 可提升性能）
}

/**
 * 后期处理管理接口
 */
export interface PostProcessingManager {
  composer: EffectComposer
  outlinePass: OutlinePass
  resize: (width?: number, height?: number) => void
  dispose: () => void
}

/**
 * 初始化描边相关信息（包含 OutlinePass）- 优化版
 * 
 * ✨ 功能增强：
 * - 支持窗口 resize 自动更新
 * - 可配置分辨率缩放提升性能
 * - 完善的资源释放管理
 * 
 * @param renderer THREE.WebGLRenderer
 * @param scene THREE.Scene
 * @param camera THREE.Camera
 * @param options PostProcessingOptions - 可选配置
 * @returns PostProcessingManager - 包含 composer/outlinePass/resize/dispose 的管理接口
 */
export function initPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PostProcessingOptions = {}
): PostProcessingManager {
  // 默认配置
  const {
    edgeStrength = 4,
    edgeGlow = 1,
    edgeThickness = 2,
    visibleEdgeColor = '#ffee00',
    hiddenEdgeColor = '#000000',
    resolutionScale = 1.0
  } = options

  // 获取渲染器实际尺寸
  const getSize = () => {
    const width = renderer.domElement.clientWidth
    const height = renderer.domElement.clientHeight
    return {
      width: Math.floor(width * resolutionScale),
      height: Math.floor(height * resolutionScale)
    }
  }

  const size = getSize()

  // 创建 EffectComposer
  const composer = new EffectComposer(renderer)

  // 基础 RenderPass
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // OutlinePass 用于模型描边
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

  // Gamma 校正
  const gammaPass = new ShaderPass(GammaCorrectionShader)
  composer.addPass(gammaPass)

  /**
   * resize 处理函数
   * @param width 可选宽度，不传则使用 renderer.domElement 的实际宽度
   * @param height 可选高度，不传则使用 renderer.domElement 的实际高度
   */
  const resize = (width?: number, height?: number) => {
    const actualSize = width !== undefined && height !== undefined
      ? { width: Math.floor(width * resolutionScale), height: Math.floor(height * resolutionScale) }
      : getSize()

    // 更新 composer 尺寸
    composer.setSize(actualSize.width, actualSize.height)

    // 更新 outlinePass 分辨率
    outlinePass.resolution.set(actualSize.width, actualSize.height)
  }

  /**
   * 释放资源
   */
  const dispose = () => {
    // 释放所有 passes
    composer.passes.forEach(pass => {
      if (pass.dispose) {
        pass.dispose()
      }
    })
    // 清空 passes 数组
    composer.passes.length = 0
  }

  return {
    composer,
    outlinePass,
    resize,
    dispose
  }
}

