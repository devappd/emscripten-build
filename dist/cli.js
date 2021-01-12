#!/usr/bin/env node
'use strict';

var emsdk = require('emscripten-sdk-npm');
var path = require('path');
var getInstalledPathCJS = require('get-installed-path');
var os = require('os');
var fs = require('fs');
var which = require('which');
var glob = require('glob');
var shelljs = require('shelljs');
var resolvePath = require('resolve-path');
var mergeWith = require('lodash.mergewith');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var emsdk__default = /*#__PURE__*/_interopDefaultLegacy(emsdk);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var getInstalledPathCJS__default = /*#__PURE__*/_interopDefaultLegacy(getInstalledPathCJS);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var which__default = /*#__PURE__*/_interopDefaultLegacy(which);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);
var shelljs__default = /*#__PURE__*/_interopDefaultLegacy(shelljs);
var resolvePath__default = /*#__PURE__*/_interopDefaultLegacy(resolvePath);
var mergeWith__default = /*#__PURE__*/_interopDefaultLegacy(mergeWith);

// activate.js

let alwaysUpdate = false, neverUpdate = false;
let hasUpdated = false;
let _active = null;

async function InstallEmSDK(version = 'latest') {
  // Retrieve the latest tags from git.
  // Never update if specified, otherwise update once per runtime
  // unless alwaysUpdate is true.
  if (!neverUpdate && (alwaysUpdate || !hasUpdated)) {
    hasUpdated = true;
    await emsdk__default['default'].checkout();
    await emsdk__default['default'].update();
  }
  
  // Check if the requested EMSDK version is currently on disk. Only
  // one version is "installed" at a time, and no other versions are cached.
  if (!emsdk__default['default'].getInstalled(version)) {
    await emsdk__default['default'].install(version, true);

    // Also activate upon install, as this writes files to set up
    // the environment scripts.
    //
    // Activation is only necessary upon install. Presuming the environment
    // scripts aren't modified by user, subsequent calls need only
    // invoke the `emsdk_env` script -- see emsdk.run().
    await emsdk__default['default'].activate(version);
  }
}

async function ActivateEmSDK(version = 'latest') {
  if (_active === version && !alwaysUpdate)
    return;

  // Update, install, and activate if the requested version is not on-disk.
  await InstallEmSDK(version);
  _active = version;
}

/**
 * Always check server for Emscripten SDK updates for the current runtime session.
 */
function ForceEmSDKUpdates() {
  alwaysUpdate = true;
  neverUpdate = false;
}

/**
 * Never check server for Emscripten SDK updates for the current runtime session.
 */
function DisableEmSDKUpdates() {
  alwaysUpdate = false;
  neverUpdate = true;
}

/**
 * Resets forcing/disabling of Emscripten SDK updates.
 */
function ResetEmSDKUpdates() {
  alwaysUpdate = false;
  neverUpdate = false;
}

class Bootstrap {
  constructor(workingSettings) {
    this.settings = workingSettings;

    this.configCommand = null;
    this.configSubCommand = null;

    this.makeCommand = null;
    this.makeSubCommand = null;
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  _validateEmsdkSettings() {
    if (!('emsdkVersion' in this.settings)
        || !this.settings.emsdkVersion)
      this.settings.emsdkVersion = 'latest';
  }

  _validateDefinitionSettings(stepSettings) {
    // "macros" is an alias for "definitions"
    if ('macros' in stepSettings) {
      if ('definitions' in stepSettings)
        throw new RangeError('"macros" and "definitions" cannot both exist in your selected settings.');

      // Mutate the settings object and reassign "macros" to "definitions"
      delete Object.assign(stepSettings, {['definitions']: stepSettings['macros'] })['macros'];
    }

    if (!('definitions' in stepSettings))
      stepSettings.definitions = [];

    // Convert objects to [ [ key, val ], [ key, val ], ... ]
    if (stepSettings.definitions instanceof Map)
      stepSettings.definitions = [...stepSettings.definitions.entries()];
    else if (!Array.isArray(stepSettings.definitions)) {
      if (typeof stepSettings.definitions !== 'object')
        throw new RangeError(`Invalid "definitions" in your selected settings: ${stepSettings.definitions}`);
      stepSettings.definitions = Object.entries(stepSettings.definitions);
    }

    // Enforce two-element array members
    stepSettings.definitions = stepSettings.definitions.map(elem => {
      let result;

      // Presume that non-array elements are macros without a value
      if (!Array.isArray(elem))
        result = [ elem, null ];
      
      switch (elem.length) {
        case 0:
          throw new RangeError('"definitions" in your selected settings includes an empty element.');
        case 1:
          // Presume this is a macro without a value
          result = elem.concat(null);
          break;
        case 2:
          result = elem;
          break;
        default:
          throw new RangeError(`"definitions" in your selected settings contains an element with greater than two values: ${elem}`);
      }

      // Check invalid definition keys
      if (!(typeof result[0] === 'string'))
        throw new RangeError(`"definitions" has an invalid key, must be string: ${result[0]}`);
      
      // Mutate element key tby trimming
      result[0] = result[0].trim();
      if (!result[0])
        throw new RangeError(`"definitions" has an empty key, must be non-empty after trimming: ${result}`);

      // Check invalid value objects
      if (typeof result[1] === 'object' && result[1] !== null) {
        // Presume this is a macro without a value
        if (!Object.keys(result[1]).length)
          result[1] = null;
        else if ('type' in result[1] && !('value' in result[1]))
          throw new RangeError(`definitions has a value where "type" is specified but "value" is not: ${result[0]}, ${result[1]}`);
      }
      
      return result;
    });
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
    throw new Error('Bootstrap::_clean() not implemented by the subclass.')
  }

  async _install() {
    throw new Error('Bootstrap::_install() not implemented by the subclass.')
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
    // in this.settings
    await ActivateEmSDK(this.settings.emsdkVersion);
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

  // Must be implemented by subclass
  async clean() {
    return this._bindMakeCommand(this._clean);
  }

  // Must be implemented by subclass
  async install() {
    return this._bindMakeCommand(this._install);
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
    await emsdk__default['default'].run(command, args, opts);
    return this;
  }
}

// environment.js

const getInstalledPath = getInstalledPathCJS__default['default'].getInstalledPath;

async function _tryImport(packageName) {
  try {
    let { default: mod } = await Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(packageName)); });
    return mod;
  } catch (e) {
    // Presume package is not installed
    console.error(`The ${packageName} package is not installed!`);
    throw e;
  }
}

////////////////////////////////////////////////////////////////////////
// CMake
////////////////////////////////////////////////////////////////////////

let _CMakeExists = false;
let cMakeCommand = 'cmake';

async function checkCMakeInstalled() {
  if (_CMakeExists)
    return true;
  
  // Check if CMake is installed
  let cmake;
  try {
    cmake = await _tryImport('cmake-binaries');
  } catch (e) {
    // doesn't exist, try which
    try {
      cmakeCommand = await which__default['default']('cmake');
      _CMakeExists = true;
      return true;
    } catch (e) {
      // presume not in PATH
      _CMakeExists = false;
      return false;
    }
  }

  // Check node_modules
  if (!cmake.exists())
    throw new Error('CMake was not found! Try running '
      + '`npm explore cmake-binaries -- npm run install -- --force`');

  // While we're here, populate the CMake command
  cMakeCommand = cmake.getCommand();

  // If successful, persist this check per runtime session
  _CMakeExists = true;
  
  return true;
}

////////////////////////////////////////////////////////////////////////
// MSBuild
////////////////////////////////////////////////////////////////////////

let _MSBuildExists = false;
let msbuildCommand = 'msbuild';

async function checkMSBuildInstalled() {
  if (_MSBuildExists)
    return true;

  // Check if MSBuild is in path
  try {
    msbuildCommand = await which__default['default']('msbuild');
    _MSBuildExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // No results? Rely on `msbuild` package
  var msbuild = await _tryImport('msbuild');

  // This always returns a path, whether or not it exists
  let msbuildPath = msbuild.buildexe();

  if (!fs__default['default'].existsSync(msbuildPath))
    throw new Error('MSBuild was not found!');

  // While we're here, populate the MSBuild command
  msbuildCommand = msbuildPath;

  // If successful, persist this check per runtime session
  _MSBuildExists = true;
}

////////////////////////////////////////////////////////////////////////
// Ninja
////////////////////////////////////////////////////////////////////////

let _NinjaExists = false;
let ninjaCommand = 'ninja';

async function checkNinjaInstalled() {
  if (_NinjaExists)
    return true;

  // Check if ninja is in path
  try {
    ninjaCommand = await which__default['default']('ninja');
    _NinjaExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // No results? Rely on `ninja-binaries` package
  let ninjaPath;
  try {
    // Prefer local node_modules
    ninjaPath = await getInstalledPath('ninja-binaries', { local: true });
  } catch (e) {
    try {
      // Try global node_modules
      ninjaPath = await getInstalledPath('ninja-binaries');
    } catch (e) {
      throw new Error('ninja was not found! To resolve, you may install `npm install -g ninja-binaries`.')
    }
  }

  if (os__default['default'].platform() === 'win32')
    ninjaPath = path__default['default'].join(ninjaPath, 'binaries', 'ninja-win.exe');
  else if (os__default['default'].platform() === 'darwin')
    ninjaPath = path__default['default'].join(ninjaPath, 'binaries', 'ninja-mac');
  else if (os__default['default'].platform() === 'linux' || os__default['default'].platform() === 'cygwin')
    ninjaPath = path__default['default'].join(ninjaPath, 'binaries', 'ninja-linux');
  else
    throw new Error(`ninja was not found for your platform (${os__default['default'].platform()}!`);

  if (!fs__default['default'].existsSync(ninjaPath))
    throw new Error('ninja was not found!');

  // While we're here, populate the ninja command
  ninjaCommand = ninjaPath;

  // If successful, persist this check per runtime session
  _NinjaExists = true;
}

////////////////////////////////////////////////////////////////////////
// Make
////////////////////////////////////////////////////////////////////////

let _MakeExists = false;
let makeCommand = 'make';

async function checkMakeInstalled() {
  if (_MakeExists)
    return true;

  // Check if Make is in path
  try {
    makeCommand = await which__default['default']('make');
    _MakeExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // If we're Windows, also check for mingw32-make
  try {
    makeCommand = await which__default['default']('mingw32-make');
    _MakeExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  throw new Error('Make was not found!');
}

// https://github.com/tapjs/libtap/pull/21/files
function MainScript(defaultName) {
  if (typeof repl !== 'undefined' || '_eval' in process) {
    return defaultName
  }

  return process.argv[1] || defaultName
}

function MainModuleDir() {
  let mainScript = MainScript('.');

  if (mainScript === '.')
    return path__default['default'].resolve('.');
  else
    return path__default['default'].resolve(path__default['default'].dirname(mainScript));
}

// https://stackoverflow.com/a/53530146
function IsDir(path) {
  try {
      var stat = fs__default['default'].lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      return false;
  }
}

function IsFile(path) {
  try {
      var stat = fs__default['default'].lstatSync(path);
      return stat.isFile();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      return false;
  }
}

function TryResolvePath(relativePath, rootPath) {
  if (!rootPath)
    return path__default['default'].resolve(relativePath);

  try {
    return resolvePath__default['default'](rootPath, relativePath);
  } catch (e) {
    // Malicious or invalid. Just pass the path as-is.
    return relativePath;
  }
}

class CMake extends Bootstrap {
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
    if(!fs__default['default'].existsSync(path__default['default'].join(this.settings.build.path, "CMakeCache.txt"))) {
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
    let args = [];

    for (let [key, val] of definitions) {
      let argString = `${prefix}${key}`;

      if (typeof val === 'object' && val !== null) {
        if ( 'type' in val)
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
      ? fs__default['default'].existsSync(path__default['default'].join(this.settings.build.path, 'build.ninja'))
      : generator === 'ninja';

    if (hasNinja) {
      await checkNinjaInstalled();
      this.makeCommand = ninjaCommand;
      this.makeSubCommand = null;
      return;
    }

    // Makefiles
    // test for 'Unix Makefiles', 'MinGW Makefiles', etc.
    let hasMake = fromCache
      ? fs__default['default'].existsSync(path__default['default'].join(this.settings.build.path, 'Makefile'))
      : generator.includes('makefiles');

    if (hasMake) {
      await checkMakeInstalled();
      this.makeCommand = makeCommand;
      this.makeSubCommand = null;
      return;
    }

    // MSBuild
    // test for 'Visual Studio 14', etc.
    let hasVS = fromCache
      ? (glob__default['default'].sync("*.sln", { cwd: this.settings.build.path }).length > 0)
      : generator.includes('visual studio ');

    if (hasVS) {
      await checkMSBuildInstalled();
      this.makeCommand = msbuildCommand;
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
      args = args.concat([`-DCMAKE_MAKE_PROGRAM="${this.makeCommand}"`]);

    await emsdk__default['default'].run(this.configCommand,
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
    await emsdk__default['default'].run(this.makeCommand, args,
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
    let result = shelljs__default['default'].mkdir('-p', this.settings.build.path);
    if (result.code !== 0)
      throw new Error(result.stderr);
  }

  async _bindConfigCommand(impl, ...args) {
    // Throws error if CMake is not installed.
    await checkCMakeInstalled();
    this.configSubCommand = cMakeCommand;

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
    await checkCMakeInstalled();
    this.configSubCommand = cMakeCommand;

    await this.__determineMake(!!this.settings.configure.generator);

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }
}

class Make extends Bootstrap {
  constructor(workingSettings) {
    super(workingSettings);

    this.makeCommand = 'emmake';
    this.makeSubCommand = makeCommand;

    this.__validateSettings();
  }

////////////////////////////////////////////////////////////////////////
// Config validation
////////////////////////////////////////////////////////////////////////

  __validateSettings() {
    this.__validateBuildSettings();
    this.__validateCleanSettings();
    this.__validateInstallSettings();
    this._validateEmsdkSettings();
  }

  __validateMakeSettings(stepKey, targetName = null) {
    if (!(stepKey in this.settings))
      this.settings[stepKey] = {};

    if (!('target' in this.settings[stepKey]))
      this.settings[stepKey].target = targetName;

    this._validateDefinitionSettings(this.settings[stepKey]);

    if (!this.settings[stepKey].arguments)
      this.settings[stepKey].arguments = [];
    else if (!Array.isArray(this.settings[stepKey].arguments))
      this.settings[stepKey].arguments = [this.settings[stepKey].arguments];
  }

  __validateBuildSettings() {
    if (!('build' in this.settings)
        || !('path' in this.settings.build))
      throw new RangeError('Build settings must have build.path set to your source directory (which contains Makefile).');
    else
      this.settings.build.path = TryResolvePath(this.settings.build.path, this.settings.configPath);
    
    this.__validateMakeSettings('build', null);
  }

  __validateCleanSettings() {
    this.__validateMakeSettings('clean', 'clean');
  }

  __validateInstallSettings() {
    this.__validateMakeSettings('install', 'install');
  }

////////////////////////////////////////////////////////////////////////
// Implementation Helpers
////////////////////////////////////////////////////////////////////////

  __buildDefinitions(definitions) {
    const prefix = '';
    let args = [];

    for (let [key, val] of definitions) {
      let argString = `${prefix}${key}`;

      if (typeof val === 'object' && val !== null) {

        // if this object conforms to our format ({type:'...', value: '...'}), then convert to string
        // else, stringify the entire object on routine end
        if ('value' in val)
          val = val.value;
      }

      if (typeof val === 'string')
        val = val.replace('"', '\"');
      
      // interpret "true"/"false" as "1"/"0"
      if (val === true)
        val = "1";
      else if (val === false)
        val = "0";
        
      // "null" means push the key without a definition
      if (val === null)
        args.push(`"${argString}"`);
      // stringify everything else
      else
        args.push(`"${argString.concat(`=${val}`)}"`);
    }

    return args;
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    // Nothing to do, make is not configurable
  }

  async __make(stepSettings) {
    // build args
    let defs = this.__buildDefinitions(stepSettings.definitions);
    let args;
    if (stepSettings.target)
      args = [this.makeSubCommand, stepSettings.target, ...stepSettings.arguments, ...defs];
    else
      args = [this.makeSubCommand, ...stepSettings.arguments, ...defs];

    // Make is called on the "build" path specifically.
    await emsdk__default['default'].run(this.makeCommand, args,
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

class Autotools extends Bootstrap {
  constructor(workingSettings) {
    super(workingSettings);

    this.configCommand = 'emconfigure';
    this.configSubCommand = 'configure';

    this.makeCommand = 'emmake';
    this.makeSubCommand = makeCommand;

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
      throw new RangeError('Configure settings must have configure.path set to your source directory (which contains ./configure).');
    else
      this.settings.configure.path = TryResolvePath(this.settings.configure.path, this.settings.configPath);

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
// Implementation Helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs__default['default'].existsSync(path__default['default'].join(this.settings.build.path, "Makefile")))
      await this._bindConfigCommand(this._configure);
  }

  __buildConfigureArguments() {
    let args = [
      `--prefix="${this.settings.install.path}"`,
    ];

    if (this.settings.install.binaryPath)
      args.push(`--bindir="${this.settings.install.binaryPath}"`);

    if (this.settings.install.libraryPath)
      args.push(`--libdir="${this.settings.install.libraryPath}"`);

    if (this.settings.install.includePath)
      args.push(`--includedir="${this.settings.install.includePath}"`);

    args.push(...this.settings.configure.arguments);

    return args;
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    let args = this.__buildConfigureArguments();
    let configSubCommand = path__default['default'].join(this.settings.configure.path, this.configSubCommand);

    await emsdk__default['default'].run(this.configCommand,
      [`"${configSubCommand}"`, ...args],
      {cwd: this.settings.build.path, shell: (process.platform === 'win32')}
    );
  }

  async __make(stepSettings) {
    // Make sure everything's configured before building.
    await this.__ensureConfigure();

    // build args
    let args;
    if (stepSettings.target)
      args = [this.makeSubCommand, stepSettings.target, ...stepSettings.arguments];
    else
      args = [this.makeSubCommand, ...stepSettings.arguments];

    // Make is invoked on the "build" path specifically.
    await emsdk__default['default'].run(this.makeCommand, args,
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
    let result = shelljs__default['default'].mkdir('-p', this.settings.build.path);
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

function _constructMasterConfig(buildFilePath) {
  // buildFilePath is assumed to be an exact path to CMakeLists.txt/configure/Makefile
  let testPath = buildFilePath.toLowerCase();
  let config = {};

  if (testPath.includes('cmake'))
    config.type = 'cmake';
  else if (testPath.includes('configure'))
    config.type = 'autotools';
  else if (testPath.includes('makefile'))
    config.type = 'make';
  else
    throw new Error(`Unknown build file type: ${buildFilePath}`);

  
  let buildFileDir = path__default['default'].dirname(buildFilePath);

  switch (config.type) {
    case 'make':
      config.build = {
        path: buildFileDir
      };
      break;

    default:
      config.configure = {
        path: buildFileDir
      };
      break;
  }

  // Mimic traditional build tools where CWD stands for the staging area
  // where builds are cached.
  config.configPath = process.cwd();

  // We use the _retrieved key to mark for retrieval later
  return {_retrieved: config, default: '_retrieved'};
}

async function _retrieveMasterConfigFile(filePath, configLocator) {
  // "default" refers to ECMAScript import property
  let masterConfig = (await Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(filePath)); })).default;
  masterConfig['_configPath'] = path__default['default'].dirname(filePath);

  // Test: Is configLocator a valid key?
  if (typeof masterConfig[configLocator] === 'object')
    masterConfig.default = configLocator; // mark for retrieval later
  else if (!('default' in masterConfig)) {
    // If there's only one config inside, set it as default
    let configKeys = Object.keys(masterConfig).filter(key => masterConfig[key] instanceof Object);
    if (configKeys.length === 1)
      masterConfig.default = configKeys[0];
  }

  return masterConfig;
}

async function _getMasterConfig(configLocator) {
  // configLocator can be one of:
  // 1. The name of a config listed in `emscripten.settings.js`
  // 2. A path to a folder that contains `emscripten.settings.js`, `CMakeLists.txt`, `./configure`, or `Makefile`
  // 3. A path directly to one of the above files
  // 4. A config object

  // If null, don't search
  if (configLocator === null)
    return {};

  const mainScriptDir = MainModuleDir();

  let dirSearchSet;
  let testPath = path__default['default'].resolve(configLocator);
  if (IsDir(testPath))
    // if testPath is a valid dir, then search only this path
    // When configLocator is a dir, we only resolve it to CWD.
    dirSearchSet = [testPath];
  else
    // Search both module root (an approximation) and CWD
    // because we can't reliably get the main module. We do this to
    // research the config/build files in both locations.
    dirSearchSet = [mainScriptDir, process.cwd()];

  for (let dirPath of dirSearchSet) {
    let locatorTestPath = TryResolvePath(configLocator, dirPath);

    // Define our file search
    let fileSearchSet;
    if (IsFile(locatorTestPath))
      fileSearchSet = [locatorTestPath];
    else
      fileSearchSet = ['emscripten.settings.js', 'CMakeLists.txt',
        'configure', 'Makefile', 'makefile']
        .map(val => path__default['default'].join(dirPath, val));
    
    // Search for build/config files
    for (let filePath of fileSearchSet) {
      if (fs__default['default'].existsSync(filePath)) {
        if (filePath.includes('emscripten.settings.js'))
          return await _retrieveMasterConfigFile(filePath, configLocator);
        else
          return _constructMasterConfig(filePath);
      }
    }
  }

  throw new RangeError(`Could not find config from locator: ${configLocator}`);
}

/**
 * Get config to pass to Bootstrap object.
 * @param {string} [configLocator] - A name to a config listed in `emscripten.settings.js`, or a path to a folder containing CMake/Autotools/Makefile configs, or a configuration object.
 * @param {object} [settingsFragment] - An object fragment to merge to the selected config. Not valid if `configLocator` is an object.
 */
async function GetWorkingConfig(a, b) {
  // Master config format:
  //
  // {
  //   emsdk: "/path/to/emsdk",
  //   emsdkVersion: "latest",
  //   default: "named_config",
  //   named_config: {
  //     type: "cmake",
  //     /* ... */
  //   },
  //   other_named_config: { /* ... */ }
  // }
  //
  // Our goal is to get the correct base config (e.g., above "named_config")
  // and merge any changes from settingsFragment.

  // Parse arguments
  let configLocator = null;
  let settingsFragment = {};
  let args = Array.from(arguments).filter(el => (typeof el !== 'undefined' && el !== null));

  switch (args.length) {
    case 0:
      // No args means search <cwd> for config/build file
      configLocator = process.cwd();
      break;
  
    case 1:
      if (typeof args[0] === 'string')
        configLocator = args[0] || (configLocator || process.cwd());
      else
        // Don't default configLocator to process.cwd(); the intent
        // is to use settingsFragment as the sole config.
        settingsFragment = args[0] || settingsFragment;
      break;
  
    case 2:
    default:
      if (typeof args[0] === 'string') {
        // Don't default to process.cwd(); the intent is to explicitly
        // set configLocator. If null, then settingsFragment shall be
        // the sole config.
        configLocator = args[0] || configLocator;
        settingsFragment = args[1] || settingsFragment;
      } else
        // second arg is invalid, warn user
        throw new RangeError('Second argument (`settingsFragment`) is invalid if the first argument is also an object.');
      break;
  }

  // Get configs to process. Returns immediately if configLocator === null
  let masterConfig = await _getMasterConfig(configLocator);
  let workingSettings = {};

  // If EMSDK variables are top-level, make note of those then remove
  let emsdkPath = null;
  let emsdkVersion = null;
  let configPath = process.cwd();

  if ('emsdk' in masterConfig) {
    emsdkPath = masterConfig.emsdk;
    delete masterConfig.emsdk;
  }

  if ('emsdkVersion' in masterConfig) {
    emsdkVersion = masterConfig.emsdkVersion;
    delete masterConfig.emsdkVersion;
  }

  if ('_configPath' in masterConfig) {
    configPath = masterConfig._configPath;
    delete masterConfig._configPath;
  }

  // At this point, we expect masterConfig.default to be populated because:
  //     * either the author set it, or
  //     * we set it ourselves when constructing a config from a build file, or
  //     * we set it ourselves when we found the configLocator as a named key in the masterConfig, or
  //     * we set it ourselves when there's only one config inside the masterConfig
  if ('default' in masterConfig) {
    if (typeof masterConfig.default === 'string') {
      if (masterConfig.default in masterConfig)
        workingSettings = masterConfig[masterConfig.default];
      else
        throw new RangeError(`Requested base config "${masterConfig.default}" was not found in master config.`);
    }
    delete masterConfig.default;
  }
  
  // Else, determine finalConfig from keys
  let keys = Object.keys(masterConfig);

  if (!keys.length && (typeof settingsFragment === 'object')) {
    // If the master config is empty, but the user specified a config fragment,
    // then the fragment becomes our working config.
    workingSettings = settingsFragment;
  }

  if (!workingSettings || !Object.keys(workingSettings).length)
    throw new RangeError('Cannot determine base config to use. Specify "configLocator" parameter or set "default" name in the master config.');

  // Merge settingsFragment into workingSettings
  if (!workingSettings === settingsFragment)
    mergeWith__default['default'](workingSettings, settingsFragment, function(objValue, srcValue) {
      // Overwrite arrays, don't merge them
      if (Array.isArray(objValue))
        return srcValue;
      // Else, merge by default behavior (recursive for objects, assignment for other types)
    });

  // A config object must have a build type.
  // This also catches empty configs.
  if (!('type' in workingSettings))
    throw new RangeError(`Working config does not have a valid build type. Specify "type": <"make"|"autotools"|"cmake"> in the base config.`);

  // Move EMSDK variables to working config, unless the working config already has them
  if (emsdkPath && !('emsdk' in workingSettings))
    workingSettings.emsdk = emsdkPath;

  if (emsdkVersion && !('emsdkVersion' in workingSettings))
    workingSettings.emsdkVersion = emsdkVersion;

  if (configPath && !('_configPath' in workingSettings))
    workingSettings.configPath = configPath;

  return workingSettings;
}

async function _getBootstrap(a, b) {
  let workingSettings = await GetWorkingConfig(a, b);

  let bootstrap;
  switch (workingSettings.type.toLowerCase()) {
    case 'make':
      bootstrap = new Make(workingSettings);
      break;
    
    case 'autotools':
      bootstrap = new Autotools(workingSettings);
      break;
    
    case 'cmake':
      bootstrap = new CMake(workingSettings);
      break;
  }

  return bootstrap;
}

async function _callAction(actionName, a, b, ...args) {
  const bootstrap = await _getBootstrap(a, b);

  return bootstrap[actionName](...args);
}

/**
 * Configure the C/C++ project. Invokes CMake, `./configure`, etc.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function configure(a, b) {
  return _callAction('configure', a, b);
}

/**
 * Build the C/C++ project. Also configure the project if necessary. Invokes Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function build(a, b) {
  return _callAction('build', a, b);
}

/**
 * Clean the C/C++ project. Invokes the "clean" target on Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function clean(a, b) {
  return _callAction('clean', a, b);
}

/**
 * Install the C/C++ project. Invokes the "install" target on Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function install(a, b) {
  return _callAction('install', a, b);
}

/**
 * Clean then configure the C/C++ project.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function reconfigure(a, b) {
  return _callAction('reconfigure', a, b);
}

/**
 * Clean, configure, then build the C/C++ project.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function rebuild(a, b) {
  return _callAction('rebuild', a, b);
}

/**
 * Build the C/C++ project. If the build fails, then clean, configure, and rebuild.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function compile(a, b) {
  return _callAction('compile', a, b);
}

/**
 * Install the given EMSDK version as specified in the config.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
async function installSDK(a, b) {
  const bootstrap = _getBootstrap(a, b);
  let version = 'latest';

  if (('emsdkVersion' in bootstrap.config)
        && !!bootstrap.config.emsdkVersion)
    version = bootstrap.config.emsdkVersion;

  await InstallEmSDK(version);

  return bootstrap;
}

/**
 * Run an arbitrary command within the EMSDK environment.
 * @param {string} command - The executable name of the command.
 * @param {string[]} [args=[]] - Command line arguments
 * @param {object} [opts={}] - Options to pass to child_process.spawn()
 */
async function run(command, args = [], opts = {}) {
  await ActivateEmSDK();
  return emsdk__default['default'].run(command, args, opts);
}

var emscripten = /*#__PURE__*/Object.freeze({
  __proto__: null,
  configure: configure,
  build: build,
  clean: clean,
  install: install,
  reconfigure: reconfigure,
  rebuild: rebuild,
  compile: compile,
  installSDK: installSDK,
  run: run,
  forceEmSDKUpdates: ForceEmSDKUpdates,
  disableEmSDKUpdates: DisableEmSDKUpdates,
  resetEmSDKUpdates: ResetEmSDKUpdates
});

async function main(argv) {
  let args = argv.slice(2);

  let firstCmd = true;
  let cmd = args.shift();

  if (typeof cmd === 'string')
    cmd = cmd.toLowerCase();

  // Check for unspecified commands.
  if (!cmd
    // Run cmd requires at least one parameter
    || (!args.length && (cmd === 'run'))
    || cmd === '--help' || cmd === '-h' || cmd === '-?' || cmd === 'help'
  )
    throw new RangeError(`
emscripten-build

Build Usage: 

emscripten --configure [--no-update] [config_locator]

    Configure the project.

emscripten --build [--no-update] [config_locator]

    Build the project and configure it first if necessary.

emscripten --clean [--no-update] [config_locator]

    Reset the project's build directories.

emscripten --install [--no-update] [config_locator]

    Install the project's build files per the Makefile target.

emscripten --reconfigure [--no-update] [config_locator]

    Clean the project then configure it.

emscripten --rebuild [--no-update] [config_locator]

    Clean the project, configure it, then build.

emscripten --compile [--no-update] [config_locator]

    Build the project. If the build fails, the project is cleaned then
    a rebuild is attempted.

emscripten --installSDK [--no-update] [config_locator]

    Install the given EMSDK version into the given path, per the build
    settings.

Specify --no-update to skip updating the Emscripten SDK. By default,
this command will check for updates on every call.

A [config_locator] is the path to a settings or build configuration; or
the path to a directory containing such a file; or the name of a
settings object listed in "emscripten.settings.js". Default: "<cwd>"

Each command can be chained left-to-right with the same configuration.
For example, this builds and installs the given project without
updating the SDK:

    emscripten --build --install --no-update [config_locator]

------------------------------------------------------------------------

Emscripten SDK Usage:

emscripten run <command> [arg...]
emscripten <command> [arg...]

    Runs an arbitrary command within the context of the Emscripten SDK
    environment. Forces the "latest" SDK version. This command cannot be
    chained.
`.trimLeft());

  let configLocator = null;
  let bootstrap;

  do {
    // Check for standard command.
    let verbs = ['configure','build','clean',
      'reconfigure','rebuild','compile', 'install', 'installsdk'];
    
    let verbCmd = cmd.toLowerCase().replace(/^-{2}/g, '');

    // Verbs start with --, but OPTIONALLY the first verb can omit the --
    // for consistency with node-gyp.
    if ((cmd.startsWith('--') || firstCmd)
        && verbs.indexOf(verbCmd) >= 0
    ) {
      if (firstCmd) {
        // Now that we know we're running build settings, handle --no-update
        let noUpdate = args.findIndex(item => '--no-update' === item.toLowerCase());
        if (noUpdate >= 0) {
          args.splice(noUpdate, 1);
          DisableEmSDKUpdates();
        }

        // Get the configLocator at the end of the cmd string. This never
        // starts with --
        if (args.length) {
          let test = args[args.length-1];
          if (!test.startsWith('--'))
            configLocator = args.pop();
        }
      }

      // installSDK is not a bootstrap verb itself, but it does return
      // a bootstrap.
      if (verbCmd === 'installsdk')
        bootstrap = await installSDK(configLocator);
      else if (firstCmd)
        bootstrap = await emscripten[verbCmd](configLocator);
      else
        bootstrap = await bootstrap[verbCmd]();

      // Chain next command
      firstCmd = false;
      continue;
    } else if (firstCmd) {
      // Run an arbitrary command
      if (verbCmd === 'run')
        cmd = args.shift();

      return run(cmd, args,
        { shell: (process.platform === 'win32') }
      );
    } else
      throw new RangeError(`Invalid argument: ${cmd}`);
  } while((cmd = args.shift()) && typeof cmd === 'string');
}

main(process.argv)
.then(_ => process.exit(0))
.catch(err => {
  console.error(err.message);
  process.exit(1);
});
