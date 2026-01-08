import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { ResourceManager } from './resourceManager'

describe('ResourceManager', () => {
    it('should track and dispose of geometries', () => {
        const rm = new ResourceManager()
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const spy = vi.spyOn(geometry, 'dispose')

        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
        rm.track(mesh)

        rm.dispose()
        expect(spy).toHaveBeenCalled()
    })

    it('should track and dispose of materials and textures', () => {
        const rm = new ResourceManager()
        const texture = new THREE.Texture()
        const textureSpy = vi.spyOn(texture, 'dispose')

        const material = new THREE.MeshStandardMaterial({ map: texture })
        const materialSpy = vi.spyOn(material, 'dispose')

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
        rm.track(mesh)

        rm.dispose()
        expect(textureSpy).toHaveBeenCalled()
        expect(materialSpy).toHaveBeenCalled()
    })

    it('should remove object from parent on disposal', () => {
        const rm = new ResourceManager()
        const parent = new THREE.Scene()
        const mesh = new THREE.Mesh()
        parent.add(mesh)

        rm.track(mesh)
        expect(parent.children).toContain(mesh)

        rm.dispose()
        expect(parent.children).not.toContain(mesh)
    })
})
