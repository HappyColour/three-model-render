[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / addChildModelLabels

# Function: addChildModelLabels()

> **addChildModelLabels**(`camera`, `renderer`, `parentModel`, `modelLabelsMap`, `options?`): `LabelManager`

Defined in: [core/labelManager.ts:47](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/core/labelManager.ts#L47)

Add overhead labels to child models (supports Mesh and Group)

Features:
- Caches bounding boxes to avoid repetitive calculation every frame
- Supports pause/resume
- Configurable update interval to reduce CPU usage
- Automatically pauses when hidden

## Parameters

### camera

`Camera`

THREE.Camera - Scene camera

### renderer

`WebGLRenderer`

THREE.WebGLRenderer - Renderer, used for screen size

### parentModel

`Object3D`

THREE.Object3D - FBX root node or Group

### modelLabelsMap

`Record`\<`string`, `string`\>

Record<string,string> - Map of model name to label text

### options?

`LabelOptions`

LabelOptions - Optional label style configuration

## Returns

`LabelManager`

LabelManager - Management interface containing pause/resume/dispose
