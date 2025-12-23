[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / LiquidFillerGroup

# Class: LiquidFillerGroup

Defined in: [interaction/liquidFiller.ts:41](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L41)

LiquidFillerGroup - Optimized
Supports single or multi-model liquid level animation with independent color control.

Features:
- Uses renderer.domElement instead of window events
- Uses AbortController to manage event lifecycle
- Adds error handling and boundary checks
- Optimized animation management to prevent memory leaks
- Comprehensive resource disposal logic

## Constructors

### Constructor

> **new LiquidFillerGroup**(`models`, `scene`, `camera`, `renderer`, `defaultOptions?`, `clickThreshold?`): `LiquidFillerGroup`

Defined in: [interaction/liquidFiller.ts:60](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L60)

Constructor

#### Parameters

##### models

Single or multiple THREE.Object3D

`Object3D`\<`Object3DEventMap`\> | `Object3D`\<`Object3DEventMap`\>[]

##### scene

`Scene`

Scene

##### camera

`Camera`

Camera

##### renderer

`WebGLRenderer`

Renderer

##### defaultOptions?

[`LiquidFillerOptions`](../interfaces/LiquidFillerOptions.md)

Default liquid options

##### clickThreshold?

`number` = `10`

Click threshold in pixels

#### Returns

`LiquidFillerGroup`

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [interaction/liquidFiller.ts:314](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L314)

Dispose method, release events and resources

#### Returns

`void`

***

### fillTo()

> **fillTo**(`models`, `percent`): `void`

Defined in: [interaction/liquidFiller.ts:205](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L205)

Set liquid level

#### Parameters

##### models

Single model or array of models

`Object3D`\<`Object3DEventMap`\> | `Object3D`\<`Object3DEventMap`\>[]

##### percent

`number`

Liquid level percentage 0~1

#### Returns

`void`

***

### fillToAll()

> **fillToAll**(`percentList`): `void`

Defined in: [interaction/liquidFiller.ts:261](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L261)

Set multiple model levels, percentList corresponds to items order

#### Parameters

##### percentList

`number`[]

#### Returns

`void`

***

### restore()

> **restore**(`model`): `void`

Defined in: [interaction/liquidFiller.ts:276](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L276)

Restore single model original material and remove liquid

#### Parameters

##### model

`Object3D`

#### Returns

`void`

***

### restoreAll()

> **restoreAll**(): `void`

Defined in: [interaction/liquidFiller.ts:309](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/interaction/liquidFiller.ts#L309)

Restore all models

#### Returns

`void`
