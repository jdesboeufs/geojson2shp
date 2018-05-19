const {promisify} = require('util')
const {createReadStream, createWriteStream} = require('fs')
const isStream = require('is-stream')
const {createGunzip} = require('gunzip-stream')
const {parse} = require('geojson-stream')
const pump = promisify(require('pump'))
const pumpify = require('pumpify')
const {createConvertStream} = require('./stream')
const {isFeatureCollection, isFeatureArray, arrayToStream} = require('./util')

function createInputStream(input) {
  if (typeof input === 'string') {
    return pumpify.obj(
      createReadStream(input),
      createGunzip(),
      parse()
    )
  }
  if (isStream(input)) {
    return pumpify.obj(
      input,
      createGunzip(),
      parse()
    )
  }
  if (isFeatureCollection(input)) {
    return arrayToStream(input.features)
  }
  if (isFeatureArray(input)) {
    return arrayToStream(input)
  }
  throw new Error('input type not supported')
}

function createOutputStream(output) {
  if (typeof output === 'string') {
    return createWriteStream(output)
  }
  if (isStream(output)) {
    return output
  }
  throw new Error('output type not supported')
}

function convert(input, output, options) {
  return pump(
    createInputStream(input),
    createConvertStream(options),
    createOutputStream(output)
  )
}

module.exports = {convert}
