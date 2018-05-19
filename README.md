# geojson2shp
Convert GeoJSON into Shapefile in pure JavaScript

⚠️ Early version ⚠️

## Prerequisites

* [Node.js](https://nodejs.org/en/download/package-manager/) 8.0+

## Usage (CLI)

### With global installation

```bash
# Installation
npm install geojson2shp -g

# Conversion
cat my.geojson | geojson2shp > my-shp.zip
```

### With npx (included in Node.js installation)

```bash
# Conversion
cat my.geojson | npx geojson2shp > my-shp.zip
```

## Usage (Node.js)

### Basic

```js
const {convert} = require('geojson2shp')

const options = {
  layer: 'my-layer',
  targetCrs: 2154
}

// Paths
await convert('/path/to/source.geojson', '/path/to/dest-shp.zip', options)

// Streams
await convert(inputGeoJSONStream, outputZippedShapefileStream, options)

// FeatureCollection as input
const featureCollection = {type: 'FeatureCollection', features: [/* */]}
await convert(featureCollection, '/path/to/dest-shp.zip', options)

// Features as input
const features = [
  {type: 'Feature', geometry: {/* */}, properties: {}},
  {type: 'Feature', geometry: {/* */}, properties: {}}
]
await convert(features, '/path/to/dest-shp.zip', options)

// Or mix them ;)
```

### Custom stream

```js
const fs = require('fs')
const {createConvertStream} = require('geojson2shp')


myGeoJSONStream
  .pipe(createConvertStream({
    targetCrs: 2154,
    layer: 'my-layer'
  }))
  .pipe(fs.writeWriteStream('/path/to/my-shapefile.zip'))
```

## License

MIT
