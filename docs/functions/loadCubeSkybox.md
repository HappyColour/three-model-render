[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / loadCubeSkybox

# Function: loadCubeSkybox()

> **loadCubeSkybox**(`renderer`, `scene`, `paths`, `opts`): `Promise`\<[`SkyboxHandle`](../type-aliases/SkyboxHandle.md)\>

Defined in: [loader/skyboxLoader.ts:71](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/loader/skyboxLoader.ts#L71)

Load Cube Texture (6 images)

## Parameters

### renderer

`WebGLRenderer`

THREE.WebGLRenderer - Used for PMREM generating environment map

### scene

`Scene`

THREE.Scene

### paths

`string`[]

string[] 6 image paths, order: [px, nx, py, ny, pz, nz]

### opts

[`SkyboxOptions`](../interfaces/SkyboxOptions.md) = `{}`

SkyboxOptions

## Returns

`Promise`\<[`SkyboxHandle`](../type-aliases/SkyboxHandle.md)\>
