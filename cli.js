#!/usr/bin/env node
const {createGunzip} = require('gunzip-stream')
const {parse} = require('geojson-stream')
const pump = require('pump')
const {convert} = require('.')

pump(
  process.stdin,
  createGunzip(),
  parse(),
  convert(),
  process.stdout,
  err => {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.error('Completed')
    }
  }
)
