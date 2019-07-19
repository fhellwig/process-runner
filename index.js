const proc = require('child_process');
const path = require('path');
const chokidar = require('chokidar');

class NodeProcess {
  constructor(modulePath, args) {
    this._module = path.resolve(modulePath);
    this._dirname = path.dirname(this._module);
    this._args = args || [];
    this._child = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      const options = {
        detached: true,
        stdio: 'pipe',
        cwd: this._dirname,
        env: Object.assign({}, process.env, { FORCE_COLOR: 'yes' })
      };
      this._child = proc.fork(this._module, this._args, options);
      process.stdin.pipe(this._child.stdin);
      this._child.stdout.pipe(process.stdout);
      this._child.stderr.pipe(process.stderr);
      this._child.once('exit', code => {
        this._child.removeAllListeners();
        this._child = null;
        code === 0 ? resolve(0) : reject(this._error(code));
      });
      this._child.once('message', msg => {
        this._child.removeAllListeners();
        resolve(msg);
      });
      this._child.once('error', err => {
        this._child.removeAllListeners();
        this._child = null;
        reject(err);
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (this._child === null) {
        resolve(0);
      } else {
        this._child.removeAllListeners();
        this._child.once('exit', code => {
          this._child = null;
          code === 0 ? resolve(0) : reject(this._error(code));
        });
        this._child.send('stop');
      }
    });
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  async watch(paths, options, onChange) {
    if (typeof options === 'function') {
      onChange = options;
      options = {};
    }
    const retval = await this.start();
    const defaults = {
      cwd: this._dirname,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    };
    options = Object.assign(defaults, options || {});
    const watcher = chokidar.watch(paths, options);
    watcher.on('change', filename => {
      if (typeof onChange === 'function') {
        onChange(filename);
      }
      this.restart();
    });
    return retval;
  }

  _error(code) {
    return new Error(`${this._module}: ${code}`);
  }
}

module.exports = {
  NodeProcess
};
