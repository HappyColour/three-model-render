/**
 * @file autoSetup.ts
 * @description
 * Automatically sets up the camera and basic lighting scene based on the model's bounding box.
 *
 * @best-practice
 * - Call `autoSetupCameraAndLight` after loading a model to get a quick "good looking" scene.
 * - Returns a handle to dispose lights or update intensity later.
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

/**
 * Return handle, containing created lights group, computed center/radius, and dispose method
 */
export type AutoSetupHandle = {
  lightsGroup: THREE.Group
  center: THREE.Vector3
  radius: number
  dispose: () => void
  updateLightIntensity: (factor: number) => void
}

/**
 * Automatically setup camera and basic lighting - Optimized
 *
 * Features:
 * - Adds light intensity adjustment method
 * - Improved error handling
 * - Optimized dispose logic
 *
 * - camera: THREE.PerspectiveCamera (will be moved and pointed at model center)
 * - scene: THREE.Scene (newly created light group will be added to the scene)
 * - model: THREE.Object3D loaded model (arbitrary transform/coordinates)
 * - options: Optional configuration (see AutoSetupOptions)
 *
 * Returns AutoSetupHandle, caller should call handle.dispose() when component unmounts/switches
 */
export function autoSetupCameraAndLight(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  model: THREE.Object3D,
  options: AutoSetupOptions = {}
): AutoSetupHandle {
  // Boundary check
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
    // --- 1) Calculate bounding data
    const box = new THREE.Box3().setFromObject(model)

    // Check bounding box validity
    if (!isFinite(box.min.x)) {
      throw new Error('autoSetupCameraAndLight: Invalid bounding box')
    }

    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    const center = sphere.center.clone()
    const radius = Math.max(0.001, sphere.radius)

    // --- 2) Calculate camera position
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

    // --- 3) Enable Shadows
    if (opts.renderer && opts.enableShadows) {
      opts.renderer.shadowMap.enabled = true
      opts.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    // --- 4) Create Lights Group
    const lightsGroup = new THREE.Group()
    lightsGroup.name = 'autoSetupLightsGroup'
    lightsGroup.position.copy(center)
    scene.add(lightsGroup)

    // 4.1 Basic Light
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    hemi.name = 'auto_hemi'
    hemi.position.set(0, radius * 2.0, 0)
    lightsGroup.add(hemi)

    const ambient = new THREE.AmbientLight(0xffffff, 0.25)
    ambient.name = 'auto_ambient'
    lightsGroup.add(ambient)

    // 4.2 Directional Lights
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

    // 4.3 Point Light Fill
    const fill1 = new THREE.PointLight(0xffffff, 0.5, radius * 4)
    fill1.position.copy(center).add(new THREE.Vector3(radius * 0.5, 0.2 * radius, 0))
    fill1.name = 'auto_fill1'
    lightsGroup.add(fill1)

    const fill2 = new THREE.PointLight(0xffffff, 0.3, radius * 3)
    fill2.position.copy(center).add(new THREE.Vector3(-radius * 0.5, -0.2 * radius, 0))
    fill2.name = 'auto_fill2'
    lightsGroup.add(fill2)

    // --- 5) Set Mesh Shadow Props
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

    // --- 6) Return handle ---
    const handle: AutoSetupHandle = {
      lightsGroup,
      center,
      radius,
      // Update light intensity
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
          // Remove lights group
          if (lightsGroup.parent) lightsGroup.parent.remove(lightsGroup)

          // Dispose shadow resources
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
