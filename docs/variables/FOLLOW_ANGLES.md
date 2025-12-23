[**three-model-render API Documentation v1.0.4**](../README.md)

***

[three-model-render API Documentation](../globals.md) / FOLLOW\_ANGLES

# Variable: FOLLOW\_ANGLES

> `const` **FOLLOW\_ANGLES**: `object`

Defined in: [camera/followModels.ts:33](https://github.com/HappyColour/three-model-render/blob/3d55e30ddf4f15705491954c8741928f3001232a/src/camera/followModels.ts#L33)

Recommended camera angles for quick selection of common views

## Type Declaration

### BACK

> `readonly` **BACK**: `object`

Back view

#### BACK.azimuth

> `readonly` **azimuth**: `number` = `Math.PI`

#### BACK.elevation

> `readonly` **elevation**: `0` = `0`

### FRONT

> `readonly` **FRONT**: `object`

Front view - suitable for frontal display, UI alignment

#### FRONT.azimuth

> `readonly` **azimuth**: `0` = `0`

#### FRONT.elevation

> `readonly` **elevation**: `0` = `0`

### HIGH\_ANGLE

> `readonly` **HIGH\_ANGLE**: `object`

High angle view - suitable for bird's eye view, panoramic browsing

#### HIGH\_ANGLE.azimuth

> `readonly` **azimuth**: `number`

#### HIGH\_ANGLE.elevation

> `readonly` **elevation**: `number`

### ISOMETRIC

> `readonly` **ISOMETRIC**: `object`

Isometric view (default) - suitable for architecture, mechanical equipment

#### ISOMETRIC.azimuth

> `readonly` **azimuth**: `number`

#### ISOMETRIC.elevation

> `readonly` **elevation**: `number`

### LEFT

> `readonly` **LEFT**: `object`

Left view

#### LEFT.azimuth

> `readonly` **azimuth**: `number`

#### LEFT.elevation

> `readonly` **elevation**: `0` = `0`

### LOW\_ANGLE

> `readonly` **LOW\_ANGLE**: `object`

Low angle view - suitable for vehicles, characters near the ground

#### LOW\_ANGLE.azimuth

> `readonly` **azimuth**: `number`

#### LOW\_ANGLE.elevation

> `readonly` **elevation**: `number`

### RIGHT

> `readonly` **RIGHT**: `object`

Right view - suitable for mechanical sections, side inspection

#### RIGHT.azimuth

> `readonly` **azimuth**: `number`

#### RIGHT.elevation

> `readonly` **elevation**: `0` = `0`

### TOP

> `readonly` **TOP**: `object`

Top view - suitable for maps, layout display

#### TOP.azimuth

> `readonly` **azimuth**: `0` = `0`

#### TOP.elevation

> `readonly` **elevation**: `number`
