const {promisify} = require('util')
const {createReadStream, createWriteStream} = require('fs')
const isStream = require('is-stream')
const {createGunzip} = require('gunzip-stream')
const {parse} = require('geojson-stream')
const pump = promisify(require('pump'))
const {createConvertStream} = require('./stream')

function createInputStream(input) {
  if (typeof input === 'string') {
    return createReadStream(input)
  }
  if (isStream(input)) {
    return input
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
    createGunzip(),
    parse(),
    createConvertStream(options),
    createOutputStream(output)
  )
}

module.exports = {convert}
