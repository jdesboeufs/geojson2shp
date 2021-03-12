const {PassThrough} = require('stream')

function arrayToStream(array) {
  const readable = new PassThrough({objectMode: true})
  for (const item of array) {
    readable.write(item)
  }

  readable.end()
  return readable
}

function isFeatureCollection(object) {
  return object.type === 'FeatureCollection' && Array.isArray(object.features)
}

function isFeatureArray(array) {
  return Array.isArray(array) && array.every(item => item.type === 'Feature')
}

module.exports = {arrayToStream, isFeatureCollection, isFeatureArray}
