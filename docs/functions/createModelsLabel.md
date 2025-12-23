[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / createModelsLabel

# Function: createModelsLabel()

> **createModelsLabel**(`camera`, `renderer`, `parentModel`, `modelLabelsMap`, `options?`): `LabelManager`

Defined in: [ui/modelsLabel.ts:47](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/ui/modelsLabel.ts#L47)

Create Model Labels (with connecting lines and pulsing dots) - Optimized

Features:
- Supports pause/resume
- Configurable update interval
- Fade in/out effects
- Cached bounding box calculation
- RAF management optimization

## Parameters

### camera

`Camera`

### renderer

`WebGLRenderer`

### parentModel

`Object3D`

### modelLabelsMap

`Record`\<`string`, `string`\>

### options?

`LabelOptions`

## Returns

`LabelManager`
