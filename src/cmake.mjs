import Bootstrap from './bootstrap.mjs';
import path from 'path';
import * as environment from './environment.mjs';
import glob from 'glob';
import fs from 'fs';
import emsdk from 'emscripten-sdk-npm';
import shelljs from 'shelljs';
import { MainModuleDir, IsDir, TryResolvePath } from './utils.mjs';

export default class CMake extends Bootstrap {
  constructor(workingSettings) {
    super(workingSettings);

    this.configCommand = 'emcmake';
    this.configSubCommand = 'cmake';

    this.__validateSettings();
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  __validateSettings() {
    this.__validateConfigureSettings();
    this.__validateBuildSettings();
    this.__validateCleanSettings();
    this.__validateInstallSettings();
    this._validateEmsdkSettings();
  }

  __validateConfigureSettings() {
    if (!('configure' in this.settings)
        || !('path' in this.settings.configure))
      throw new RangeError('Configure settings must have configure.path set to your source directory (which contains CMakeLists.txt).');
    else
      this.settings.configure.path = TryResolvePath(this.settings.configure.path, this.settings.configPath);

    if (!this.settings.configure.generator)
      this.settings.configure.generator = 'Ninja';

    if (!this.settings.configure.type)
      this.settings.configure.type = 'Release';
    
    this._validateDefinitionSettings(this.settings.configure);

    if (!this.settings.configure.arguments)
      this.settings.configure.arguments = [];
    else if (!Array.isArray(this.settings.configure.arguments))
      this.settings.configure.arguments = [this.settings.configure.arguments];
  }

  __validateMakeSettings(stepKey, targetName = null, defaultPath = null) {
    if (!(stepKey in this.settings))
      this.settings[stepKey] = {};

    if (defaultPath && !this.settings[stepKey].path)
      this.settings[stepKey].path = defaultPath;
    
    if (this.settings[stepKey].path)
      this.settings[stepKey].path = TryResolvePath(this.settings[stepKey].path, this.settings.configPath);

    if (!this.settings[stepKey].target)
      this.settings[stepKey].target = targetName;

    if (!this.settings[stepKey].arguments)
      this.settings[stepKey].arguments = [];
    else if (!Array.isArray(this.settings[stepKey].arguments))
      this.settings[stepKey].arguments = [this.settings[stepKey].arguments];
  }

  __validateBuildSettings() {
    this.__validateMakeSettings('build', null, './build');
  }

  __validateCleanSettings() {
    this.__validateMakeSettings('clean', 'clean');
  }

  __validateInstallSettings() {
    this.__validateMakeSettings('install', 'install', './dist');

    if (this.settings.install.binaryPath)
      this.settings.install.binaryPath = TryResolvePath(this.settings.install.binaryPath, this.settings.configPath);

    if (this.settings.install.libraryPath)
      this.settings.install.libraryPath = TryResolvePath(this.settings.install.libraryPath, this.settings.configPath);

    if (this.settings.install.includePath)
      this.settings.install.includePath = TryResolvePath(this.settings.install.includePath, this.settings.configPath);
  }

////////////////////////////////////////////////////////////////////////
// Implementation helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs.existsSync(path.join(this.settings.build.path, "CMakeCache.txt"))) {
      await this._bindConfigCommand(this._configure);
      // make sure to reload the make variables after configuring
      await this.__determineMake(!!this.settings.configure.generator);
    }
  }

  __buildConfigureArguments() {
    let args = [
      `"${this.settings.configure.path}"`,
      '-G', this.settings.configure.generator,
      `-DCMAKE_BUILD_TYPE="${this.settings.configure.type}"`,
      `-DCMAKE_INSTALL_PREFIX="${this.settings.install.path}"`,
    ];

    if (this.settings.install.binaryPath)
      args.push(`-DCMAKE_INSTALL_BINDIR="${this.settings.install.binaryPath}"`);

    if (this.settings.install.libraryPath)
      args.push(`-DCMAKE_INSTALL_LIBDIR="${this.settings.install.libraryPath}"`);

    if (this.settings.install.includePath)
      args.push(`-DCMAKE_INSTALL_INCLUDEDIR="${this.settings.install.includePath}"`);

    args.push(...this.settings.configure.arguments);

    return args;
  }

  __buildDefinitions(definitions) {
    const prefix = '-D';
    const processTypes = true;
    let args = [];

    for (let [key, val] of definitions) {
      let argString = `${prefix}${key}`;

      if (typeof val === 'object' && val !== null) {
        if (processTypes && 'type' in val)
          argString = argString.concat(`:${val.type}`);

        // if this object conforms to our format ({type:'...', value: '...'}), then convert to string
        // else, stringify the entire object on routine end
        if ('value' in val)
          val = val.value;
      }

      if (typeof val === 'string')
        val = val.replace('"', '\"');
      
      // interpret "true"/"false" as "ON"/"OFF"
      if (val === true)
        val = "ON";
      else if (val === false)
        val = "OFF";
      else if (val === null)
        val = "";

      // stringify everything else
      args.push(`"${argString.concat(`=${val}`)}"`);
    }

    return args;
  }

  // Populate this.makeCommand
  async __determineMake(fromCache = false) {
    // Populate this.makeCommand instead of this.makeSubCommand
    // because we call these executables directly
    // instead of thru an emsdk script.

    if (fromCache && !IsDir(this.settings.build.path))
      // Nothing to do
      return;

    let generator = this.settings.configure.generator.toLowerCase();

    // Ninja
    let hasNinja = fromCache
      ? fs.existsSync(path.join(this.settings.build.path, 'build.ninja'))
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
      ? fs.existsSync(path.join(this.settings.build.path, 'Makefile'))
      : generator.includes('makefiles');

    if (hasMake) {
      await environment.checkMakeInstalled();
      this.makeCommand = environment.makeCommand;
      this.makeSubCommand = null;
      return;
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    await this.__determineMake();

    let defs = this.__buildDefinitions(this.settings.configure.definitions);
    let args = this.__buildConfigureArguments();

    if (this.makeCommand)
      args = args.concat([`-DCMAKE_MAKE_PROGRAM="${this.makeCommand}"`])

    await emsdk.run(this.configCommand,
      [`"${this.configSubCommand}"`, ...args, ...defs],
      {cwd: this.settings.build.path, shell: (process.platform === 'win32')}
    );
  }

  async __make(stepSettings) {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

    // build args
    let args;
    if (stepSettings.target)
      args = [stepSettings.target, ...stepSettings.arguments];
    else
      args = [...stepSettings.arguments];

    // note we do not use this.makeSubCommand because
    // we call the makeCommand directly instead of thru
    // an emsdk script.
    //
    // Make is called on the build path specifically.
    await emsdk.run(this.makeCommand, args,
      {cwd: this.settings.build.path, shell: (process.platform === 'win32')}
    );
  }

  async _build() {
    await this.__make(this.settings.build);
  }

  async _clean() {
    await this.__make(this.settings.clean);
  }

  async _install() {
    await this.__make(this.settings.install);
  }

////////////////////////////////////////////////////////////////////////
// Binding Helpers
////////////////////////////////////////////////////////////////////////

  __ensureBuildDirExists() {
    let result = shelljs.mkdir('-p', this.settings.build.path);
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
    await this.__determineMake(!!this.settings.configure.generator);
    
    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Check both config and build commands
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    await this.__determineMake(!!this.settings.configure.generator);

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }
}
