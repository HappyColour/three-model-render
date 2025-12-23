[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / GroupExploder

# Class: GroupExploder

Defined in: [effect/exploder.ts:61](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L61)

## Constructors

### Constructor

> **new GroupExploder**(`scene`, `camera`, `controls?`): `GroupExploder`

Defined in: [effect/exploder.ts:93](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L93)

Constructor

#### Parameters

##### scene

`Scene`

Three.js Scene instance

##### camera

Three.js Camera (usually PerspectiveCamera)

`Camera` | `PerspectiveCamera`

##### controls?

OrbitControls instance (must be bound to camera)

###### target?

`Vector3`

###### update?

() => `void`

#### Returns

`GroupExploder`

## Properties

### onLog()?

> `optional` **onLog**: (`s`) => `void`

Defined in: [effect/exploder.ts:85](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L85)

#### Parameters

##### s

`string`

#### Returns

`void`

## Methods

### dispose()

> **dispose**(): `void`

Defined in: [effect/exploder.ts:805](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L805)

Dispose: remove listener, cancel animation, clear references

#### Returns

`void`

***

### explode()

> **explode**(`opts?`): `Promise`\<`void`\>

Defined in: [effect/exploder.ts:245](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L245)

explode: compute targets first, compute targetBound using targets + mesh radii,
animate camera to that targetBound, then animate meshes to targets.

#### Parameters

##### opts?

[`ExplodeOptions`](../type-aliases/ExplodeOptions.md)

#### Returns

`Promise`\<`void`\>

***

### init()

> **init**(): `void`

Defined in: [effect/exploder.ts:104](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L104)

#### Returns

`void`

***

### restore()

> **restore**(`duration`): `Promise`\<`void`\>

Defined in: [effect/exploder.ts:344](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L344)

Restore all exploded meshes to their original transform:
- Supports smooth animation
- Automatically cancels transparency

#### Parameters

##### duration

`number` = `400`

#### Returns

`Promise`\<`void`\>

***

### setMeshes()

> **setMeshes**(`newSet`, `options?`): `Promise`\<`void`\>

Defined in: [effect/exploder.ts:118](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L118)

Set the current set of meshes for explosion.
- Detects content-level changes even if same Set reference is used.
- Preserves prevSet/stateMap to allow async restore when needed.
- Ensures stateMap contains snapshots for *all meshes in the new set*.

#### Parameters

##### newSet

The new set of meshes

`Set`\<`Mesh`\<`BufferGeometry`\<`NormalBufferAttributes`\>, `Material` \| `Material`[], `Object3DEventMap`\>\> | `null`

##### options?

###### autoRestorePrev?

`boolean`

###### restoreDuration?

`number`

#### Returns

`Promise`\<`void`\>
