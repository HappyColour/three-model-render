/**
 * @file modelLoader.ts
 * @description
 * Utility to load 3D models (GLTF, FBX, OBJ, PLY, STL) from URLs.
 *
 * @best-practice
 * - Use `loadModelByUrl` for a unified loading interface.
 * - Supports Draco compression and KTX2 textures for GLTF.
 * - Includes optimization options like geometry merging and texture downscaling.
 */

import * as THREE from 'three'

type LoaderLike = {
  load: (url: string,
    onLoad: (res: any) => void,
    onProgress?: (ev: ProgressEvent) => void,
    onError?: (err: any) => void) => void
}

/** Loading Options: Now has default values */
export interface LoadOptions {
  manager?: THREE.LoadingManager
  // GLTF-specific
  dracoDecoderPath?: string | null
  ktx2TranscoderPath?: string | null
  useKTX2?: boolean
  // Generic optimizations
  mergeGeometries?: boolean
  maxTextureSize?: number | null
  useSimpleMaterials?: boolean
  skipSkinned?: boolean
}

const DEFAULT_OPTIONS: Required<Omit<LoadOptions, 'manager' | 'dracoDecoderPath' | 'ktx2TranscoderPath'>> = {
  useKTX2: false,
  mergeGeometries: false,
  maxTextureSize: null,
  useSimpleMaterials: false,
  skipSkinned: true,
}

/** Automatically determine which options to enable based on extension (smart judgment) */
function normalizeOptions(url: string, opts: LoadOptions): LoadOptions {
  const ext = (url.split('.').pop() || '').toLowerCase()
  const merged: LoadOptions = { ...DEFAULT_OPTIONS, ...opts }

  if (ext === 'gltf' || ext === 'glb') {
    // gltf/glb defaults to trying draco/ktx2 if user didn't specify
    if (merged.dracoDecoderPath === undefined) merged.dracoDecoderPath = '/draco/'
    if (merged.useKTX2 === undefined) merged.useKTX2 = true
    if (merged.ktx2TranscoderPath === undefined) merged.ktx2TranscoderPath = '/basis/'
  } else {
    // fbx/obj/ply/stl etc. do not need draco/ktx2
    merged.dracoDecoderPath = null
    merged.ktx2TranscoderPath = null
    merged.useKTX2 = false
  }

  return merged
}

export async function loadModelByUrl(
  url: string,
  options: LoadOptions = {}
): Promise<THREE.Object3D> {
  if (!url) throw new Error('url required')

  const ext = (url.split('.').pop() || '').toLowerCase()
  const opts = normalizeOptions(url, options)
  const manager = opts.manager ?? new THREE.LoadingManager()

  let loader: LoaderLike
  if (ext === 'gltf' || ext === 'glb') {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const gltfLoader = new GLTFLoader(manager)

    if (opts.dracoDecoderPath) {
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')
      const draco = new DRACOLoader()
      draco.setDecoderPath(opts.dracoDecoderPath)
      gltfLoader.setDRACOLoader(draco)
    }

    if (opts.useKTX2 && opts.ktx2TranscoderPath) {
      const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js')
      const ktx2Loader = new KTX2Loader().setTranscoderPath(opts.ktx2TranscoderPath)
        ; (gltfLoader as any).__ktx2Loader = ktx2Loader
    }

    loader = gltfLoader as any
  } else if (ext === 'fbx') {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
    loader = new FBXLoader(manager)

  } else if (ext === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    loader = new OBJLoader(manager)
  } else if (ext === 'ply') {
    const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js')
    loader = new PLYLoader(manager)
  } else if (ext === 'stl') {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
    loader = new STLLoader(manager)
  } else {
    throw new Error(`Unsupported model extension: .${ext}`)
  }

  const object = await new Promise<THREE.Object3D>((resolve, reject) => {
    loader.load(
      url,
      (res: any) => {
        if (ext === 'gltf' || ext === 'glb') {
          const sceneObj = res.scene || res;

          // --- Critical: Expose animations to scene.userData (or scene.animations) ---
          // So the caller can access clips simply by getting sceneObj.userData.animations
          (sceneObj as any).userData = (sceneObj as any)?.userData || {};
          (sceneObj as any).userData.animations = res.animations ?? [];
          resolve(sceneObj as THREE.Object3D)
        }
        else {
          resolve(res as THREE.Object3D)
        }
      },
      undefined,
      (err) => reject(err)
    )
  })

  // Optimize
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && mesh.geometry && !(mesh.geometry as any).isBufferGeometry) {
      try {
        mesh.geometry = (new THREE.BufferGeometry() as any).fromGeometry?.(mesh.geometry as any) ?? mesh.geometry
      } catch { }
    }
  })

  if (opts.maxTextureSize && opts.maxTextureSize > 0) downscaleTexturesInObject(object, opts.maxTextureSize)
  if (opts.useSimpleMaterials) {
    object.traverse((child) => {
      const m = (child as any).material
      if (!m) return
      if (Array.isArray(m)) (child as any).material = m.map((mat: any) => toSimpleMaterial(mat))
      else (child as any).material = toSimpleMaterial(m)
    })
  }

  if (opts.mergeGeometries) {
    try {
      await tryMergeGeometries(object, { skipSkinned: opts.skipSkinned ?? true })
    } catch (e) {
      console.warn('mergeGeometries failed', e)
    }
  }

  return object
}

/** Runtime downscale textures in mesh to maxSize (canvas drawImage) to save GPU memory */
function downscaleTexturesInObject(obj: THREE.Object3D, maxSize: number) {
  obj.traverse((ch) => {
    if (!(ch as any).isMesh) return
    const mesh = ch as THREE.Mesh
    const mat = mesh.material as any
    if (!mat) return
    const props = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']
    props.forEach((p) => {
      const tex = mat[p] as THREE.Texture | undefined
      if (!tex || !tex.image) return
      const image: any = tex.image
      if (!image.width || !image.height) return
      const max = maxSize
      if (image.width <= max && image.height <= max) return
      // downscale using canvas (sync, may be heavy for many textures)
      try {
        const scale = Math.min(max / image.width, max / image.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(image.width * scale)
        canvas.height = Math.floor(image.height * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          const newTex = new THREE.Texture(canvas)
          newTex.needsUpdate = true
          // copy common settings (encoding etc)
          newTex.encoding = tex.encoding
          mat[p] = newTex
        }
      } catch (e) {
        console.warn('downscale texture failed', e)
      }
    })
  })
}

/**
 * Try to merge geometries in object (Only merge: non-transparent, non-SkinnedMesh, attribute compatible BufferGeometry)
 * - Before merging, apply world matrix to each mesh's geometry (so merged geometry is in world space)
 * - Merging will group by material UUID (different materials cannot be merged)
 * - Merge function is compatible with common export names of BufferGeometryUtils
 */
async function tryMergeGeometries(root: THREE.Object3D, opts: { skipSkinned: boolean }) {
  // collect meshes by material uuid
  const groups = new Map<string, { material: THREE.Material, geoms: THREE.BufferGeometry[] }>()
  root.traverse((ch) => {
    if (!(ch as any).isMesh) return
    const mesh = ch as THREE.Mesh
    if (opts.skipSkinned && (mesh as any).isSkinnedMesh) return
    const mat = mesh.material as any
    // don't merge transparent or morph-enabled or skinned meshes
    if (!mesh.geometry || mesh.visible === false) return
    if (mat && mat.transparent) return
    const geom = (mesh.geometry as THREE.BufferGeometry).clone()
    mesh.updateWorldMatrix(true, false)
    geom.applyMatrix4(mesh.matrixWorld)
    // ensure attributes compatible? we'll rely on merge function to return null if incompatible
    const key = (mat && mat.uuid) || 'default'
    const bucket = groups.get(key) ?? { material: mat ?? new THREE.MeshStandardMaterial(), geoms: [] as THREE.BufferGeometry[] }
    bucket.geoms.push(geom)
    groups.set(key, bucket)
    // mark for removal (we'll remove meshes after)
    mesh.userData.__toRemoveForMerge = true
  })

  if (groups.size === 0) return

  // dynamic import BufferGeometryUtils and find merge function name
  const bufUtilsMod: any = await import('three/examples/jsm/utils/BufferGeometryUtils.js')
  // use || chain (avoid mixing ?? with || without parentheses)
  const mergeFn =
    bufUtilsMod.mergeBufferGeometries ||
    bufUtilsMod.mergeGeometries ||
    bufUtilsMod.mergeBufferGeometries || // defensive duplicate
    bufUtilsMod.mergeGeometries

  if (!mergeFn) throw new Error('No merge function found in BufferGeometryUtils')

  // for each group, try merge
  for (const [key, { material, geoms }] of groups) {
    if (geoms.length <= 1) {
      // nothing to merge
      continue
    }
    // call merge function - signature typically mergeBufferGeometries(array, useGroups)
    const merged = mergeFn(geoms, false)
    if (!merged) {
      console.warn('merge returned null for group', key)
      continue
    }
    // create merged mesh at root (world-space geometry already applied)
    const mergedMesh = new THREE.Mesh(merged, material)
    root.add(mergedMesh)
  }

  // now remove original meshes flagged for removal
  const toRemove: THREE.Object3D[] = []
  root.traverse((ch) => {
    if ((ch as any).userData?.__toRemoveForMerge) toRemove.push(ch)
  })
  toRemove.forEach((m) => {
    if (m.parent) m.parent.remove(m)
    // free original resources (geometries already cloned/applied), but careful with shared materials
    if ((m as any).isMesh) {
      const mm = m as THREE.Mesh
      try { mm.geometry.dispose() } catch { }
      // we do NOT dispose material because it may be reused by mergedMesh
    }
  })
}

/* ---------------------
   Dispose Utils
   --------------------- */

/** Completely dispose object: geometry, material and its textures (Danger: shared resources will be disposed) */
export function disposeObject(obj: THREE.Object3D | null) {
  if (!obj) return
  obj.traverse((ch) => {
    if ((ch as any).isMesh) {
      const m = ch as THREE.Mesh
      if (m.geometry) {
        try { m.geometry.dispose() } catch { }
      }
      const mat = m.material as any
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((x) => disposeMaterial(x))
        else disposeMaterial(mat)
      }
    }
  })
}

/** Dispose material and its textures */
export function disposeMaterial(mat: any) {
  if (!mat) return
  const texNames = ['map', 'alphaMap', 'aoMap', 'emissiveMap', 'envMap', 'metalnessMap', 'roughnessMap', 'normalMap', 'bumpMap', 'displacementMap', 'lightMap']
  texNames.forEach((k) => {
    if (mat[k] && typeof mat[k].dispose === 'function') {
      try { mat[k].dispose() } catch { }
    }
  })
  try { if (typeof mat.dispose === 'function') mat.dispose() } catch { }
}

// Helper to convert to simple material (stub)
function toSimpleMaterial(mat: any) {
  // Basic implementation, preserve color/map
  const m = new THREE.MeshBasicMaterial()
  if (mat.color) m.color.copy(mat.color)
  if (mat.map) m.map = mat.map
  return m
}
