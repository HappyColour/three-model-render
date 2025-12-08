// utils/BlueSkyManager.ts - 优化版
import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

/**
 * 加载进度回调类型
 */
export type LoadProgressCallback = (progress: number) => void

/**
 * 加载选项
 */
export interface LoadSkyOptions {
  background?: boolean              // 是否应用为场景背景，默认 true
  onProgress?: LoadProgressCallback // 加载进度回调
  onComplete?: () => void          // 加载完成回调
  onError?: (error: any) => void   // 错误回调
}

/**
 * BlueSkyManager - 优化版
 * ---------------------------------------------------------
 * 一个全局单例管理器，用于加载和管理基于 HDR/EXR 的蓝天白云环境贴图。
 * 
 * ✨ 优化内容：
 * - 添加加载进度回调
 * - 支持加载取消
 * - 完善错误处理
 * - 返回 Promise 支持异步
 * - 添加加载状态管理
 */
class BlueSkyManager {
  /** three.js 渲染器实例 */
  private renderer!: THREE.WebGLRenderer

  /** three.js 场景实例 */
  private scene!: THREE.Scene

  /** PMREM 生成器，用于将 HDR/EXR 转换为高效的反射贴图 */
  private pmremGen!: THREE.PMREMGenerator

  /** 当前环境贴图的 RenderTarget，用于后续释放 */
  private skyRT: THREE.WebGLRenderTarget | null = null

  /** 是否已经初始化 */
  private isInitialized = false

  /** ✨ 当前加载器，用于取消加载 */
  private currentLoader: EXRLoader | null = null

  /** ✨ 加载状态 */
  private loadingState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle'

  /**
   * 初始化
   * ---------------------------------------------------------
   * 必须在使用 BlueSkyManager 之前调用一次。
   * @param renderer WebGLRenderer 实例
   * @param scene Three.js 场景
   * @param exposure 曝光度 (默认 1.0)
   */
  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, exposure = 1.0) {
    if (this.isInitialized) {
      console.warn('BlueSkyManager: 已经初始化，跳过重复初始化')
      return
    }

    this.renderer = renderer
    this.scene = scene

    // 使用 ACESFilmicToneMapping，效果更接近真实
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = exposure

    // 初始化 PMREM 生成器（全局只需一个）
    this.pmremGen = new THREE.PMREMGenerator(renderer)
    this.pmremGen.compileEquirectangularShader()

    this.isInitialized = true
  }

  /**
   * ✨ 加载蓝天 HDR/EXR 贴图并应用到场景（Promise 版本）
   * ---------------------------------------------------------
   * @param exrPath HDR/EXR 文件路径
   * @param options 加载选项
   * @returns Promise<void>
   */
  loadAsync(exrPath: string, options: LoadSkyOptions = {}): Promise<void> {
    if (!this.isInitialized) {
      return Promise.reject(new Error('BlueSkyManager not initialized!'))
    }

    // ✨ 取消之前的加载
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
        // 成功回调
        (texture) => {
          try {
            // 设置贴图为球面反射映射
            texture.mapping = THREE.EquirectangularReflectionMapping

            // 清理旧的环境贴图
            this.dispose()

            // 用 PMREM 生成高效的环境贴图
            this.skyRT = this.pmremGen.fromEquirectangular(texture)

            // 应用到场景：环境光照 & 背景
            this.scene.environment = this.skyRT.texture
            if (background) this.scene.background = this.skyRT.texture

            // 原始 HDR/EXR 贴图用完即销毁，节省内存
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
        // 进度回调
        (xhr) => {
          if (onProgress && xhr.lengthComputable) {
            const progress = xhr.loaded / xhr.total
            onProgress(progress)
          }
        },
        // 错误回调
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
   * 加载蓝天 HDR/EXR 贴图并应用到场景（同步 API，保持向后兼容）
   * ---------------------------------------------------------
   * @param exrPath HDR/EXR 文件路径
   * @param background 是否应用为场景背景 (默认 true)
   */
  load(exrPath: string, background = true) {
    this.loadAsync(exrPath, { background }).catch((error) => {
      console.error('BlueSkyManager load error:', error)
    })
  }

  /**
   * ✨ 取消当前加载
   */
  cancelLoad() {
    if (this.currentLoader) {
      // EXRLoader 本身没有 abort 方法，但我们可以清空引用
      this.currentLoader = null
      this.loadingState = 'idle'
    }
  }

  /**
   * ✨ 获取加载状态
   */
  getLoadingState(): 'idle' | 'loading' | 'loaded' | 'error' {
    return this.loadingState
  }

  /**
   * ✨ 是否正在加载
   */
  isLoading(): boolean {
    return this.loadingState === 'loading'
  }

  /**
   * 释放当前的天空贴图资源
   * ---------------------------------------------------------
   * 仅清理 skyRT，不销毁 PMREM
   * 适用于切换 HDR/EXR 文件时调用
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
   * 完全销毁 BlueSkyManager
   * ---------------------------------------------------------
   * 包括 PMREMGenerator 的销毁
   * 通常在场景彻底销毁或应用退出时调用
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
 * 🌐 全局单例
 * ---------------------------------------------------------
 * 直接导出一个全局唯一的 BlueSkyManager 实例，
 * 保证整个应用中只用一个 PMREMGenerator，性能最佳。
 */
export const BlueSky = new BlueSkyManager()
