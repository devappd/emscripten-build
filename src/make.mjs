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
    this.__validateInstallConfig();
    this._validateEmsdkConfig();
  }

  __validateMakeConfig(configKey, targetName = null) {
    if (!(configKey in this.config))
      this.config[configKey] = {};

    if (!('target' in this.config[configKey]))
      this.config[configKey].target = targetName;

    if (!this.config[configKey].arguments)
      this.config[configKey].arguments = [];
    else if (!Array.isArray(this.config[configKey].arguments))
      this.config[configKey].arguments = [this.config[configKey].arguments];
  }

  __validateBuildConfig() {
    if (!('build' in this.config)
        || !('path' in this.config.build))
      throw new RangeError('Build config must have build.path set to your source directory (which contains Makefile).');
    else
      this.config.build.path = TryResolvePath(this.config.build.path, this.config.configPath);
    
    this.__validateMakeConfig('build', null);
  }

  __validateCleanConfig() {
    this.__validateMakeConfig('clean', 'clean');
  }

  __validateInstallConfig() {
    this.__validateMakeConfig('install', 'install');
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    // Nothing to do, make is not configurable
  }

  async __make(subconfig) {
    // build args
    let args;
    if (subconfig.target)
      args = [this.makeSubCommand, subconfig.target, ...subconfig.arguments];
    else
      args = [this.makeSubCommand, ...subconfig.arguments];

    // Make is called on the "build" path specifically.
    await emsdk.run(this.makeCommand, args,
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

  async _build() {
    await this.__make(this.config.build);
  }

  async _clean() {
    await this.__make(this.config.clean);
  }

  async _install() {
    await this.__make(this.config.install);
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
