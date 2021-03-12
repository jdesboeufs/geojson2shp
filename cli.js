#!/usr/bin/env node
const {convert} = require('.')

convert(process.stdin, process.stdout).catch(error => {
  console.error(error)
  process.exit(1)
})
