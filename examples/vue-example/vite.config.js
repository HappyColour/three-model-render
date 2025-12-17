import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@chocozhang/three-model-render/setup': path.resolve(__dirname, '../../src/setup/index.ts'),
            '@chocozhang/three-model-render/loader': path.resolve(__dirname, '../../src/loader/index.ts'),
            '@chocozhang/three-model-render/core': path.resolve(__dirname, '../../src/core/index.ts'),
            '@chocozhang/three-model-render/camera': path.resolve(__dirname, '../../src/camera/index.ts'),
            '@chocozhang/three-model-render/effect': path.resolve(__dirname, '../../src/effect/index.ts'),
            '@chocozhang/three-model-render/interaction': path.resolve(__dirname, '../../src/interaction/index.ts'),
            '@chocozhang/three-model-render/ui': path.resolve(__dirname, '../../src/ui/index.ts'),
            '@chocozhang/three-model-render': path.resolve(__dirname, '../../src/index.ts'),
            'three': path.resolve(__dirname, 'node_modules/three')
        }
    },
    optimizeDeps: {
        include: ['three']
    }
})
