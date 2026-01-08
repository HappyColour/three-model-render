[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / ArrowGuide

# Class: ArrowGuide

Defined in: [interaction/arrowGuide.ts:27](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L27)

ArrowGuide - Optimized Version
Arrow guide effect tool, supports highlighting models and fading other objects.

Features:
- Uses WeakMap for automatic material recycling, preventing memory leaks
- Uses AbortController to manage event lifecycle
- Adds material reuse mechanism to reuse materials
- Improved dispose logic ensuring complete resource release
- Adds error handling and boundary checks

## Constructors

### Constructor

> **new ArrowGuide**(`renderer`, `camera`, `scene`, `options?`): `ArrowGuide`

Defined in: [interaction/arrowGuide.ts:50](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L50)

#### Parameters

##### renderer

`WebGLRenderer`

##### camera

`Camera`

##### scene

`Scene`

##### options?

###### clickThreshold?

`number`

###### fadeBrightness?

`number`

###### fadeOpacity?

`number`

###### ignoreRaycastNames?

`string`[]

#### Returns

`ArrowGuide`

## Methods

### animate()

> **animate**(): `void`

Defined in: [interaction/arrowGuide.ts:231](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L231)

Animation update (called every frame)

#### Returns

`void`

***

### dispose()

> **dispose**(): `void`

Defined in: [interaction/arrowGuide.ts:283](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L283)

Dispose all resources

#### Returns

`void`

***

### highlight()

> **highlight**(`models`): `void`

Defined in: [interaction/arrowGuide.ts:128](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L128)

Highlight specified models

#### Parameters

##### models

`Object3D`\<`Object3DEventMap`\>[]

#### Returns

`void`

***

### restore()

> **restore**(): `void`

Defined in: [interaction/arrowGuide.ts:183](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L183)

#### Returns

`void`

***

### setArrowMesh()

> **setArrowMesh**(`mesh`): `void`

Defined in: [interaction/arrowGuide.ts:107](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/arrowGuide.ts#L107)

Set Arrow Mesh

#### Parameters

##### mesh

`Mesh`

#### Returns

`void`
