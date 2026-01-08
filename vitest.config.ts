import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/*.{test,spec}.{ts,js}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/index.ts'],
            // Baseline thresholds - increase as coverage improves
            thresholds: {
                lines: 8,
                branches: 7,
                functions: 10,
                statements: 8
            }
        }
    },
})

