#!/usr/bin/env node
'use strict'
const http = require('http');
const yargs = require('yargs/yargs');
const path = require('path');
const chalk = require('chalk');
const express = require('express');
const open = require('open');
const { hideBin } = require('yargs/helpers');
const { getDirectoryDetails, errorLogPath } = require('../index.js');
const homeDir = require('os').homedir()

function toReadableFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let currNum = bytes
  let i = 0
  while (currNum >= 1024) {
    currNum /= 1024
    i++
  }
  // dividing by 1 makes the JS runtime cut off trailing zeros after decimal
  return currNum.toFixed(2) / 1 + ' ' + units[i]
}

function createHttpServer() {
  const app = express();

  app.get('/', async function(req,res){
    const pathProvided = req.query.path
    if (pathProvided) {
      let pathPrefix = pathProvided.replace('~', homeDir)
      pathPrefix = path.join(pathPrefix, '/')
      let erroredPaths = []
      const dir = await getDirectoryDetails(pathPrefix, erroredPaths)
      if (!dir) {
        res.status(404)
        res.end()
        return
      }
      if (erroredPaths.length > 0) {
        dir.erroredPaths = erroredPaths
        dir.logFile = errorLogPath
      }
      res.json(dir)
    }
    else {
      res.sendFile(path.join(__dirname, '../index.html'));
    }
  });

  const server = app.listen(8001, () => {
    console.log('listening on localhost:8001')
  })
  return server
}

const options = yargs(hideBin(process.argv))
  .usage('Usage:\n  $0 [OPTION]... [DIRECTORY]...')
  .option('ui', {
    alias: 'u',
    describe: 'Open the UI for the app',
    type: 'boolean'
  })
  .argv;

const inputs = options['_'];
const pathProvided = inputs[0] || './';
if (inputs.length > 1) {
  console.log(chalk.red('Only 1 path can be specified. `joshls --help` for details.'))
  return
}

(async () => {
  if (options.ui) {
    // create express server
    createHttpServer()
    // module that opens users default browser to a URL
    open('http://localhost:8001')
  }
  else {
    const pathPrefix = path.join(path.resolve(pathProvided), '/')
    const dir = await getDirectoryDetails(pathPrefix)
    if (!dir) {
      console.log(chalk.red('Input must be a valid directory'))
      return
    }
    console.log(chalk.underline(`Stats about ${pathPrefix}:\n`))
    console.log(`${dir.totalFiles} Total Files | ${toReadableFileSize(dir.totalSize)} Total`)
    const formattedData = dir.entries.map(entry => ({
        "Name": entry.name,
        "Dir": entry.isDir,
        "Size": toReadableFileSize(entry.size),
        "Date Modified": entry.dateModified.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        }),
        "Number of Files": entry.numFiles
      })
    )
    console.table(formattedData)
  }
})()