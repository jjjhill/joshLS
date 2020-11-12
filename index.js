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

async function getDirectoryDetails(path, errors, requestStatus={}) {
  let dir
  try {
    dir = await fs.promises.opendir(path);
  }
  catch (err) {
    logger.error(err)
    errors.push(err)
    return null
  }
  const entries = []
  let totalFiles = 0
  let totalSize = 0
  // 'for await..of' because dirEntry's are in an async iterator
  for await (const dirEntry of dir) {
    if (requestStatus.cancelled) break
    const details = await getEntryDetails(dirEntry, path, errors, requestStatus)
    if (!details) continue;
    entries.push(details)
    totalFiles += details.numFiles
    totalSize += details.size
  }

  entries.sort((a,b) => b.size - a.size)

  return {
    totalFiles,
    totalSize,
    entries,
    path
  }
}

// Recursive function to get details of a file/directory
// ie. The total size and the time of most recently modified file
async function getEntryDetails(entry, pathPrefix, errors, requestStatus) {
  let name = entry.name
  let path = pathPrefix + name
  const isDir = entry.isDirectory()

  let fileStats
  try {
    fileStats = fs.lstatSync(path)
  }
  catch(err) {
    logger.error(err)
    errors.push(err)
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
      errors.push(err)
    }
    if (!dir) return null

    for await (const dirEntry of dir) {
      if (requestStatus.cancelled) break
      const details = await getEntryDetails(dirEntry, path, errors, requestStatus)
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

module.exports = {
  getDirectoryDetails,
  toReadableFileSize,
  errorLogPath
}