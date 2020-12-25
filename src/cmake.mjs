import Bootstrap from './bootstrap.mjs';
import path from 'path';
import * as environment from './environment.mjs';
import glob from 'glob';
import fs from 'fs';
import emsdk from 'emsdk-npm';
import shelljs from 'shelljs';
import { MainModuleDir, IsDir, TryResolvePath } from './utils.mjs';

export default class CMake extends Bootstrap {
  constructor(workingConfig) {
    super(workingConfig);

    this.configCommand = 'emcmake';
    this.configSubCommand = 'cmake';

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
      throw new RangeError('Configure config must have configure.path set to your source directory (which contains CMakeLists.txt).');
    else
      this.config.configure.path = TryResolvePath(this.config.configure.path, this.config.configPath);

    if (!this.config.configure.generator)
      this.config.configure.generator = 'Ninja';

    if (!this.config.configure.type)
      this.config.configure.type = 'Release';

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
      this.config[configKey].path = TryResolvePath(this.config[configKey].path, this.config.configPath);

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
      this.config.install.binaryPath = TryResolvePath(this.config.install.binaryPath, this.config.configPath);

    if (this.config.install.libraryPath)
      this.config.install.libraryPath = TryResolvePath(this.config.install.libraryPath, this.config.configPath);

    if (this.config.install.includePath)
      this.config.install.includePath = TryResolvePath(this.config.install.includePath, this.config.configPath);
  }

////////////////////////////////////////////////////////////////////////
// Implementation helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs.existsSync(path.join(this.config.build.path, "CMakeCache.txt"))) {
      await this._bindConfigCommand(this._configure);
      // make sure to reload the make variables after configuring
      await this.__determineMake(!!this.config.configure.generator);
    }
  }

  __buildConfigureArguments() {
    let args = [
      `"${this.config.configure.path}"`,
      '-G', this.config.configure.generator,
      `-DCMAKE_BUILD_TYPE="${this.config.configure.type}"`,
      `-DCMAKE_INSTALL_PREFIX="${this.config.install.path}"`,
    ];

    if (this.config.install.binaryPath)
      args.push(`-DCMAKE_INSTALL_BINDIR="${this.config.install.binaryPath}"`);

    if (this.config.install.libraryPath)
      args.push(`-DCMAKE_INSTALL_LIBDIR="${this.config.install.libraryPath}"`);

    if (this.config.install.includePath)
      args.push(`-DCMAKE_INSTALL_INCLUDEDIR="${this.config.install.includePath}"`);

    args.push(...this.config.configure.arguments);

    return args;
  }

  // Populate this.makeCommand
  async __determineMake(fromCache = false) {
    // Populate this.makeCommand instead of this.makeSubCommand
    // because we call these executables directly
    // instead of thru an emsdk script.

    if (fromCache && !IsDir(this.config.build.path))
      // Nothing to do
      return;

    let generator = this.config.configure.generator.toLowerCase();

    // Ninja
    let hasNinja = fromCache
      ? fs.existsSync(path.join(this.config.build.path, 'build.ninja'))
      : generator === 'ninja';

    if (hasNinja) {
      await environment.checkNinjaInstalled();
      this.makeCommand = environment.ninjaCommand;
      this.makeSubCommand = null;
      return;
    }

    // Makefiles
    // test for 'Unix Makefiles', 'MinGW Makefiles', etc.
    let hasMake = fromCache
      ? fs.existsSync(path.join(this.config.build.path, 'Makefile'))
      : generator.includes('makefiles');

    if (hasMake) {
      await environment.checkMakeInstalled();
      this.makeCommand = environment.makeCommand;
      this.makeSubCommand = null;
      return;
    }

    // MSBuild
    // test for 'Visual Studio 14', etc.
    let hasVS = fromCache
      ? (glob.sync("*.sln", { cwd: this.config.build.path }).length > 0)
      : generator.includes('visual studio ');

    if (hasVS) {
      await environment.checkMSBuildInstalled();
      this.makeCommand = environment.msbuildCommand;
      this.makeSubCommand = null;
      return;
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    await this.__determineMake();

    let args = this.__buildConfigureArguments();

    if (this.makeCommand)
      args = args.concat([`-DCMAKE_MAKE_PROGRAM="${this.makeCommand}"`])

    await emsdk.run(this.configCommand,
      [`"${this.configSubCommand}"`, ...args],
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

  async __make(subconfig) {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

    // build args
    let args;
    if (subconfig.target)
      args = [subconfig.target, ...subconfig.arguments];
    else
      args = [...subconfig.arguments];

    // note we do not use this.makeSubCommand because
    // we call the makeCommand directly instead of thru
    // an emsdk script.
    //
    // Make is called on the build path specifically.
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
    // Throws error if CMake is not installed.
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindMakeCommand(impl, ...args) {
    // Throws error if build command is not found.
    await this.__determineMake(!!this.config.configure.generator);
    
    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Check both config and build commands
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    await this.__determineMake(!!this.config.configure.generator);

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }
}
