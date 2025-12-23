export interface GlobalLoaderConfig {
    dracoDecoderPath: string
    ktx2TranscoderPath: string
}

let globalConfig: GlobalLoaderConfig = {
    dracoDecoderPath: '/draco/',
    ktx2TranscoderPath: '/basis/',
}

/**
 * Update global loader configuration (e.g., set path to CDN)
 */
export function setLoaderConfig(config: Partial<GlobalLoaderConfig>) {
    globalConfig = { ...globalConfig, ...config }
}

/**
 * Get current global loader configuration
 */
export function getLoaderConfig(): GlobalLoaderConfig {
    return globalConfig
}
