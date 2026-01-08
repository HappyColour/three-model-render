/**
 * @file autoSetup.ts
 * @description
 * Automatically sets up the camera and basic lighting scene based on the model's bounding box.
 */

import * as THREE from 'three'

export interface AutoSetupOptions {
  /** Extra padding multiplier based on bounding sphere (>1 expands view range) */
  padding?: number
  /** Camera elevation offset (radians), default slight top-down (0.2 rad ≈ 11°) */
  elevation?: number
  /** Whether to enable shadows - high performance cost, default false */
  enableShadows?: boolean
  /** Shadow map size, higher is clearer but more expensive, default 1024 */
  shadowMapSize?: number
  /** Number of DirectionalLights (evenly distributed around) */
  directionalCount?: number
  /** Whether to automatically set mesh.castShadow / mesh.receiveShadow to true (default true) */
  setMeshShadowProps?: boolean
  /** If renderer is passed, the tool will automatically enable renderer.shadowMap (if enableShadows is true) */
  renderer?: THREE.WebGLRenderer | null
}

export type AutoSetupHandle = {
  lightsGroup: THREE.Group
  center: THREE.Vector3
  radius: number
  dispose: () => void
  updateLightIntensity: (factor: number) => void
}

/**
 * Fit camera to object bounding box
 */
export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  padding = 1.2,
  elevation = 0.2
) {
  const box = new THREE.Box3().setFromObject(object)
  if (!isFinite(box.min.x)) return { center: new THREE.Vector3(), radius: 0 }

  const sphere = new THREE.Sphere()
  box.getBoundingSphere(sphere)
  const center = sphere.center.clone()
  const radius = Math.max(0.001, sphere.radius)

  const fov = (camera.fov * Math.PI) / 180
  const halfFov = fov / 2
  const sinHalfFov = Math.max(Math.sin(halfFov), 0.001)
  const distance = (radius * padding) / sinHalfFov

  const dir = new THREE.Vector3(
    0,
    Math.sin(elevation),
    Math.cos(elevation)
  ).normalize()

  const desiredPos = center.clone().add(dir.multiplyScalar(distance))

  camera.position.copy(desiredPos)
  camera.lookAt(center)
  camera.near = Math.max(0.001, radius / 1000)
  camera.far = Math.max(1000, radius * 50)
  camera.updateProjectionMatrix()

  return { center, radius }
}

/**
 * Setup default lighting for a model
 */
export function setupDefaultLights(
  scene: THREE.Scene,
  model: THREE.Object3D,
  options: AutoSetupOptions = {}
): AutoSetupHandle {
  const box = new THREE.Box3().setFromObject(model)
  const sphere = new THREE.Sphere()
  box.getBoundingSphere(sphere)
  const center = sphere.center.clone()
  const radius = Math.max(0.001, sphere.radius)

  const opts: Required<AutoSetupOptions> = {
    padding: options.padding ?? 1.2,
    elevation: options.elevation ?? 0.2,
    enableShadows: options.enableShadows ?? false,
    shadowMapSize: options.shadowMapSize ?? 1024,
    directionalCount: options.directionalCount ?? 4,
    setMeshShadowProps: options.setMeshShadowProps ?? true,
    renderer: options.renderer ?? null,
  }

  if (opts.renderer && opts.enableShadows) {
    opts.renderer.shadowMap.enabled = true
    opts.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  const lightsGroup = new THREE.Group()
  lightsGroup.name = 'autoSetupLightsGroup'
  lightsGroup.position.copy(center)
  scene.add(lightsGroup)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
  hemi.position.set(0, radius * 2.0, 0)
  lightsGroup.add(hemi)

  const ambient = new THREE.AmbientLight(0xffffff, 0.25)
  lightsGroup.add(ambient)

  const dirCount = Math.max(1, Math.floor(opts.directionalCount))
  const dirs: THREE.Vector3[] = [new THREE.Vector3(0, 1, 0)]

  for (let i = 0; i < dirCount; i++) {
    const angle = (i / dirCount) * Math.PI * 2
    const v = new THREE.Vector3(Math.cos(angle), 0.3, Math.sin(angle)).normalize()
    dirs.push(v)
  }

  const shadowCamSize = Math.max(1, radius * 1.5)
  dirs.forEach((d, i) => {
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
  })

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

  const handle: AutoSetupHandle = {
    lightsGroup,
    center,
    radius,
    updateLightIntensity(factor: number) {
      lightsGroup.traverse((node) => {
        if ((node as any).isLight) {
          const light = node as THREE.Light
          light.intensity *= factor // Simple implementation
        }
      })
    },
    dispose: () => {
      if (lightsGroup.parent) lightsGroup.parent.remove(lightsGroup)
      lightsGroup.traverse((node) => {
        if ((node as any).isLight) {
          const l = node as THREE.Light & { shadow?: any }
          if (l.shadow && l.shadow.map) l.shadow.map.dispose()
        }
      })
    }
  }

  return handle
}

/**
 * Automatically setup camera and basic lighting (Combine fitCameraToObject and setupDefaultLights)
 */
export function autoSetupCameraAndLight(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  model: THREE.Object3D,
  options: AutoSetupOptions = {}
): AutoSetupHandle {
  fitCameraToObject(camera, model, options.padding, options.elevation)
  return setupDefaultLights(scene, model, options)
}
