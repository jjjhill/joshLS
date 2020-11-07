#!/usr/bin/env node

const fs = require("fs")
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const options = yargs(hideBin(process.argv))
  .usage("Usage:\n  $0 [OPTION]... [DIRECTORY]...")
  .option('ui', {
    alias: 'u',
    describe: "Open the UI for the app",
    type: "boolean"
  })
  .argv;

const inputs = options['_']
if (options.ui) {
  console.log("OPEN UI")
}
else if (inputs.length === 1) {
  print(inputs[0])
}
else {
  console.error("Invalid number of arguments.\njoshls --help")
}

// Recursive function to   details of a directory
// ie. total size & time of most recently modified file
async function getEntryDetails(entry, pathPrefix) {
  const name = entry.name
  let path = pathPrefix + name
  const fileStats = fs.statSync(path)

  // the directory node itself has a size
  let size = fileStats.size
  let dateModified = fileStats.mtime
  let numFiles = 0
  let isDirectory = false

  if (entry.isFile()) {
    numFiles = 1
  }
  else if (entry.isDirectory()) {
    path += '/'
    const dir = await fs.promises.opendir(path);
    for await (const dirEntry of dir) {
      const details = await getEntryDetails(dirEntry, path)
      if (details.dateModified > dateModified) {
        dateModified = details.dateModified
      }
      size += details.size
      numFiles += details.numFiles
    }
  }
  else {
    console.warn("This app is not designed to handle Socket or Symbolic Link files! Contact the developer.")
  }

  return {
    name,
    size,
    dateModified,
    numFiles
  }
}

async function print(path) {
  console.log(path)
  const dir = await fs.promises.opendir(path);
  const entries = []
  let totalFiles = 0
  let totalSize = 0
  // "for await..of" because dirEntry's are in an async iterator
  for await (const dirEntry of dir) {
    const details = await getEntryDetails(dirEntry, path)
    entries.push(details)
    totalFiles += details.numFiles
    totalSize += details.size
  }

  entries.sort((a,b) => b.dateModified - a.dateModified)

  return {
    totalFiles,
    totalSize,
    entries
  }
}