[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / setView

# Function: setView()

> **setView**(`camera`, `controls`, `targetObj`, `position`, `options`): `Promise`\<`void`\>

Defined in: [camera/setView.ts:47](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/camera/setView.ts#L47)

Smoothly switches the camera to the optimal angle for the model.

Features:
- Reuses followModels logic to avoid code duplication
- Supports more angles
- Enhanced configuration options
- Returns Promise to support chaining
- Supports animation cancellation

## Parameters

### camera

`PerspectiveCamera`

THREE.PerspectiveCamera instance

### controls

`OrbitControls`

OrbitControls instance

### targetObj

`Object3D`

THREE.Object3D model object

### position

[`ViewPosition`](../type-aliases/ViewPosition.md) = `'front'`

View position

### options

[`SetViewOptions`](../interfaces/SetViewOptions.md) = `{}`

Configuration options

## Returns

`Promise`\<`void`\>

Promise<void>
