[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / loadEquirectSkybox

# Function: loadEquirectSkybox()

> **loadEquirectSkybox**(`renderer`, `scene`, `url`, `opts`): `Promise`\<[`SkyboxHandle`](../type-aliases/SkyboxHandle.md)\>

Defined in: [loader/skyboxLoader.ts:173](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/loader/skyboxLoader.ts#L173)

Load Equirectangular/Single Image (Supports HDR via RGBELoader)

## Parameters

### renderer

`WebGLRenderer`

THREE.WebGLRenderer

### scene

`Scene`

THREE.Scene

### url

`string`

string - *.hdr, *.exr, *.jpg, *.png

### opts

[`SkyboxOptions`](../interfaces/SkyboxOptions.md) = `{}`

SkyboxOptions

## Returns

`Promise`\<[`SkyboxHandle`](../type-aliases/SkyboxHandle.md)\>
