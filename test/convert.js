const {join} = require('path')
const test = require('ava')
const devnull = require('dev-null')
const {convert} = require('..')

const ptNullIsland = {type: 'Point', coordinates: [0, 0]}
const featureNullIsland = {type: 'Feature', properties: {id: 1}, geometry: ptNullIsland}

test('convert: regular FeatureCollection', async t => {
  await convert([featureNullIsland], devnull())
  t.pass()
})

test('convert: empty FeatureCollection', async t => {
  await convert([], devnull())
  t.pass()
})

test('convert: file as input', async t => {
  await convert(join(__dirname, 'fixtures', 'simple.geojson'), devnull())
  t.pass()
})
