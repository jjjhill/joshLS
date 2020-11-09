'use strict'
const fs = require('fs');
const winston = require('winston');
const path = require('path');

const errorLogPath = path.resolve(path.join(__dirname, '../logs/error.log'))

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: errorLogPath, level: 'error' })
  ],
});

async function getDirectoryDetails(path) {
  const dir = await fs.promises.opendir(path);
  const entries = []
  let totalFiles = 0
  let totalSize = 0
  // 'for await..of' because dirEntry's are in an async iterator
  for await (const dirEntry of dir) {
    const details = await getEntryDetails(dirEntry, path)
    if (!details) continue;
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

// Recursive function to   details of a directory
// ie. total size & time of most recently modified file
async function getEntryDetails(entry, pathPrefix) {
  let name = entry.name
  let path = pathPrefix + name
  const isDirectory = entry.isDirectory()

  let fileStats
  try {
    fileStats = fs.statSync(path)
  }
  catch(err) {
    logger.error(err)
  }

  if (!fileStats) return null

  // the directory node itself has a size
  let size = fileStats.size
  let dateModified = fileStats.mtime
  let numFiles = 0

  if (isDirectory) {
    path += '/'
    
    let dir
    try {
      dir = await fs.promises.opendir(path);
    }
    catch(err) {
      erroredPaths.push(err.path)
      logger.error(err)
    }
    if (!dir) return null

    for await (const dirEntry of dir) {
      const details = await getEntryDetails(dirEntry, path)
      if (!details) continue;
      if (details.dateModified > dateModified) {
        dateModified = details.dateModified
      }
      size += details.size
      numFiles += details.numFiles
    }
  }
  else {
    numFiles = 1
  }

  return {
    name,
    isDirectory,
    size,
    dateModified,
    numFiles
  }
}

module.exports = {
  getDirectoryDetails,
  errorLogPath
}