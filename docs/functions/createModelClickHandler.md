[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / createModelClickHandler

# Function: createModelClickHandler()

> **createModelClickHandler**(`camera`, `scene`, `renderer`, `outlinePass`, `onClick`, `options`): () => `void`

Defined in: [interaction/clickHandler.ts:48](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/clickHandler.ts#L48)

Create Model Click Highlight Tool (OutlinePass Version) - Optimized

Features:
- Uses AbortController to unify event lifecycle management
- Supports debounce to avoid frequent triggering
- Customizable Raycaster parameters
- Dynamically adjusts outline thickness based on camera distance

## Parameters

### camera

`Camera`

Camera

### scene

`Scene`

Scene

### renderer

`WebGLRenderer`

Renderer

### outlinePass

`OutlinePass`

Initialized OutlinePass

### onClick

(`object`, `info?`) => `void`

Click callback

### options

[`ClickHandlerOptions`](../interfaces/ClickHandlerOptions.md) = `{}`

Optional configuration

## Returns

Dispose function, used to clean up events and resources

> (): `void`

### Returns

`void`
