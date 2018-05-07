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

```js
const fs = require('fs')
const convert = require('geojson2shp')


myGeoJSONStream
  .pipe(convert({
    targetCrs: 2154,
    layer: 'my-layer'
  }))
  .pipe(fs.writeWriteStream('/path/to/my-shapefile.zip'))
```

## License

MIT
