import { describe, it, expect, beforeEach } from 'vitest'
import { setLoaderConfig, getLoaderConfig } from './config'

describe('Loader Configuration', () => {
    beforeEach(() => {
        // Reset to defaults before each test
        setLoaderConfig({
            dracoDecoderPath: '/draco/',
            ktx2TranscoderPath: '/basis/',
        })
    })

    it('should have default values', () => {
        const config = getLoaderConfig()
        expect(config.dracoDecoderPath).toBe('/draco/')
        expect(config.ktx2TranscoderPath).toBe('/basis/')
    })

    it('should update configuration', () => {
        setLoaderConfig({ dracoDecoderPath: '/custom/draco/' })
        const config = getLoaderConfig()
        expect(config.dracoDecoderPath).toBe('/custom/draco/')
        expect(config.ktx2TranscoderPath).toBe('/basis/') // preserved
    })
})
