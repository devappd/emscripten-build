'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var emsdk = require('emsdk-npm');
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

let _installed = [];
let _active = null;

async function InstallEmSDK(version = 'latest') {
  // This does not "reinstall" a version forcibly, as it checks whether
  // the version files already exist.
  if (!_installed.includes(version)) {
    await emsdk__default['default'].update();
    await emsdk__default['default'].install(version);
    _installed.push(version);
  }
}

async function ActivateEmSDK(version = 'latest') {
  if (_active === version)
    return;

  // Update and install if we haven't yet activated `version` in this
  // runtime session.
  await InstallEmSDK(version);
  
  // Switch to `version`.
  // Note we cannot have more than one version activated at the same time.
  await emsdk__default['default'].activate(version);
  _active = version;
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

    let args = this.__buildConfigureArguments();

    if (this.makeCommand)
      args = args.concat([`-DCMAKE_MAKE_PROGRAM="${this.makeCommand}"`]);

    await emsdk__default['default'].run(this.configCommand,
      [`"${this.configSubCommand}"`, ...args],
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
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    // Nothing to do, make is not configurable
  }

  async __make(stepSettings) {
    // build args
    let args;
    if (stepSettings.target)
      args = [this.makeSubCommand, stepSettings.target, ...stepSettings.arguments];
    else
      args = [this.makeSubCommand, ...stepSettings.arguments];

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

async function _callAction(actionName, a, b) {
  const bootstrap = await _getBootstrap(a, b);

  return bootstrap[actionName]();
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

exports.build = build;
exports.clean = clean;
exports.compile = compile;
exports.configure = configure;
exports.install = install;
exports.installSDK = installSDK;
exports.rebuild = rebuild;
exports.reconfigure = reconfigure;
exports.run = run;
