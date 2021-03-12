const DATE_REGEX = /^(\d{4})-(\d\d)-(\d\d)/

function detectSchema(properties) {
  const schema = []
  for (const key of Object.keys(properties)) {
    const value = properties[key]
    if (typeof value === 'string') {
      if (DATE_REGEX.test(value)) {
        schema.push({name: key, type: 'date'})
      } else {
        schema.push({name: key, type: 'character', length: Math.max(80, value.length)})
      }
    } else if (typeof value === 'number') {
      schema.push({name: key, type: 'number'})
    } else if (typeof value === 'boolean') {
      schema.push({name: key, type: 'boolean'})
    }
  }

  return schema
}

module.exports = detectSchema
