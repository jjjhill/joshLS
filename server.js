const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const homeDir = require('os').homedir()
const { getDirectoryDetails, errorLogPath } = require('./index.js');

function createHttpServer() {
  const app = express();
  app.use(bodyParser.json());

  const corsOptions = {
    origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000': 'http://localhost:5000'
  }

  app.get('/initialData', cors(corsOptions), async function (req, res) {
    const initialDataPath = path.join(__dirname, './initialData.json');
    try {
      const data = require(initialDataPath);
      if (data) {
        res.json(data)
      }
      else {
        res.status(500)
        res.send("initialData.json file did not have key: initialPath")
      }
    }
    catch (err) {
      res.status(500)
      res.send("Server can not read initialData.json file")
    }
  })

  app.get('/', cors(corsOptions), async function (req, res) {
    /* Nest boolean into an object to make it a pass by reference
    rather than pass by value, and can then be checked at any
    level of the recursive stack. Can't tell if ugly hack or
    elegant way of cancelling a long-running recursive function. */
    let requestStatus = { cancelled: false };

    // Client cancels request
    req.on('close', () => {
      requestStatus.cancelled = true
    })

    const dirToAnalyze = req.query.path
    if (dirToAnalyze) {
      const pathPrefix = path.join(dirToAnalyze.replace('~', homeDir), '/')
      let errors = []
      const dir = await getDirectoryDetails(pathPrefix, errors, requestStatus)
      if (!dir) {
        res.status(404)
        res.end()
        return
      }
      if (errors.length > 0) {
        dir.errors = errors
        dir.logFile = errorLogPath
      }
      res.json(dir)
    }
  })

  if (process.env.NODE_ENV !== 'development') {
    app.use(express.static(path.join(__dirname, 'app/build')));
    app.get('*', function(req, res) {
      res.sendFile(path.join(__dirname, 'app/build/index.html'));
    });
  }

  const port = 8002
  const server = app.listen(port, () => {
    // console.log(`listening on localhost:${port}`)
  });
  return server
}

module.exports = createHttpServer