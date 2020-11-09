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

function createHttpServer() {
  const app = express();
  app.get('/', async function(req,res){
    const pathProvided = req.query.path
    if (pathProvided) {
      let pathPrefix = pathProvided.replace('~', homeDir)
      pathPrefix = path.join(pathPrefix, '/')
      const dir = await getDirectoryDetails(pathPrefix)
      res.json(dir)
    }
    else {
      res.sendFile(path.join(__dirname, '../index.html'));
    }
  });
  app.get('/common.js', function(req,res) {
    res.sendFile(path.join(__dirname, '../common.js'));
  })
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
    const pathPrefix = path.join(pathProvided, '/')
    const dir = await getDirectoryDetails(pathPrefix)
    console.log(chalk.underline(`Stats about ${pathPrefix}:\n`))
    console.log(`${dir.totalFiles} Total Files | ${dir.totalSize} Bytes Total`)
    console.table(dir.entries)
  }
})()