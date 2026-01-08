[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / ExplodeOptions

# Type Alias: ExplodeOptions

> **ExplodeOptions** = `object`

Defined in: [effect/exploder.ts:35](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L35)

Explosion Parameters

## Param

Explosion arrangement mode: 'ring' | 'spiral' | 'grid' | 'radial'

## Param

Spacing between adjacent exploded objects (default: 2.5)

## Param

Animation duration in ms (default: 1000)

## Param

Lift factor for exploded objects (default: 0.6)

## Param

Extra safety distance for camera framing (default: 1.2)

## Param

Whether to automatically restore the previous model's explosion when switching models (default: true)

## Param

Configuration for dimming non-exploded objects

## Param

Enable debug logs (default: false)

## Properties

### autoRestorePrev?

> `optional` **autoRestorePrev**: `boolean`

Defined in: [effect/exploder.ts:41](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L41)

***

### cameraPadding?

> `optional` **cameraPadding**: `number`

Defined in: [effect/exploder.ts:40](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L40)

***

### debug?

> `optional` **debug**: `boolean`

Defined in: [effect/exploder.ts:43](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L43)

***

### dimOthers?

> `optional` **dimOthers**: `object`

Defined in: [effect/exploder.ts:42](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L42)

#### enabled

> **enabled**: `boolean`

#### opacity?

> `optional` **opacity**: `number`

***

### duration?

> `optional` **duration**: `number`

Defined in: [effect/exploder.ts:38](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L38)

***

### lift?

> `optional` **lift**: `number`

Defined in: [effect/exploder.ts:39](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L39)

***

### mode?

> `optional` **mode**: `ArrangeMode`

Defined in: [effect/exploder.ts:36](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L36)

***

### spacing?

> `optional` **spacing**: `number`

Defined in: [effect/exploder.ts:37](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/effect/exploder.ts#L37)
