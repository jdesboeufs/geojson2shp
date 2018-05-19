const test = require('ava')
const {isFeatureCollection, isFeatureArray} = require('../lib/util')

test('isFeatureCollection() => true', t => {
  t.true(isFeatureCollection({type: 'FeatureCollection', features: []}))
})

test('isFeatureCollection() => false', t => {
  t.false(isFeatureCollection({features: []}))
  t.false(isFeatureCollection({type: 'FeatureCollection'}))
  t.false(isFeatureCollection({}))
  t.false(isFeatureCollection([]))
  t.false(isFeatureCollection({type: 'Feature'}))
})

test('isFeatureArray() => true', t => {
  t.true(isFeatureArray([]))
  t.true(isFeatureArray([{type: 'Feature'}]))
})

test('isFeatureArray() => false', t => {
  t.false(isFeatureArray([{type: 'Feature'}, {foo: 'bar'}]))
  t.false(isFeatureArray([{foo: 'bar'}]))
  t.false(isFeatureArray({features: []}))
  t.false(isFeatureArray({}))
  t.false(isFeatureArray({type: 'FeatureCollection', features: []}))
})
