// src/utils/skyboxLoader.ts
import * as THREE from 'three'

/**
 * Skybox 加载工具
 *
 * 支持：
 *  - 立方体贴图：paths: [px, nx, py, ny, pz, nz]
 *  - 等距 / HDR 全景：url: 'path/to/scene.hdr' 或 jpg
 *
 * 返回一个 SkyboxHandle，包含对 scene 的修改记录和 dispose() 方法。
 */

/** 统一返回句柄 */
export type SkyboxHandle = {
  key: string
  backgroundTexture: THREE.Texture | null
  envRenderTarget: THREE.WebGLRenderTarget | null
  pmremGenerator: THREE.PMREMGenerator | null
  setAsBackground: boolean
  setAsEnvironment: boolean
  /** 卸载并释放资源（如果是缓存共享，需要 refCount 逻辑） */
  dispose: () => void
}

/** 加载选项与默认值 */
export interface SkyboxOptions {
  setAsBackground?: boolean       // 是否将贴图作为 scene.background（默认 true）
  setAsEnvironment?: boolean      // 是否将贴图作为 scene.environment（默认 true）
  // 如果你已经有一个 pmremGenerator（并在多个 skybox/load 中复用），可传入以避免重复创建
  pmremGenerator?: THREE.PMREMGenerator | null
  // 是否使用 sRGB 编码（默认 true，适用于大多数色彩贴图）
  useSRGBEncoding?: boolean
  // 缓存开关（如果 true，相同 key 会复用已有纹理，引用计数自动管理）
  cache?: boolean
}

/** 默认值 */
const DEFAULT_OPTIONS: Required<Omit<SkyboxOptions, 'pmremGenerator'>> = {
  setAsBackground: true,
  setAsEnvironment: true,
  useSRGBEncoding: true,
  cache: true
}

/** 内部缓存：key -> { handle, refCount } */
const cubeCache = new Map<string, { handle: SkyboxHandle; refCount: number }>()
const equirectCache = new Map<string, { handle: SkyboxHandle; refCount: number }>()

/* -------------------------------------------
   公共函数：加载 skybox（自动选 cube 或 equirect）
   ------------------------------------------- */

/**
 * 加载立方体贴图（6张）
 * @param renderer THREE.WebGLRenderer - 用于 PMREM 生成环境贴图
 * @param scene THREE.Scene
 * @param paths string[] 6 张图片地址，顺序：[px, nx, py, ny, pz, nz]
 * @param opts SkyboxOptions
 */
export async function loadCubeSkybox(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  paths: string[],
  opts: SkyboxOptions = {}
): Promise<SkyboxHandle> {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  if (!Array.isArray(paths) || paths.length !== 6) throw new Error('cube skybox requires 6 image paths')

  const key = paths.join('|')

  // 缓存处理
  if (options.cache && cubeCache.has(key)) {
    const rec = cubeCache.get(key)!
    rec.refCount += 1
    // reapply to scene (in case it was removed)
    if (options.setAsBackground) scene.background = rec.handle.backgroundTexture
    if (options.setAsEnvironment && rec.handle.envRenderTarget) scene.environment = rec.handle.envRenderTarget.texture
    return rec.handle
  }

  // 加载立方体贴图
  const loader = new THREE.CubeTextureLoader()
  const texture = await new Promise<THREE.CubeTexture>((resolve, reject) => {
    loader.load(
      paths,
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err)
    )
  })

  // 设置编码与映射
  if (options.useSRGBEncoding) texture.encoding = THREE.sRGBEncoding
  texture.mapping = THREE.CubeReflectionMapping

  // apply as background if required
  if (options.setAsBackground) scene.background = texture

  // environment: use PMREM to produce a proper prefiltered env map for PBR
  let pmremGenerator = options.pmremGenerator ?? new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader?.(/* optional */)

  // fromCubemap might be available in your three.js; fallback to fromEquirectangular approach if not
  let envRenderTarget: THREE.WebGLRenderTarget | null = null
  if ((pmremGenerator as any).fromCubemap) {
    envRenderTarget = (pmremGenerator as any).fromCubemap(texture) as THREE.WebGLRenderTarget
  } else {
    // Fallback: render cube to env map by using generator.fromEquirectangular with a converted equirect if needed.
    // Simpler fallback: use the cube texture directly as environment (less correct for reflections).
    envRenderTarget = null
  }

  if (options.setAsEnvironment) {
    if (envRenderTarget) {
      scene.environment = envRenderTarget.texture
    } else {
      // fallback: use cube texture directly (works but not prefiltered)
      scene.environment = texture
    }
  }

  const handle: SkyboxHandle = {
    key,
    backgroundTexture: options.setAsBackground ? texture : null,
    envRenderTarget: envRenderTarget,
    pmremGenerator: options.pmremGenerator ? null : pmremGenerator, // only dispose if we created it
    setAsBackground: !!options.setAsBackground,
    setAsEnvironment: !!options.setAsEnvironment,
    dispose() {
      // remove from scene
      if (options.setAsBackground && scene.background === texture) scene.background = null
      if (options.setAsEnvironment && scene.environment) {
        // only clear if it's the same texture we set
        if (envRenderTarget && scene.environment === envRenderTarget.texture) scene.environment = null
        else if (scene.environment === texture) scene.environment = null
      }

      // dispose resources only if not cached/shared
      if (envRenderTarget) {
        try { envRenderTarget.dispose() } catch {}
      }
      try { texture.dispose() } catch {}

      // dispose pmremGenerator we created
      if (!options.pmremGenerator && pmremGenerator) {
        try { pmremGenerator.dispose() } catch {}
      }
    }
  }

  if (options.cache) cubeCache.set(key, { handle, refCount: 1 })
  return handle
}

/**
 * 加载等距/单图（支持 HDR via RGBELoader）
 * @param renderer THREE.WebGLRenderer
 * @param scene THREE.Scene
 * @param url string - *.hdr, *.exr, *.jpg, *.png
 * @param opts SkyboxOptions
 */
export async function loadEquirectSkybox(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  url: string,
  opts: SkyboxOptions = {}
): Promise<SkyboxHandle> {
  const options = { ...DEFAULT_OPTIONS, ...opts }
  const key = url

  if (options.cache && equirectCache.has(key)) {
    const rec = equirectCache.get(key)!
    rec.refCount += 1
    if (options.setAsBackground) scene.background = rec.handle.backgroundTexture
    if (options.setAsEnvironment && rec.handle.envRenderTarget) scene.environment = rec.handle.envRenderTarget.texture
    return rec.handle
  }

  // 动态导入 RGBELoader（用于 .hdr/.exr），如果加载的是普通 jpg/png 可直接用 TextureLoader
  const isHDR = /\.hdr$|\.exr$/i.test(url)
  let hdrTexture: THREE.Texture

  if (isHDR) {
    const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js')
    hdrTexture = await new Promise<THREE.Texture>((resolve, reject) => {
      new RGBELoader().load(
        url,
        (tex) => resolve(tex),
        undefined,
        (err) => reject(err)
      )
    })
    // RGBE textures typically use LinearEncoding
    hdrTexture.encoding = THREE.LinearEncoding
  } else {
    // ordinary image - use TextureLoader
    const loader = new THREE.TextureLoader()
    hdrTexture = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, (t) => resolve(t), undefined, (err) => reject(err))
    })
    if (options.useSRGBEncoding) hdrTexture.encoding = THREE.sRGBEncoding
  }

  // PMREMGenerator to convert equirectangular to prefiltered cubemap (good for PBR)
  const pmremGenerator = options.pmremGenerator ?? new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader?.()

  const envRenderTarget = pmremGenerator.fromEquirectangular(hdrTexture)
  // envTexture to use for scene.environment
  const envTexture = envRenderTarget.texture

  // set background and/or environment
  if (options.setAsBackground) {
    // for background it's ok to use the equirect texture directly or the envTexture
    // envTexture is cubemap-like and usually better for reflections; using it as background creates cube-projected look
    scene.background = envTexture
  }
  if (options.setAsEnvironment) {
    scene.environment = envTexture
  }

  // We can dispose the original hdrTexture (the PMREM target contains the needed data)
  try { hdrTexture.dispose() } catch {}

  const handle: SkyboxHandle = {
    key,
    backgroundTexture: options.setAsBackground ? envTexture : null,
    envRenderTarget,
    pmremGenerator: options.pmremGenerator ? null : pmremGenerator,
    setAsBackground: !!options.setAsBackground,
    setAsEnvironment: !!options.setAsEnvironment,
    dispose() {
      if (options.setAsBackground && scene.background === envTexture) scene.background = null
      if (options.setAsEnvironment && scene.environment === envTexture) scene.environment = null

      try { envRenderTarget.dispose() } catch {}
      if (!options.pmremGenerator && pmremGenerator) {
        try { pmremGenerator.dispose() } catch {}
      }
    }
  }

  if (options.cache) equirectCache.set(key, { handle, refCount: 1 })
  return handle
}

/* -------------------------
   对外的通用 loadSkybox 接口
   ------------------------- */

export type LoadSkyboxParams =
  | { type: 'cube'; paths: string[] }
  | { type: 'equirect'; url: string }

export async function loadSkybox(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  params: LoadSkyboxParams,
  opts: SkyboxOptions = {}
): Promise<SkyboxHandle> {
  if (params.type === 'cube') return loadCubeSkybox(renderer, scene, params.paths, opts)
  return loadEquirectSkybox(renderer, scene, params.url, opts)
}

/* -------------------------
   缓存/引用计数 辅助方法
   ------------------------- */

/** 释放一个缓存的 skybox（会减少 refCount，refCount=0 时才真正 dispose） */
export function releaseSkybox(handle: SkyboxHandle) {
  // check cube cache
  if (cubeCache.has(handle.key)) {
    const rec = cubeCache.get(handle.key)!
    rec.refCount -= 1
    if (rec.refCount <= 0) {
      rec.handle.dispose()
      cubeCache.delete(handle.key)
    }
    return
  }
  if (equirectCache.has(handle.key)) {
    const rec = equirectCache.get(handle.key)!
    rec.refCount -= 1
    if (rec.refCount <= 0) {
      rec.handle.dispose()
      equirectCache.delete(handle.key)
    }
    return
  }
  // if not cached, just dispose
  // handle.dispose()
}
