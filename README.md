TODO:
- disable inputs when request is being fulfilled
- implement sorting on all table fields, clicking into directories from the UI, etc.
- show errors on CLI too


What's left to do for production:
- Dockerize the app to ensure that it runs the exact same on any machine (TODO: research if this is practical)
  - Start web server on docker init rather than when `joshls -u` is called.
- Ensure all file types (symbolic links / sockets / etc.) work as expected
- Add better error display on front end for different errors that may occur with fs.opendir() and fs.statsync()
- Add more robust info logging to joshls process
- Add cancel request feature (as some can take a quite a while)
