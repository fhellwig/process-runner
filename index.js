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

  start() {
    return this._start().then(retval => {
      if (this._child) {
        this._child.on('exit', this._onExit.bind(this));
      }
      return retval;
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (this._child === null) {
        this._code ? reject(this._error(this._code)) : resolve(0);
      } else {
        this._child.removeAllListeners();
        this._child.once('exit', code => {
          this._child = null;
          code ? reject(this._error(code)) : resolve(0);
        });
        this._child.kill('SIGINT');
      }
    });
  }

  restart() {
    return this.stop().then(() => {
      return this.start();
    });
  }

  watch(paths, options, onChange) {
    if (typeof options === 'function') {
      onChange = options;
      options = {};
    }
    return this.start().then(retval => {
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
    });
  }

  _start() {
    return new Promise((resolve, reject) => {
      const options = {
        cwd: this._dirname,
        env: Object.assign({}, process.env, { FORCE_COLOR: 'yes' })
      };
      this._child = proc.fork(this._module, this._args, options);
      this._child.once('exit', code => {
        this._child.removeAllListeners();
        this._child = null;
        this._code = code;
        code ? reject(this._error(code)) : resolve(0);
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

  _onExit(code) {
    this._code = code;
    this._child = null;
  }

  _error(code) {
    return new Error(`Non-zero exit code from ${this._module}: ${code}`);
  }
}

module.exports = {
  NodeProcess
};
