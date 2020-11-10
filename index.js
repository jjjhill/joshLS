'use strict'
const fs = require('fs');
const winston = require('winston');
const path = require('path');

const errorLogPath = path.resolve(path.join(__dirname, 'logs/error.log'))

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: errorLogPath, level: 'error' })
  ],
});

async function getDirectoryDetails(path, erroredPaths) {
  let dir
  try {
    dir = await fs.promises.opendir(path);
  }
  catch (err) {
    logger.error(err)
    erroredPaths.push(err.path)
    return null
  }
  const entries = []
  let totalFiles = 0
  let totalSize = 0
  // 'for await..of' because dirEntry's are in an async iterator
  for await (const dirEntry of dir) {
    const details = await getEntryDetails(dirEntry, path, erroredPaths)
    if (!details) continue;
    entries.push(details)
    totalFiles += details.numFiles
    totalSize += details.size
  }

  entries.sort((a,b) => b.size - a.size)

  return {
    totalFiles,
    totalSize,
    entries
  }
}

// Recursive function to get details of a file/directory
// ie. The total size and the time of most recently modified file
async function getEntryDetails(entry, pathPrefix, erroredPaths) {
  let name = entry.name
  let path = pathPrefix + name
  const isDir = entry.isDirectory()

  let fileStats
  try {
    fileStats = fs.statSync(path)
  }
  catch(err) {
    logger.error(err)
    erroredPaths.push(err.path)
  }

  if (!fileStats) return null

  // the directory node itself has a size
  let size = fileStats.size
  let dateModified = fileStats.mtime
  let numFiles = 0

  if (isDir) {
    path += '/'
    
    let dir
    try {
      dir = await fs.promises.opendir(path);
    }
    catch(err) {
      logger.error(err)
      erroredPaths.push(err.path)
    }
    if (!dir) return null

    for await (const dirEntry of dir) {
      const details = await getEntryDetails(dirEntry, path, erroredPaths)
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
    isDir,
    size,
    dateModified,
    numFiles
  }
}

module.exports = {
  getDirectoryDetails,
  errorLogPath
}