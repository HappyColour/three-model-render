[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / ResourceManager

# Class: ResourceManager

Defined in: core/resourceManager.ts:7

ResourceManager
Handles tracking and disposal of Three.js objects to prevent memory leaks.

## Constructors

### Constructor

> **new ResourceManager**(): `ResourceManager`

#### Returns

`ResourceManager`

## Methods

### dispose()

> **dispose**(): `void`

Defined in: core/resourceManager.ts:50

Dispose all tracked resources

#### Returns

`void`

***

### track()

> **track**(`object`): `Object3D`

Defined in: core/resourceManager.ts:16

Track an object and its resources recursively

#### Parameters

##### object

`Object3D`

#### Returns

`Object3D`
