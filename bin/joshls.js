#!/usr/bin/env node
'use strict'
const fs = require('fs');
const http = require('http');
const yargs = require('yargs/yargs');
const path = require('path');
const chalk = require('chalk');
const express = require('express');
const npm = require('npm');
const open = require('open');
const { hideBin } = require('yargs/helpers');
const { getDirectoryDetails } = require('../index.js');
const createHttpServer = require('../server.js');
const { homeDir, EOL } = require('os');
const dotenv = require('dotenv')
dotenv.config({path: path.join(__dirname, '../.env')});

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

function writeInitialPath(initialPath) 
{
  const envData = `\ninitialPath=${initialPath}`
  const fileName = path.join(__dirname, '../initialData.json');
  const file = require(fileName);
      
  file.initialPath = initialPath;
      
  fs.writeFile(fileName, JSON.stringify(file, null, 2), (err) => {
    if (err) return console.log(err)
  });
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
let pathProvided = inputs[0] || '.';
pathProvided = path.join(path.resolve(pathProvided), '/')
if (inputs.length > 1) {
  console.log(chalk.red('Only 1 path can be specified. `joshls --help` for details.'))
  return
}

(async () => {
  if (options.ui) {
    // create express server
    createHttpServer()
    writeInitialPath(pathProvided)
    // programatically call npm scripts to open the web UI
    npm.load({ prefix: path.join(__dirname, '../')}, () => {
      if (process.env.NODE_ENV === 'development') {
        //react dev server
        npm.run("client")
      }
      else {
        npm.run("serve")
        open('http://localhost:5000')
      }
    });
  }
  else {
    let errors = []
    const dir = await getDirectoryDetails(pathProvided, errors)
    if (!dir) {
      console.log(chalk.red('Input must be a valid directory'))
      return
    }
    console.log(chalk.underline(`Stats about ${pathProvided}:\n`))
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
    }))
    console.table(formattedData)
  }
})()