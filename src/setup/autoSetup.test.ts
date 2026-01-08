import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { autoSetupCameraAndLight } from './autoSetup'

describe('autoSetupCameraAndLight', () => {
    it('should throw error if required arguments are missing', () => {
        expect(() => autoSetupCameraAndLight(null as any, null as any, null as any)).toThrow()
    })

    it('should setup camera and lights for a given model', () => {
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
        const scene = new THREE.Scene()
        const model = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())

        const handle = autoSetupCameraAndLight(camera, scene, model)

        expect(handle).toBeDefined()
        expect(handle.lightsGroup).toBeInstanceOf(THREE.Group)
        expect(scene.children).toContain(handle.lightsGroup)
        expect(handle.radius).toBeGreaterThan(0)

        // Cleanup
        handle.dispose()
        expect(scene.children).not.toContain(handle.lightsGroup)
    })

    it('should enable shadows if requested', () => {
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
        const scene = new THREE.Scene()
        const model = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())
        const renderer = {
            shadowMap: { enabled: false, type: 0 }
        } as unknown as THREE.WebGLRenderer

        autoSetupCameraAndLight(camera, scene, model, {
            enableShadows: true,
            renderer
        })

        expect(renderer.shadowMap.enabled).toBe(true)
    })
})
