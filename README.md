# process-runner

Provides the `NodeProcess` class. This class handles starting, stopping, restarting, and watching (using [chokidar](https://www.npmjs.com/package/chokidar)) a process started by [child_process.fork()](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options). It is designed for long-running processes (e.g., build watchers and servers).

## Installation

```bash
npm install --save process-runner
```

```javascript
const { NodeProcess } = require('process-runner');
```

## Important

1. Your process must send a message using `process.send()` so that the promise returned by the `start()` method is resolved.
2. Your process must handle the `SIGTERM` event by performing any required cleanup activity followed by a `process.exit(0)`;

## Motivation

I created this package because, during development, I often run multiple processes that watch for changes and yet need to be started and managed sequentially. For example, you want to perform a build and then watch for changes but you only want to start the server after the build is complete yet in parallel with watching for application changes.

## Concepts

The key concept of this package is that starting a long-running process often involves two steps: the initial process setup (building the web app or starting the server) followed by running the process (watching for web app changes or listening for connections). This is achieved by having the `start()` method wait for a message from the child process before resolving the returned promise. Of course, the promise is also resolved if the child exits successfully immediately after having been started.

For convenience, watching for changes and restarting the process is included in this package. I found this more convenient that dealing with command line tools such as nodemon. Although these can be run as modules, it is not their primary operating mode. The `watch()` method in this package provides an alternative.

This package works on Linux, macOS, and Windows.

## API

The `NodeProcess` class has a constructor and five async methods (one of which is static), each returning a promise.

### `new NodeProcess(modulePath, args)`

Creates a new `NodeProcess` instance but does not perform any startup actions.

Example:

```javascript
async function startup() {
  const process = new NodeProcess('server.js', [8080]);

  // Start the process (and wait for a message).
  await process.start();

  // The waitForInterrupt handles SIGINT using readline
  // so that it is not propogated to any child process.
  await NodeProcess.waitForInterrupt();
  console.log('Stopping child process...');
  await process.stop();
  console.log('Child process stopped.');
}
```

### `process.start()`

Starts the module specified by the `modulePath` with the specified `args`.

Returns a promise that is resolved when

- (a) the process sends a message using `process.send()` or
- (b) the process exits with an exit code of zero.

In the case of being resolved by a message, the message is the value of the resolved promise. This feature exists so that a process can perform initialization activity before releasing the parent to move on to the next task.

The default options passed to [child_process.fork()](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options) are as follows:

```javascript
{
  cwd: path.dirname(path.resolve(modulePath)),
  env: Object.assign({}, process.env, { FORCE_COLOR: 'yes' })
}
```

This ensures that the processes current working directory is that of the module specified in the constructor and that it receives the complete environment of the parent process. The `FORCE_COLOR` option makes utilities such as
[chalk](https://www.npmjs.com/package/chalk) work as expected.

### `process.stop()`

Sends a `SIGTERM` signal to the child process and waits for the child process to exit. The promise is resolved when the process exits (or has already terminated) with a non-error exit code.

### `process.restart()`

Stops the process by calling (and waiting on) the `stop()` method and then calls the `start()` method. The return value is the promise returned by the `start()` method.

### `process.watch(paths, [,options] [,onChange])`

Creates a watcher using [chokidar](https://www.npmjs.com/package/chokidar) and restarts the process on changes by handling the `change` event. The default options when creating the watcher are:

```javascript
{
  cwd: path.dirname(path.resolve(modulePath)),
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100
  }
}
```

If the optional `onChange` callback function is specified, it is called as `onChange(filename)` when a file is changed. The return value of the `watch()` method is the promise returned by `start()`.

## `NodeProcess.waitForInterrupt()`

This static method creates a [readline](https://nodejs.org/api/readline.html#readline_readline_createinterface_options) interface and waits for a `SIGINT` signal. The returned promise is resolved once the signal is received. This is an alternative to using process-level signal handler as it prevents the `SIGINT` signal from being propogated to any child process thereby allowing for a graceful shutdown of each child process. Please see the example above for usage.

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
