import Bootstrap from './bootstrap.mjs';
import emsdk from 'emsdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';
import { TryResolvePath } from './utils.mjs';

export default class Configure extends Bootstrap {
  constructor(workingConfig) {
    super(workingConfig);

    this.configCommand = 'emconfigure';
    this.configSubCommand = 'configure';

    this.makeCommand = 'emmake';
    this.makeSubCommand = makeCommand;

    this.__validateConfig();
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  __validateConfig() {
    this.__validateConfigureConfig();
    this.__validateBuildConfig();
    this.__validateCleanConfig();
    this._validateEmsdkConfig();
  }

  __validateConfigureConfig() {
    if (!('configure' in this.config)
        || !('path' in this.config.configure))
      throw new RangeError('Configure config must have configure.path set to your source directory (which contains ./configure).');
    else
      this.config.configure.path = TryResolvePath(this.config.configure.path, this.config._configPath);
    
    if (!('arguments' in this.config.configure)
        || !this.config.configure.arguments)
      this.config.configure.arguments = [];
    else if (!Array.isArray(this.config.configure.arguments))
      this.config.configure.arguments = [this.config.configure.arguments];
  }

  __validateBuildConfig() {
    if (!('build' in this.config))
      this.config.build = {};

    if (!('path' in this.config.build)
        || !this.config.build.path)
      this.config.build.path = this.config.configure.path;
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
// Implementation Helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    try {
      await fs.lstat(path.join(this.config.build.path, "Makefile"));
    }
    catch (e) {
      await this._configure();
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    await emsdk.run(this.configCommand,
      [this.configSubCommand, ...this.config.configure.arguments],
      {cwd: this.config.configure.path, shell: (process.platform === 'win32')}
    );
  }

  async _build() {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

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
    // Nothing to do, we don't do checks on ./configure
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
