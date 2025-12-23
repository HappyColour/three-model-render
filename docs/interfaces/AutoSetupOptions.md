[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / AutoSetupOptions

# Interface: AutoSetupOptions

Defined in: [setup/autoSetup.ts:9](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L9)

## Properties

### directionalCount?

> `optional` **directionalCount**: `number`

Defined in: [setup/autoSetup.ts:19](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L19)

Number of DirectionalLights (evenly distributed around)

***

### elevation?

> `optional` **elevation**: `number`

Defined in: [setup/autoSetup.ts:13](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L13)

Camera elevation offset (radians), default slight top-down (0.2 rad ≈ 11°)

***

### enableShadows?

> `optional` **enableShadows**: `boolean`

Defined in: [setup/autoSetup.ts:15](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L15)

Whether to enable shadows - high performance cost, default false

***

### padding?

> `optional` **padding**: `number`

Defined in: [setup/autoSetup.ts:11](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L11)

Extra padding multiplier based on bounding sphere (>1 expands view range)

***

### renderer?

> `optional` **renderer**: `WebGLRenderer` \| `null`

Defined in: [setup/autoSetup.ts:23](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L23)

If renderer is passed, the tool will automatically enable renderer.shadowMap (if enableShadows is true)

***

### setMeshShadowProps?

> `optional` **setMeshShadowProps**: `boolean`

Defined in: [setup/autoSetup.ts:21](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L21)

Whether to automatically set mesh.castShadow / mesh.receiveShadow to true (default true)

***

### shadowMapSize?

> `optional` **shadowMapSize**: `number`

Defined in: [setup/autoSetup.ts:17](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/setup/autoSetup.ts#L17)

Shadow map size, higher is clearer but more expensive, default 1024
