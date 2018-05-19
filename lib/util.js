const {PassThrough} = require('stream')

function arrayToStream(array) {
  const readable = new PassThrough({objectMode: true})
  array.forEach(item => readable.write(item))
  readable.end()
  return readable
}

function isFeatureCollection(obj) {
  return obj.type === 'FeatureCollection' && Array.isArray(obj.features)
}

function isFeatureArray(array) {
  return Array.isArray(array) && array.every(item => item.type === 'Feature')
}

module.exports = {arrayToStream, isFeatureCollection, isFeatureArray}
