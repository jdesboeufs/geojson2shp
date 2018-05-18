#!/usr/bin/env node
const {convert} = require('.')

convert(process.stdin, process.stdout).catch(err => {
  console.error(err)
  process.exit(1)
})
