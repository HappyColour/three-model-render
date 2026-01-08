/**
 * @file performanceStats.ts
 * @description
 * Real-time performance monitoring overlay for Three.js applications.
 * Displays FPS, memory usage, draw calls, and performance warnings.
 * 
 * @best-practice
 * - Create once during initialization
 * - Call update() in your animation loop
 * - Use minimal styling for low performance impact
 * 
 * @performance
 * - Uses requestAnimationFrame for efficient updates
 * - DOM updates are batched and throttled
 * - Minimal memory footprint
 */

import * as THREE from 'three'

/**
 * Options for configuring the performance monitoring overlay.
 */
export interface PerformanceStatsOptions {
    /** Position of the stats overlay on the screen. Default is 'top-left'. */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    /** Refresh interval for DOM updates in milliseconds. Default is 500ms. */
    updateInterval?: number
    /** Whether to track and display JS heap memory usage. Default is true. */
    enableMemoryTracking?: boolean
    /** Whether to show visual warnings when performance drops. Default is true. */
    enableWarnings?: boolean
    /** Optional WebGLRenderer to track draw calls and triangle counts. */
    renderer?: THREE.WebGLRenderer | null
    /** FPS threshold below which a warning is triggered. Default is 30. */
    fpsWarningThreshold?: number
    /** Memory usage threshold (in MB) above which a warning is triggered. Default is 200. */
    memoryWarningThreshold?: number
}

interface PerformanceWarning {
    type: 'low-fps' | 'high-memory' | 'excessive-drawcalls'
    message: string
    severity: 'info' | 'warning' | 'critical'
    timestamp: number
}

/**
 * Performance Stats Monitor
 * Lightweight FPS and memory monitoring overlay
 */
export class PerformanceStats {
    private container: HTMLDivElement
    private fpsElement: HTMLSpanElement
    private memoryElement: HTMLSpanElement
    private drawCallsElement: HTMLSpanElement
    private trianglesElement: HTMLSpanElement
    private warningsContainer: HTMLDivElement

    private frames = 0
    private lastTime = performance.now()
    private fps = 60
    private fpsHistory: number[] = []
    private maxHistoryLength = 60

    private updateInterval: number
    private lastUpdateTime = 0

    private warnings: PerformanceWarning[] = []
    private maxWarnings = 3

    private enabled = true
    private isVisible = true

    private options: Required<Omit<PerformanceStatsOptions, 'renderer'>> & { renderer: THREE.WebGLRenderer | null }

    constructor(options: PerformanceStatsOptions = {}) {
        this.options = {
            position: options.position || 'top-left',
            updateInterval: options.updateInterval || 500,
            enableMemoryTracking: options.enableMemoryTracking ?? true,
            enableWarnings: options.enableWarnings ?? true,
            renderer: options.renderer || null,
            fpsWarningThreshold: options.fpsWarningThreshold || 30,
            memoryWarningThreshold: options.memoryWarningThreshold || 200
        }

        this.updateInterval = this.options.updateInterval

        // Create container
        this.container = document.createElement('div')
        this.container.className = 'tm-performance-stats'
        this.setPosition(this.options.position)

        // Create FPS display
        const fpsLabel = document.createElement('div')
        fpsLabel.className = 'tm-perf-row'
        fpsLabel.innerHTML = '<span class="tm-perf-label">FPS:</span> <span class="tm-perf-value" id="tm-fps">60</span>'
        this.fpsElement = fpsLabel.querySelector('#tm-fps') as HTMLSpanElement
        this.container.appendChild(fpsLabel)

        // Create memory display
        if (this.options.enableMemoryTracking && (performance as any).memory) {
            const memLabel = document.createElement('div')
            memLabel.className = 'tm-perf-row'
            memLabel.innerHTML = '<span class="tm-perf-label">Memory:</span> <span class="tm-perf-value" id="tm-mem">0 MB</span>'
            this.memoryElement = memLabel.querySelector('#tm-mem') as HTMLSpanElement
            this.container.appendChild(memLabel)
        } else {
            this.memoryElement = document.createElement('span')
        }

        // Create draw calls display
        if (this.options.renderer) {
            const drawLabel = document.createElement('div')
            drawLabel.className = 'tm-perf-row'
            drawLabel.innerHTML = '<span class="tm-perf-label">Draw Calls:</span> <span class="tm-perf-value" id="tm-draw">0</span>'
            this.drawCallsElement = drawLabel.querySelector('#tm-draw') as HTMLSpanElement
            this.container.appendChild(drawLabel)

            const triLabel = document.createElement('div')
            triLabel.className = 'tm-perf-row'
            triLabel.innerHTML = '<span class="tm-perf-label">Triangles:</span> <span class="tm-perf-value" id="tm-tri">0</span>'
            this.trianglesElement = triLabel.querySelector('#tm-tri') as HTMLSpanElement
            this.container.appendChild(triLabel)
        } else {
            this.drawCallsElement = document.createElement('span')
            this.trianglesElement = document.createElement('span')
        }

        // Create warnings container
        if (this.options.enableWarnings) {
            this.warningsContainer = document.createElement('div')
            this.warningsContainer.className = 'tm-perf-warnings'
            this.container.appendChild(this.warningsContainer)
        } else {
            this.warningsContainer = document.createElement('div')
        }

        // Inject styles
        this.injectStyles()

        // Append to body
        document.body.appendChild(this.container)
    }

    private setPosition(position: string) {
        const positions = {
            'top-left': { top: '10px', left: '10px' },
            'top-right': { top: '10px', right: '10px' },
            'bottom-left': { bottom: '10px', left: '10px' },
            'bottom-right': { bottom: '10px', right: '10px' }
        }

        const pos = positions[position as keyof typeof positions] || positions['top-left']
        Object.assign(this.container.style, {
            position: 'fixed',
            zIndex: '99999',
            ...pos
        })
    }

    private injectStyles() {
        const styleId = 'tm-performance-stats-styles'
        if (document.getElementById(styleId)) return

        const style = document.createElement('style')
        style.id = styleId
        style.innerHTML = `
      .tm-performance-stats {
        background: rgba(0, 0, 0, 0.8);
        color: #0f0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        padding: 10px;
        border-radius: 4px;
        min-width: 180px;
        backdrop-filter: blur(4px);
        user-select: none;
        pointer-events: none;
      }
      .tm-perf-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .tm-perf-label {
        color: #888;
      }
      .tm-perf-value {
        color: #0f0;
        font-weight: bold;
      }
      .tm-perf-value.warning {
        color: #ff0;
      }
      .tm-perf-value.critical {
        color: #f00;
      }
      .tm-perf-warnings {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #333;
      }
      .tm-perf-warning {
        font-size: 10px;
        padding: 4px;
        margin-bottom: 4px;
        border-radius: 2px;
      }
      .tm-perf-warning.info {
        background: rgba(0, 128, 255, 0.2);
        color: #0af;
      }
      .tm-perf-warning.warning {
        background: rgba(255, 200, 0, 0.2);
        color: #fc0;
      }
      .tm-perf-warning.critical {
        background: rgba(255, 0, 0, 0.2);
        color: #f66;
      }
    `
        document.head.appendChild(style)
    }

    /**
     * Updates the performance statistics. This method must be called within the application's animation loop.
     */
    update() {
        if (!this.enabled) return

        const now = performance.now()
        this.frames++

        // Calculate FPS
        const delta = now - this.lastTime
        if (delta >= 1000) {
            this.fps = Math.round((this.frames * 1000) / delta)
            this.fpsHistory.push(this.fps)
            if (this.fpsHistory.length > this.maxHistoryLength) {
                this.fpsHistory.shift()
            }
            this.frames = 0
            this.lastTime = now
        }

        // Throttle DOM updates
        if (now - this.lastUpdateTime < this.updateInterval) {
            return
        }
        this.lastUpdateTime = now

        // Update FPS display
        this.fpsElement.textContent = this.fps.toString()
        this.fpsElement.className = 'tm-perf-value'
        if (this.fps < this.options.fpsWarningThreshold) {
            this.fpsElement.classList.add('critical')
            this.addWarning({
                type: 'low-fps',
                message: `Low FPS: ${this.fps}`,
                severity: 'critical',
                timestamp: now
            })
        } else if (this.fps < this.options.fpsWarningThreshold + 10) {
            this.fpsElement.classList.add('warning')
        }

        // Update memory display
        if (this.options.enableMemoryTracking && (performance as any).memory) {
            const memory = (performance as any).memory
            const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
            const totalMB = Math.round(memory.jsHeapSizeLimit / 1048576)
            this.memoryElement.textContent = `${usedMB}/${totalMB} MB`
            this.memoryElement.className = 'tm-perf-value'

            if (usedMB > this.options.memoryWarningThreshold) {
                this.memoryElement.classList.add('warning')
                this.addWarning({
                    type: 'high-memory',
                    message: `High memory: ${usedMB}MB`,
                    severity: 'warning',
                    timestamp: now
                })
            }
        }

        // Update renderer stats
        if (this.options.renderer) {
            const info = this.options.renderer.info
            this.drawCallsElement.textContent = info.render.calls.toString()
            this.trianglesElement.textContent = this.formatNumber(info.render.triangles)

            if (info.render.calls > 100) {
                this.drawCallsElement.className = 'tm-perf-value warning'
                this.addWarning({
                    type: 'excessive-drawcalls',
                    message: `Draw calls: ${info.render.calls}`,
                    severity: 'info',
                    timestamp: now
                })
            } else {
                this.drawCallsElement.className = 'tm-perf-value'
            }
        }

        // Update warnings display
        if (this.options.enableWarnings) {
            this.updateWarningsDisplay()
        }
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    private addWarning(warning: PerformanceWarning) {
        // Don't add duplicate warnings within 5 seconds
        const isDuplicate = this.warnings.some(w =>
            w.type === warning.type && (warning.timestamp - w.timestamp < 5000)
        )
        if (isDuplicate) return

        this.warnings.push(warning)
        if (this.warnings.length > this.maxWarnings) {
            this.warnings.shift()
        }
    }

    private updateWarningsDisplay() {
        if (!this.warningsContainer) return

        // Remove old warnings (older than 10 seconds)
        const now = performance.now()
        this.warnings = this.warnings.filter(w => now - w.timestamp < 10000)

        this.warningsContainer.innerHTML = ''
        this.warnings.forEach(warning => {
            const el = document.createElement('div')
            el.className = `tm-perf-warning ${warning.severity}`
            el.textContent = warning.message
            this.warningsContainer.appendChild(el)
        })
    }

    /**
     * Gets the current frames per second (FPS).
     * @returns {number} The current FPS.
     */
    getFPS(): number {
        return this.fps
    }

    /**
     * Gets the average FPS over the recent history period.
     * @returns {number} The average FPS.
     */
    getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 60
        return Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
    }

    /**
     * Returns a snapshot of all tracked performance metrics.
     * @returns {object} Current performance statistics.
     */
    getStats() {
        const stats: any = {
            fps: this.fps,
            averageFPS: this.getAverageFPS()
        }

        if (this.options.enableMemoryTracking && (performance as any).memory) {
            const memory = (performance as any).memory
            stats.memory = {
                used: Math.round(memory.usedJSHeapSize / 1048576),
                total: Math.round(memory.jsHeapSizeLimit / 1048576)
            }
        }

        if (this.options.renderer) {
            const info = this.options.renderer.info
            stats.drawCalls = info.render.calls
            stats.triangles = info.render.triangles
        }

        return stats
    }

    /**
     * Toggles the visibility of the performance stats overlay.
     */
    toggle() {
        this.isVisible = !this.isVisible
        this.container.style.display = this.isVisible ? 'block' : 'none'
    }

    /**
     * Shows the performance stats overlay.
     */
    show() {
        this.isVisible = true
        this.container.style.display = 'block'
    }

    /**
     * Hides the performance stats overlay.
     */
    hide() {
        this.isVisible = false
        this.container.style.display = 'none'
    }

    /**
     * Enables or disables performance statistics collection.
     * @param {boolean} enabled - Whether collection should be enabled.
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled
    }

    /**
     * Disposes of the performance monitor and removes its DOM elements.
     */
    dispose() {
        this.container.remove()
        this.enabled = false
    }
}

/**
 * Helper function to create performance monitor
 */
export function createPerformanceMonitor(options?: PerformanceStatsOptions): PerformanceStats {
    return new PerformanceStats(options)
}
