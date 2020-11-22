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
    this._validateEmsdkConfig();
  }

  __validateConfigureConfig() {
    if (!('configure' in this.config)
        || !('path' in this.config.configure))
      throw new RangeError('Configure config must have configure.path set to your source directory (which contains ./configure).');
    else
      this.config.configure.path = TryResolvePath(this.config.configure.path, this.config._configPath);

    if (!('cachePath' in this.config.configure)
        || !this.config.configure.cachePath)
      this.config.configure.cachePath = path.join(MainModuleDir(), 'build');
    else
      this.config.configure.cachePath = TryResolvePath(this.config.configure.cachePath, this.config._configPath);

      if (!('generator' in this.config.configure)
        || !this.config.configure.generator)
      this.config.configure.generator = 'Ninja';

      if (!('type' in this.config.configure)
        || !this.config.configure.type)
      this.config.configure.type = 'Release';

      if (!('outputPath' in this.config.configure)
        || !this.config.configure.outputPath)
      this.config.configure.outputPath = this.config.configure.cachePath;
    else
      this.config.configure.outputPath = TryResolvePath(this.config.configure.outputPath, this.config._configPath);

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
      this.config.build.path = this.config.configure.cachePath;
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
      this.config.clean.paths = [this.config.configure.cachePath];
    else {
      if (!Array.isArray(this.config.clean.paths))
        this.config.clean.paths = [this.config.clean.paths];

      this.config.clean.paths = this.config.clean.paths.map((currentValue) => {
        return TryResolvePath(currentValue, this.config._configPath);
      });
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementation helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs.existsSync(path.join(this.config.build.path, "CMakeCache.txt"))) {
      await this._configure();
      // make sure to reload the make variables after configuring
      await this.__determineMake(!!this.config.configure.generator);
    }
  }

  __buildConfigureArguments() {
    return [
      this.config.configure.path,
      '-G', this.config.configure.generator,
      `-DCMAKE_BUILD_TYPE="${this.config.configure.type}"`,
      `-DCMAKE_RUNTIME_OUTPUT_DIRECTORY="${this.config.configure.outputPath}"`,
      `-DCMAKE_LIBRARY_OUTPUT_DIRECTORY="${this.config.configure.outputPath}"`,
      `-DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="${this.config.configure.outputPath}"`,
      ...this.config.configure.arguments
    ];
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
      [this.configSubCommand, ...args],
      {cwd: this.config.configure.cachePath, shell: (process.platform === 'win32')}
    );
  }

  async _build() {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

    // build args
    let args;
    if (this.config.build.target)
      args = [this.config.build.target, ...this.config.build.arguments];
    else
      args = [...this.config.build.arguments];

    // note we do not use this.makeSubCommand because
    // we call the makeCommand directly instead of thru
    // an emsdk script.
    await emsdk.run(this.makeCommand, args,
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

////////////////////////////////////////////////////////////////////////
// Binding Helpers
////////////////////////////////////////////////////////////////////////

  __ensureMakeDirExists() {
    let result = shelljs.mkdir('-p', this.config.build.path);
    if (result.code !== 0)
      throw new Error(result.stderr);
  }

  async _bindConfigCommand(impl, ...args) {
    // Throws error if CMake is not installed.
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    this.__ensureMakeDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindMakeCommand(impl, ...args) {
    // Throws error if build command is not found.
    await this.__determineMake(!!this.config.configure.generator);
    
    this.__ensureMakeDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Check both config and build commands
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    await this.__determineMake(!!this.config.configure.generator);

    this.__ensureMakeDirExists();

    return this._bindCommand(impl, ...args);
  }
}
