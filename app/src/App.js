import './App.css';
import path from 'path';
import Toast from 'react-bootstrap/Toast';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import FormControl from 'react-bootstrap/FormControl';
import { useState, useEffect, useCallback } from 'react';

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

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [toastContent, setToastContent] = useState(null)
  const [entries, setEntries] = useState([])
  const [totalSize, setTotalSize] = useState(null)
  const [totalFiles, setTotalFiles] = useState(null)
  const [pathInput, setPathInput] = useState('')
  const [analyzedPath, setAnalyzedPath] = useState('')
  const [abortController, setAbortController] = useState(null)

  const requestDirectoryDetails = useCallback(async (path) => {
    const controller = new AbortController();
    const signal = controller.signal
    setAbortController(controller)
    setToastContent(null)

    setIsLoading(true)
    let response
    try {
      response = await fetch(`http://localhost:8002/?path=${path}`, { signal })
    }
    catch(error) {
      // ignore the user-initiated abort error
      if (error instanceof DOMException) {
        return
      }
      setToastContent(error.message)
      setIsLoading(false)
      return
    }
    if (response.status !== 200) {
      setToastContent('Directory not found on host machine.')
      setData({})
    }
    else {
      const data = await response.json()
      const errors = data.errors
      if (errors) {
        setToastContent(`There were errors analyzing ${errors.length} director${errors.length > 1 ? 'ies': 'y'} inside of ${path}. Please see ${data.logFile} for more details. The table still shows all other directories.`)
      }
      setData(data)
    }
    setIsLoading(false)
  }, [])

  // on component mount
  useEffect(() => {
    (async function fetchInitialData() {
      const response = await fetch(`http://localhost:8002/initialData`)
      const { initialPath } = await response.json()
      setPathInput(initialPath)
      requestDirectoryDetails(initialPath)
    })()
  }, [requestDirectoryDetails])

  function setData({entries=[], totalSize=null, totalFiles=null, path=''}) {
    setEntries(entries)
    setTotalSize(totalSize)
    setTotalFiles(totalFiles)
    setAnalyzedPath(path)
  }

  function cancelRequest() {
    abortController.abort()
    setIsLoading(false)
    setPathInput(analyzedPath)
  }

  function enterDirectory(name) {
    if (isLoading) {
      cancelRequest()
    }
    const nextPath = path.join(analyzedPath, name)
    setPathInput(nextPath)
    requestDirectoryDetails(nextPath)
  }

  function handleKeyUp(e) {
    if (e.key === 'Enter') {
      requestDirectoryDetails(pathInput)
    }
  }
  
  return (
    <div className="App">
      <p id="logo">
        josh<strong>ls</strong>
      </p>
      <FormControl
        id="pathInput"
        placeholder="/path/to/directory/"
        aria-label="absolute path to directory"
        aria-describedby="basic-addon1"
        onChange={(e) => setPathInput(e.target.value)}
        value={pathInput}
        onKeyUp={handleKeyUp}
      />
      { !isLoading ?
        <Button variant="info" className="actionBtn" onClick={() => requestDirectoryDetails(pathInput)}>
          Analyze
        </Button>
        : 
        <Button variant="danger" className="actionBtn" onClick={cancelRequest}>
          Cancel
          <Spinner animation="grow" size="sm" id="spinner" />
        </Button>
      }
      
      { toastContent && <Toast id="errToast" role="alert" aria-live="assertive">
        <div className="toast-header">
          <strong className="mr-auto">Error</strong>
          <button type="button" className="ml-2 mb-1 close" onClick={() => setToastContent(null)}>&times;</button>
        </div>
        <div className="toast-body">
          {toastContent}
        </div>
      </Toast> }

      { totalSize !== null && <div id="content">
        <div id="directoryStats">
          <span>
            <strong>{totalFiles}</strong> Files | <strong>{toReadableFileSize(totalSize)}</strong>
          </span>
          <span id="analyzedPath">
            Current Directory: <strong><em>{analyzedPath}</em></strong>
          </span>
        </div>
        <Table striped hover size='sm'>
          <thead className="thead-dark">
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Date Modified</th>
              <th>Number of Files</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr>
              <td className="clickable" colSpan="4" onClick={() => enterDirectory('..')}>
                📁 ..
              </td>
            </tr>
            { entries.map(entry => {
              const icon = entry.isDir ? '📁' : '📄';
              return (
                <tr key={entry.name}>
                  <td
                    className={entry.isDir ? "clickable" : null}
                    onClick={() => entry.isDir ? enterDirectory(entry.name) : {}}
                  >
                    {icon} {entry.name}
                  </td>
                  <td>{toReadableFileSize(entry.size)}</td>
                  <td>
                    {(new Date(Date.parse(entry.dateModified))).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      second: 'numeric' 
                    })}
                  </td>
                  <td>{entry.numFiles}</td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div> }
    </div>
  );
}

export default App;
