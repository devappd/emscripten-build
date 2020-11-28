import Bootstrap from './bootstrap.mjs';
import emsdk from 'emsdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';
import { TryResolvePath } from './utils.mjs';
import shelljs from 'shelljs';
import path from 'path';
import fs from 'fs';

export default class Autotools extends Bootstrap {
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
    this.__validateInstallConfig();
    this._validateEmsdkConfig();
  }

  __validateConfigureConfig() {
    if (!('configure' in this.config)
        || !('path' in this.config.configure))
      throw new RangeError('Configure config must have configure.path set to your source directory (which contains ./configure).');
    else
      this.config.configure.path = TryResolvePath(this.config.configure.path, this.config._configPath);
    
    if (!this.config.configure.arguments)
      this.config.configure.arguments = [];
    else if (!Array.isArray(this.config.configure.arguments))
      this.config.configure.arguments = [this.config.configure.arguments];
  }

  __validateMakeConfig(configKey, targetName = null, defaultPath = null) {
    if (!(configKey in this.config))
      this.config[configKey] = {};

    if (defaultPath && !this.config[configKey].path)
      this.config[configKey].path = defaultPath;
    
    if (this.config[configKey].path)
      this.config[configKey].path = TryResolvePath(this.config[configKey].path, this.config._configPath);

    if (!this.config[configKey].target)
      this.config[configKey].target = targetName;

    if (!this.config[configKey].arguments)
      this.config[configKey].arguments = [];
    else if (!Array.isArray(this.config[configKey].arguments))
      this.config[configKey].arguments = [this.config[configKey].arguments];
  }

  __validateBuildConfig() {
    this.__validateMakeConfig('build', null, './build');
  }

  __validateCleanConfig() {
    this.__validateMakeConfig('clean', 'clean');
  }

  __validateInstallConfig() {
    this.__validateMakeConfig('install', 'install', './dist');

    if (this.config.install.binaryPath)
      this.config.install.binaryPath = TryResolvePath(this.config.install.binaryPath, this.config._configPath);

    if (this.config.install.libraryPath)
      this.config.install.libraryPath = TryResolvePath(this.config.install.libraryPath, this.config._configPath);

    if (this.config.install.includePath)
      this.config.install.includePath = TryResolvePath(this.config.install.includePath, this.config._configPath);
  }

////////////////////////////////////////////////////////////////////////
// Implementation Helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs.existsSync(path.join(this.config.build.path, "Makefile")))
      await this._bindConfigCommand(this._configure);
  }

  __buildConfigureArguments() {
    let args = [
      `--prefix="${this.config.install.path}"`,
    ];

    if (this.config.install.binaryPath)
      args.push(`--bindir="${this.config.install.binaryPath}"`);

    if (this.config.install.libraryPath)
      args.push(`--libdir="${this.config.install.libraryPath}"`);

    if (this.config.install.includePath)
      args.push(`--includedir="${this.config.install.includePath}"`);

    args.push(...this.config.configure.arguments);

    return args;
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    let args = this.__buildConfigureArguments();
    let configSubCommand = path.join(this.config.configure.path, this.configSubCommand);

    await emsdk.run(this.configCommand,
      [configSubCommand, ...args],
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

  async __make(subconfig) {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

    // build args
    let args;
    if (subconfig.target)
      args = [this.makeSubCommand, subconfig.target, ...subconfig.arguments];
    else
      args = [this.makeSubCommand, ...subconfig.arguments];

    // Make is invoked on the "build" path specifically.
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

  __ensureBuildDirExists() {
    let result = shelljs.mkdir('-p', this.config.build.path);
    if (result.code !== 0)
      throw new Error(result.stderr);
  }

  async _bindConfigCommand(impl, ...args) {
    this.__ensureBuildDirExists();
    return this._bindCommand(impl, ...args);
  }

  async _bindMakeCommand(impl, ...args) {
    // Throws error if Make is not installed.
    await checkMakeInstalled();
    this.makeSubCommand = makeCommand;

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Throws error if Make is not installed.
    await checkMakeInstalled();
    this.makeSubCommand = makeCommand;

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }
}
