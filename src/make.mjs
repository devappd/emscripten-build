import Bootstrap from './bootstrap.mjs';
import emsdk from 'emsdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';
import { TryResolvePath } from './utils.mjs';

export default class Make extends Bootstrap {
  constructor(workingConfig) {
    super(workingConfig);

    this.makeCommand = 'emmake';
    this.makeSubCommand = makeCommand;

    this.__validateConfig();
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  __validateConfig() {
    this.__validateBuildConfig();
    this.__validateCleanConfig();
    this._validateEmsdkConfig();
  }

  __validateBuildConfig() {
    if (!('build' in this.config)
        || !('path' in this.config.build))
      throw new RangeError('Build config must have build.path set to your source directory (which contains Makefile).');
    else
      this.config.build.path = TryResolvePath(this.config.build.path, this.config._configPath);
    
    if (!('target' in this.config.build))
      this.config.build.target = null;

    if (!('arguments' in this.config.build)
        || !this.config.build.arguments)
      this.config.build.arguments = [];
    else if (!Array.isArray(this.config.build.arguments))
      this.config.build.arguments = [this.config.build.arguments];
  }

  __validateCleanConfig() {
    if (!('clean' in this.config))
      this.config.clean = {};

    if (!('paths' in this.config.clean)
        || !this.config.clean.paths)
      this.config.clean.paths = [];
    else {
      if (!Array.isArray(this.config.clean.paths))
        this.config.clean.paths = [this.config.clean.paths];

      this.config.clean.paths = this.config.clean.paths.map((currentValue) => {
        return TryResolvePath(currentValue, this.config._configPath);
      });
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    // Nothing to do, make is not configurable
  }

  async _build() {
    // build args
    let args;
    if (this.config.build.target)
      args = [this.makeSubCommand, this.config.build.target, ...this.config.build.arguments];
    else
      args = [this.makeSubCommand, ...this.config.build.arguments];

    await emsdk.run(this.makeCommand, args,
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

////////////////////////////////////////////////////////////////////////
// Binding Helpers
////////////////////////////////////////////////////////////////////////

  async _bindConfigCommand(impl, ...args) {
    // Nothing to do
    return this._bindCommand(impl, ...args);
  }

  async _bindMakeCommand(impl, ...args) {
    // Throws error if Make is not installed.
    await checkMakeInstalled();
    this.makeSubCommand = makeCommand;
    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Throws error if Make is not installed.
    await checkMakeInstalled();
    this.makeSubCommand = makeCommand;
    return this._bindCommand(impl, ...args);
  }
}
