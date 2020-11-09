function toReadableFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let currNum = bytes
  let i = 0
  while (currNum >= 1024) {
    currNum /= 1024
    i++
  }
  return currNum.toPrecision(2) / 1 + ' ' + units[i]
}