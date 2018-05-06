const test = require('ava')
const detectSchema = require('../lib/detect-schema')

test('detect simple schema', t => {
  const properties = {
    id: '31555801AB0409',
    commune: '31555',
    prefixe: '801',
    section: 'AB',
    numero: '409',
    contenance: 18669,
    created: '2015-06-11',
    updated: '2015-10-06'
  }
  t.deepEqual(detectSchema(properties), [
    {name: 'id', type: 'character', length: 80},
    {name: 'commune', type: 'character', length: 80},
    {name: 'prefixe', type: 'character', length: 80},
    {name: 'section', type: 'character', length: 80},
    {name: 'numero', type: 'character', length: 80},
    {name: 'contenance', type: 'number'},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'}
  ])
})
