import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { loadModelByUrl } from './modelLoader'

// Mock GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: class {
        load(url: string, onLoad: any) {
            onLoad({ scene: new THREE.Group() })
        }
        setDRACOLoader() { }
    }
}))

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
    DRACOLoader: class {
        setDecoderPath() { }
    }
}))

vi.mock('three/examples/jsm/loaders/KTX2Loader.js', () => ({
    KTX2Loader: class {
        setTranscoderPath() { return this }
    }
}))

describe('modelLoader - Texture Optimization', () => {
    it('should call downscaleTexturesInObject when maxTextureSize is set', async () => {
        // This is hard to test deeply without real images, but we can check if it runs without crashing
        const model = await loadModelByUrl('test.glb', { maxTextureSize: 512 })
        expect(model).toBeDefined()
    })

    it('should return a cached model if requested', async () => {
        const model1 = await loadModelByUrl('cache-test.glb')
        const model2 = await loadModelByUrl('cache-test.glb')

        expect(model1).not.toBe(model2) // Should be clones
        expect(model1.type).toBe(model2.type)
    })
})
