const {unlink, createWriteStream, createReadStream} = require('fs')
const {tmpdir} = require('os')
const {join} = require('path')
const {PassThrough, Duplex} = require('stream')
const {ZipFile} = require('yazl')
const {reproject} = require('reproject')
const createRawShpWriteStream = require('./shp-write-stream')
const detectSchema = require('./detect-schema')

function readProjectionNumber(userParam, defaultValue) {
  if (!userParam) {
    return defaultValue
  }
  if (!Number.isInteger(userParam)) {
    throw new TypeError('ProjectionNumber must be an integer')
  }
  return userParam
}

function createConvertStream(options = {}) {
  const tmpDir = options.tmpDir || process.env.TMP_DIR || tmpdir()
  const id = randomizer()
  const tmpFilesPrefix = join(tmpDir, id)
  const context = {}
  const layerName = options.layer || 'features'

  const zipFile = new ZipFile()
  const zipStream = zipFile.outputStream

  let _reproject
  let _schema = options.schema
  let internalShpWriteStream

  const sourceCrs = readProjectionNumber(options.sourceCrs, 4326)
  const targetCrs = readProjectionNumber(options.targetCrs, sourceCrs)

  if (sourceCrs !== targetCrs) {
    const from = require(`epsg-index/s/${sourceCrs}.json`).proj4
    const to = require(`epsg-index/s/${targetCrs}.json`).proj4
    _reproject = f => reproject(f, from, to)
  }

  const prjFileContent = Buffer.from(require(`epsg-index/s/${targetCrs}.json`).wkt)

  function createInternalShpWriteStream() {
    return createRawShpWriteStream(
      // Schema
      {
        point: _schema,
        multipoint: _schema,
        line: _schema,
        polygon: _schema
      },
      // MakeStream
      (shpType, extension) => {
        const tmpFilePath = `${tmpFilesPrefix}-${shpType}.${extension}`
        context[`${shpType}-${extension}`] = {shpType, extension, tmpFilePath}
        return createWriteStream(tmpFilePath)
      },
      // End of processing
      (err, headers) => {
        if (err) {
          console.error('Conversion failed')
          console.error(err)
          cleanTmpFiles(context)
        } else {
          addHeadersToContext(headers, context)
          const shpTypes = Object.keys(headers)
          const writeShpType = shpTypes.length > 1

          // Add files to archive
          Object.values(context).forEach(({shpType, extension, tmpFilePath, header}) => {
            if (extension === 'shp') {
              zipFile.addBuffer(prjFileContent, getFileName(layerName, shpType, 'prj', writeShpType))
            }
            const stream = new PassThrough()
            zipFile.addReadStream(stream, getFileName(layerName, shpType, extension, writeShpType))
            stream.write(header)
            const content = createReadStream(tmpFilePath)
            content.pipe(stream)
            content.on('close', () => cleanTmpFile(tmpFilePath)) // TODO Improve error management
          })

          zipFile.end()
        }
      }
    )
  }

  const duplex = new Duplex({
    writableObjectMode: true,
    write(feature, enc, cb) {
      if (!_schema) {
        _schema = detectSchema(feature.properties)
      }
      if (!internalShpWriteStream) {
        internalShpWriteStream = createInternalShpWriteStream()
      }
      internalShpWriteStream.write(_reproject ? _reproject(feature) : feature, cb)
    },
    final(cb) {
      if (internalShpWriteStream) {
        internalShpWriteStream.end(cb)
      } else {
        zipFile.end()
        cb()
      }
    },
    read() {
      return zipStream.read()
    }
  })

  zipStream.on('readable', () => {
    let hasMoreData = true
    while (hasMoreData) {
      const chunk = zipStream.read()
      if (chunk) {
        duplex.push(chunk)
      } else {
        hasMoreData = false
      }
    }
  })

  zipStream.on('end', () => {
    duplex.push(null)
  })

  return duplex
}

function getFileName(layerName, shpType, extension, writeShpType = true) {
  if (writeShpType) {
    return `${layerName}.${shpType}.${extension}`
  }
  return `${layerName}.${extension}`
}

function randomizer() {
  return Math.random().toString(36).substring(2, 15)
}

function addHeadersToContext(headers, context) {
  Object.keys(headers).forEach(shpType => {
    Object.keys(headers[shpType]).forEach(extension => {
      context[`${shpType}-${extension}`].header = headers[shpType][extension]
    })
  })
}

function cleanTmpFile(path) {
  unlink(path, err => {
    if (err) {
      console.error(`Unable to delete temporary file: ${path}`)
      console.error(err)
    }
  })
}

function cleanTmpFiles(context) {
  Object.values(context).forEach(({tmpFilePath}) => cleanTmpFile(tmpFilePath))
}

module.exports = {createConvertStream}
