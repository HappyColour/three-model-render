[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / followModels

# Function: followModels()

> **followModels**(`camera`, `targets`, `options`): `Promise`\<`void`\>

Defined in: [camera/followModels.ts:73](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/camera/followModels.ts#L73)

Automatically moves the camera to a diagonal position relative to the target,
ensuring the target is within the field of view (smooth transition).

Features:
- Supports multiple easing functions
- Adds progress callback
- Supports animation cancellation
- Uses WeakMap to track and prevent memory leaks
- Robust error handling

## Parameters

### camera

`Camera`

### targets

`Object3D`\<`Object3DEventMap`\> | `Object3D`\<`Object3DEventMap`\>[] | `null` | `undefined`

### options

[`FollowOptions`](../interfaces/FollowOptions.md) = `{}`

## Returns

`Promise`\<`void`\>
