[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / ViewPresets

# Variable: ViewPresets

> `const` **ViewPresets**: `object`

Defined in: [camera/setView.ts:118](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/camera/setView.ts#L118)

Preset view shortcut methods

## Type Declaration

### front()

> **front**: (`camera`, `controls`, `target`, `options?`) => `Promise`\<`void`\>

Front View

#### Parameters

##### camera

`PerspectiveCamera`

##### controls

`OrbitControls`

##### target

`Object3D`

##### options?

[`SetViewOptions`](../interfaces/SetViewOptions.md)

#### Returns

`Promise`\<`void`\>

### isometric()

> **isometric**: (`camera`, `controls`, `target`, `options?`) => `Promise`\<`void`\>

Isometric View

#### Parameters

##### camera

`PerspectiveCamera`

##### controls

`OrbitControls`

##### target

`Object3D`

##### options?

[`SetViewOptions`](../interfaces/SetViewOptions.md)

#### Returns

`Promise`\<`void`\>

### top()

> **top**: (`camera`, `controls`, `target`, `options?`) => `Promise`\<`void`\>

Top View

#### Parameters

##### camera

`PerspectiveCamera`

##### controls

`OrbitControls`

##### target

`Object3D`

##### options?

[`SetViewOptions`](../interfaces/SetViewOptions.md)

#### Returns

`Promise`\<`void`\>
