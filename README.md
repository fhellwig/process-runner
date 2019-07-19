# process-runner

Provides the `NodeProcess` class. This class handles starting, stopping, and restarting a process using `child_process.fork`. It is designed for long-running processes (e.g., build watchers and servers).

## Installation

```bash
npm install --save process-runner
```

```javascript
const { NodeProcess } = require('process-runner');
```

## Motivation

I created this package because, during development, I often run multiple processes that watch for changes and yet need to be started and managed sequentially. For example, you want to perform a build and then watch for changes but you only want to start the server after the build is complete yet in parallel with watching for application changes.

## API

The `NodeProcess` class has a constructor and four async methods, each returning a promise.

### `new NodeProcess(modulePath, args)`

Creates a new `NodeProcess` instance but does not perform any startup actions.

### `nodeProcess.start()`

Starts the module specified by the `modulePath` with the specified `args`.

Returns a promise that is resolved when

- (a) the process sends a message using `process.send` or
- (b) the process exits with an exit code of zero.

In the case of being resolved by a message, the message is the value of the resolved promise. This feature exists so that a process can perform initialization activity before releasing the parent to move on to the next task.

### `nodeProcess.stop()`

Sends a `'stop'` message to the child process and waits for the child process to exit. The promise is resolved when the process exits with an exit code of zero.

### `nodeProcess.restart()`

Stops the process by calling (and waiting on) the `stop` method and then calls (and returns the value of) the `start` method.

### `nodeProcess.watch(paths, [,options] [,onChange])`

Creates a watcher using `chokidar` and restarts the process on changes by handling the `change` event. The default options are:

```javascript
{
  cwd: path.dirname(path.resolve(modulePath)),
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100
  }
}
```

If the optional `onChange` callback function is specified, it is called as `onChange(filename)` when a file is changed.

The return value of the `watch` method is the promise returned by `start`.

# License

MIT License

Copyright (c) 2019 Frank Hellwig

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
