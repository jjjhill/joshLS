TODO:
- make good error message for typing a file instead of a directory
- cancel prev req when making a new one

What's left to do for production:
- Dockerize the app to ensure that it runs the exact same on any machine (TODO: research if this is practical)
- Ensure all file types (symbolic links / sockets / etc.) work as expected
- Add more error handling for different errors that may occur with fs.opendir() and fs.statsync()
- If more than this basic functionality is required, then using a web library like React or Vue, one could easily implement sorting on all table fields, clicking into directories from the UI, etc.
- Make a better file selector in the UI. HTML input with type="file" won't work here due to a security feature that prevents the web client from accessing the full path on the users system to the file that was selected. To solve this, either:
  - Make endpoints for autocompleting what the user is typing in the web UI and pipe the output of 'ls' command back to the user
  - Make a *nix based GUI (Py/Qt or similar) to allow for native file selection and ditch the Web UI.
