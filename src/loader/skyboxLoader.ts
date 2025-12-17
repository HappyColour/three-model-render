/**
 * @file skyboxLoader.ts
 * @description
 * Utility for loading skyboxes (CubeTexture or Equirectangular/HDR).
 *
 * @best-practice
 * - Use `loadSkybox` for a unified interface.
 * - Supports internal caching to avoid reloading the same skybox.
 * - Can set background and environment map independently.
 */

import * as THREE from 'three'

/**
 * Skybox Loader Utility
 *
 * Supports:
 *  - Cube Texture: paths: [px, nx, py, ny, pz, nz]
 *  - Equirectangular / HDR Panorama: url: 'path/to/scene.hdr' or jpg
 *
 * Returns a SkyboxHandle containing modification records for the scene and a dispose() method.
 */

/** Unified Return Handle */
export type SkyboxHandle = {
  key: string
  backgroundTexture: THREE.Texture | null
  envRenderTarget: THREE.WebGLRenderTarget | null
  pmremGenerator: THREE.PMREMGenerator | null
  setAsBackground: boolean
  setAsEnvironment: boolean
  /** Unload and release resources (if cached/shared, refCount logic is needed) */
  dispose: () => void
}

/** Loading Options & Defaults */
export interface SkyboxOptions {
  setAsBackground?: boolean       // Whether to set texture as scene.background (default true)
  setAsEnvironment?: boolean      // Whether to set texture as scene.environment (default true)
  // If you already have a pmremGenerator (and reuse it across multiple skybox/load), pass it in to avoid duplicate creation
  pmremGenerator?: THREE.PMREMGenerator | null
  // Whether to use sRGB encoding (default true, suitable for most color textures)
  useSRGBEncoding?: boolean
  // Cache switch (if true, same key reuses existing texture, refCount managed automatically)
  cache?: boolean
}

/** Default Values */
const DEFAULT_OPTIONS: Required<Omit<SkyboxOptions, 'pmremGenerator'>> = {
  setAsBackground: true,
  setAsEnvironment: true,
  useSRGBEncoding: true,
  cache: true
}

/** Internal Cache: key -> { handle, refCount } */
const cubeCache = new Map<string, { handle: SkyboxHandle; refCount: number }>()
const equirectCache = new Map<string, { handle: SkyboxHandle; refCount: number }>()

/* -------------------------------------------
   Public Function: Load skybox (Automatically choose cube or equirect)
   ------------------------------------------- */

/**
 * Load Cube Texture (6 images)
 * @param renderer THREE.WebGLRenderer - Used for PMREM generating environment map
 * @param scene THREE.Scene
 * @param paths string[] 6 image paths, order: [px, nx, py, ny, pz, nz]
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

  // Cache handling
  if (options.cache && cubeCache.has(key)) {
    const rec = cubeCache.get(key)!
    rec.refCount += 1
    // reapply to scene (in case it was removed)
    if (options.setAsBackground) scene.background = rec.handle.backgroundTexture
    if (options.setAsEnvironment && rec.handle.envRenderTarget) scene.environment = rec.handle.envRenderTarget.texture
    return rec.handle
  }

  // Load cube texture
  const loader = new THREE.CubeTextureLoader()
  const texture = await new Promise<THREE.CubeTexture>((resolve, reject) => {
    loader.load(
      paths,
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err)
    )
  })

  // Set encoding and mapping
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
        try { envRenderTarget.dispose() } catch { }
      }
      try { texture.dispose() } catch { }

      // dispose pmremGenerator we created
      if (!options.pmremGenerator && pmremGenerator) {
        try { pmremGenerator.dispose() } catch { }
      }
    }
  }

  if (options.cache) cubeCache.set(key, { handle, refCount: 1 })
  return handle
}

/**
 * Load Equirectangular/Single Image (Supports HDR via RGBELoader)
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

  // Dynamically import RGBELoader (for .hdr/.exr), if loading normal jpg/png directly use TextureLoader
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
  try { hdrTexture.dispose() } catch { }

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

      try { envRenderTarget.dispose() } catch { }
      if (!options.pmremGenerator && pmremGenerator) {
        try { pmremGenerator.dispose() } catch { }
      }
    }
  }

  if (options.cache) equirectCache.set(key, { handle, refCount: 1 })
  return handle
}

/* -------------------------
   Public General loadSkybox Interface
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
   Cache / Reference Counting Helper Methods
   ------------------------- */

/** Release a cached skybox (decrements refCount, only truly disposes when refCount=0) */
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
