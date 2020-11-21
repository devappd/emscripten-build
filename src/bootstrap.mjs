import path from 'path';
import Activate from './activate.mjs';
import emsdk from 'emsdk-npm';
import shell from 'shelljs';
import fs from 'fs';

export default class Bootstrap {
  constructor(workingConfig) {
    this.config = workingConfig;

    this.configCommand = null;
    this.configSubCommand = null;

    this.makeCommand = null;
    this.makeSubCommand = null;
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  _validateEmsdkConfig() {
    if (!('emsdkVersion' in this.config)
        || !this.config.emsdkVersion)
      this.config.emsdkVersion = 'latest';
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    throw new Error('Bootstrap::_configure() not implemented by the subclass.')
  }

  async _build() {
    throw new Error('Bootstrap::_build() not implemented by the subclass.')
  }

  async _clean() {
    let cleanDirs = [...this.config.clean.paths];

    if (cleanDirs.length < 1) {
      console.warn('bootstrap::clean() has no paths to clean up. Your build will not be cleaned!');
      return this;
    }

    for (const dir of cleanDirs) {
      if (!dir)
        continue;

      let rmDir = path.resolve(dir);

      if (!fs.lstatSync(rmDir).isDirectory()) {
        console.warn(`Dir ${rmDir} is not a directory. Skipping...`);
        continue;
      }

      console.log(`Cleaning dir ${rmDir}...`);

      try {
        shell.rm('-rf', path.join(rmDir, '*'));
      } catch(e) {
        console.warn(`Could not clean ${rmDir}`, e.message);
      }
    }

    return this;
  }

  async _reconfigure() {
    await this._clean();
    await this._configure();
  }

  async _rebuild() {
    await this._clean();
    await this._build();
  }

  async _compile() {
    try {
      await this._build();
    }
    catch (e) {
      console.log("Build has been failed, trying to do a full rebuild.");
      await this._rebuild();
    }
  }

////////////////////////////////////////////////////////////////////////
// Binding Helpers
////////////////////////////////////////////////////////////////////////

  async __preCommand() {
    // emsdkVersion defaults to 'latest' and is guaranteed to be
    // in this.config
    await Activate(this.config.emsdkVersion);
  }

  async _bindCommand(impl, ...args) {
    await this.__preCommand();
    await impl.call(this, ...args);
    return this;
  }

  async _bindConfigCommand(impl, ...args) {
    throw new Error("Bootstrap::_bindConfigCommand not implemented by the subclass!")
  }

  async _bindMakeCommand(impl, ...args) {
    throw new Error("Bootstrap::_bindMakeCommand not implemented by the subclass!")
  }

  async _bindConfigMakeCommand(impl, ...args) {
    throw new Error("Bootstrap::_bindConfigMakeCommand not implemented by the subclass!")
  }

////////////////////////////////////////////////////////////////////////
// Bindings
////////////////////////////////////////////////////////////////////////

  // Must be implemented by subclass
  async configure() {
    return this._bindConfigCommand(this._configure);
  }

  // Must be implemented by subclass
  async build() {
    return this._bindMakeCommand(this._build);
  }

  // Alias for build. Subclasses should not implement this.
  async make() {
    return this.build();
  }

  // Subclasses should not need to implement this, but may do
  // so for special handling.
  async clean() {
    return this._clean();
  }

  // Subclasses should not define these meta-commands.
  async reconfigure() {
    return this._bindConfigCommand(this._reconfigure);
  }

  async rebuild() {
    return this._bindConfigMakeCommand(this._rebuild);
  }

  async compile() {
    return this._bindConfigMakeCommand(this._compile);
  }

  // Special command available to all bootstrap chains.
  // Subclasses should not define this.
  async run(command, args, opts = {}) {
    await this.__preCommand();
    await emsdk.run(command, args, opts);
    return this;
  }
}
