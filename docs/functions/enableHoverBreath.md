[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / enableHoverBreath

# Function: enableHoverBreath()

> **enableHoverBreath**(`opts`): `object`

Defined in: [core/hoverEffect.ts:37](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/core/hoverEffect.ts#L37)

Create a singleton highlighter - Recommended to create once on mount
Returns { updateHighlightNames, dispose, getHoveredName } interface

Features:
- Automatically pauses animation when no object is hovered
- Throttles mousemove events to avoid excessive calculation
- Uses passive event listeners to improve scrolling performance

## Parameters

### opts

[`HoverBreathOptions`](../type-aliases/HoverBreathOptions.md)

## Returns

`object`

### dispose()

> **dispose**: () => `void`

#### Returns

`void`

### getHoveredName()

> **getHoveredName**: () => `string` \| `null`

#### Returns

`string` \| `null`

### refreshSelection()

> **refreshSelection**: () => `void`

#### Returns

`void`

### updateHighlightNames()

> **updateHighlightNames**: (`names`) => `void` = `setHighlightNames`

#### Parameters

##### names

`string`[] | `null`

#### Returns

`void`
