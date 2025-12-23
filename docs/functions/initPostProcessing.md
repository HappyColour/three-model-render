[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / initPostProcessing

# Function: initPostProcessing()

> **initPostProcessing**(`renderer`, `scene`, `camera`, `options`): [`PostProcessingManager`](../interfaces/PostProcessingManager.md)

Defined in: [core/postProcessing.ts:55](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/core/postProcessing.ts#L55)

Initialize outline-related information (contains OutlinePass)

Capabilities:
- Supports automatic update on window resize
- Configurable resolution scale for performance improvement
- Comprehensive resource disposal management

## Parameters

### renderer

`WebGLRenderer`

THREE.WebGLRenderer

### scene

`Scene`

THREE.Scene

### camera

`Camera`

THREE.Camera

### options

[`PostProcessingOptions`](../interfaces/PostProcessingOptions.md) = `{}`

PostProcessingOptions - Optional configuration

## Returns

[`PostProcessingManager`](../interfaces/PostProcessingManager.md)

PostProcessingManager - Management interface containing composer/outlinePass/resize/dispose
