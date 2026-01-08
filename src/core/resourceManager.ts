import * as THREE from 'three'

/**
 * ResourceManager
 * Handles tracking and disposal of Three.js objects to prevent memory leaks.
 */
export class ResourceManager {
    private geometries = new Set<THREE.BufferGeometry>()
    private materials = new Set<THREE.Material>()
    private textures = new Set<THREE.Texture>()
    private objects = new Set<THREE.Object3D>()

    /**
     * Track an object and its resources recursively
     */
    track(object: THREE.Object3D): THREE.Object3D {
        this.objects.add(object)

        object.traverse((child) => {
            if ((child as any).isMesh) {
                const mesh = child as THREE.Mesh
                if (mesh.geometry) this.geometries.add(mesh.geometry)
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => this.trackMaterial(m))
                    } else {
                        this.trackMaterial(mesh.material)
                    }
                }
            }
        })

        return object
    }

    private trackMaterial(material: THREE.Material) {
        this.materials.add(material)

        // Track textures in material
        for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) {
                this.textures.add(value)
            }
        }
    }

    /**
     * Dispose all tracked resources
     */
    dispose() {
        this.geometries.forEach(g => g.dispose())
        this.materials.forEach(m => m.dispose())
        this.textures.forEach(t => t.dispose())

        this.objects.forEach(obj => {
            if (obj.parent) {
                obj.parent.remove(obj)
            }
        })

        this.geometries.clear()
        this.materials.clear()
        this.textures.clear()
        this.objects.clear()
    }
}
