'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var emsdk = require('emsdk-npm');
var path = require('path');
var getInstalledPathCJS = require('get-installed-path');
var os = require('os');
var which = require('which');
var glob = require('glob');
var fs$1 = require('fs');
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
var which__default = /*#__PURE__*/_interopDefaultLegacy(which);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs$1);
var shelljs__default = /*#__PURE__*/_interopDefaultLegacy(shelljs);
var resolvePath__default = /*#__PURE__*/_interopDefaultLegacy(resolvePath);
var mergeWith__default = /*#__PURE__*/_interopDefaultLegacy(mergeWith);

// activate.js

let _installed = [];
let _active = null;

async function ActivateEmSDK(version = 'latest') {
  if (_active === version)
    return;

  // Update and install if we haven't yet activated `version` in this
  // runtime session.
  // This does not "reinstall" a version forcibly, as it checks whether
  // the version files already exist.
  if (!_installed.includes(version)) {
    await emsdk__default['default'].update();
    await emsdk__default['default'].install(version);
    _installed.push(version);
  }
  
  // Switch to `version`.
  // Note we cannot have more than one version activated at the same time.
  await emsdk__default['default'].activate(version);
  _active = version;
}

class Bootstrap {
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
    // in this.config
    await ActivateEmSDK(this.config.emsdkVersion);
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

  if (!fs.existsSync(msbuildPath))
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
    ninjaPath = os__default['default'].path.join(ninjaPath, 'binaries', 'ninja-win.exe');
  else if (os__default['default'].platform() === 'darwin')
    ninjaPath = os__default['default'].path.join(ninjaPath, 'binaries', 'ninja-mac');
  else if (os__default['default'].platform() === 'linux' || os__default['default'].platform() === 'cygwin')
    ninjaPath = os__default['default'].path.join(ninjaPath, 'binaries', 'ninja-linux');
  else
    throw new Error(`ninja was not found for your platform (${os__default['default'].platform()}!`);

  if (!fs.existsSync(ninjaPath))
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
      this.config.configure.path = TryResolvePath(this.config.configure.path, this.config._configPath);

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
// Implementation helpers
////////////////////////////////////////////////////////////////////////

  async __ensureConfigure() {
    if(!fs__default['default'].existsSync(path__default['default'].join(this.config.build.path, "CMakeCache.txt"))) {
      await this._bindConfigCommand(this._configure);
      // make sure to reload the make variables after configuring
      await this.__determineMake(!!this.config.configure.generator);
    }
  }

  __buildConfigureArguments() {
    let args = [
      this.config.configure.path,
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
      ? fs__default['default'].existsSync(path__default['default'].join(this.config.build.path, 'build.ninja'))
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
      ? fs__default['default'].existsSync(path__default['default'].join(this.config.build.path, 'Makefile'))
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
      ? (glob__default['default'].sync("*.sln", { cwd: this.config.build.path }).length > 0)
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
      [this.configSubCommand, ...args],
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
    await emsdk__default['default'].run(this.makeCommand, args,
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
    let result = shelljs__default['default'].mkdir('-p', this.config.build.path);
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
    await this.__determineMake(!!this.config.configure.generator);
    
    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }

  async _bindConfigMakeCommand(impl, ...args) {
    // Check both config and build commands
    await checkCMakeInstalled();
    this.configSubCommand = cMakeCommand;

    await this.__determineMake(!!this.config.configure.generator);

    this.__ensureBuildDirExists();

    return this._bindCommand(impl, ...args);
  }
}

class Make extends Bootstrap {
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
      this.config.build.path = TryResolvePath(this.config.build.path, this.config._configPath);
    
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
    await emsdk__default['default'].run(this.makeCommand, args,
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

class Autotools extends Bootstrap {
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
    try {
      await fs.lstat(path__default['default'].join(this.config.build.path, "Makefile"));
    }
    catch (e) {
      await this._bindConfigCommand(this._configure);
    }
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
    let configSubCommand = path__default['default'].join(this.config.configure.path, this.configSubCommand);

    await emsdk__default['default'].run(this.configCommand,
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
    await emsdk__default['default'].run(this.makeCommand, args,
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
    let result = shelljs__default['default'].mkdir('-p', this.config.build.path);
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

  switch (config.type) {
    case 'make':
      config.build = {
        path: path__default['default'].dirname(buildFilePath)
      };
      break;

    default:
      config.configure = {
        path: path__default['default'].dirname(buildFilePath)
      };
      break;
  }

  // We use the _retrieved key to mark for retrieval later
  return {_retrieved: config};
}

async function _getMasterConfig(configLocator) {
  // configLocator can be one of:
  // 1. The name of a config listed in `emscripten.config.js`
  // 2. A path to a folder that contains `CMakeLists.txt`, `./configure`, or `Makefile`
  // 3. A path directly to one of the above files

  let masterConfig = null;
  const mainScriptDir = MainModuleDir();

  // 1. Search for `emscripten.config.js` first. If configLocator is a valid name, then
  // we break there.

  // Because we can't reliably get the main module,
  // hack things and search CWD for our config
  const searchSet = [mainScriptDir, process.cwd()];

  for (const searchPath of searchSet) {
    // Try our JSON config
    const buildConfigPath = path__default['default'].join(searchPath, 'emscripten.config.js');
    

    if(fs__default['default'].existsSync(buildConfigPath)) {
      masterConfig = (await Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(buildConfigPath)); })).default;
      masterConfig['_configPath'] = searchPath;
      
      // Test: Did we retrieve masterConfig? Is configLocator empty?
      if(!(typeof configLocator === 'string'))
        return masterConfig;

      // Test: Is configLocator a valid key?
      if (typeof masterConfig[configLocator] === 'object') {
        masterConfig.default = configLocator; // mark for retrieval
        return masterConfig; // we retrieve the configLocator object later
      }
    }

    // configLocator must be a non-empty string for the next tests
    if (!(typeof configLocator === 'string')
        || !configLocator)
      continue;

    // Test: Is configLocator a path to a directory? Search for build files
    let testPath = TryResolvePath(configLocator, searchPath);
    let searchFiles = ['CMakeLists.txt', 'configure', 'Makefile', 'makefile'];

    if (IsDir(testPath)) {  
      for (let fileName of searchFiles) {
        if (IsFile(path__default['default'].join(testPath, fileName))) {
          let config = _constructMasterConfig(path__default['default'].join(testPath, fileName));
          config.default = '_retrieved'; // mark for retrieval
          return config;
        }
      }
    }

    // Test: Is configLocator an exact path to one of the searchFiles?
    if (IsFile(testPath)) {
      for (let fileName of searchFiles) {
        if (testPath.includes(fileName)) {
          let config = _constructMasterConfig(testPath);
          config.default = '_retrieved'; // mark for retrieval
          return config;
        }
      }
    }
  }

  // Return an empty object
  return {};
}

/**
 * Get config to pass to Bootstrap object.
 * @param {string} [configLocator] - A name to a config listed in `emscripten.config.js`, or a path to a folder containing CMake/Autotools/Makefile configs, or a configuration object.
 * @param {object} [configFragment] - An object fragment to merge to the selected config. Not valid if `configLocator` is an object.
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
  // and merge any changes from configFragment.

  // Parse arguments
  let configLocator = null;
  let configFragment = {};
  let args = Array.from(arguments).filter(el => (typeof el !== 'undefined'));

  switch (args.length) {
    case 0:
      break;
  
    case 1:
      if (typeof args[0] === 'string')
        configLocator = args[0] || configLocator;
      else
        configFragment = args[0] || configFragment;
      break;
  
    case 2:
    default:
      configLocator = args[0] || configLocator;
      configFragment = args[1] || configFragment;
      break;
  }

  // Get configs to process
  let masterConfig = await _getMasterConfig(configLocator);
  let workingConfig = {};

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

  // If config declares a default base config, then retrieve the base config.
  // If configLocator pointed to a config in _getMasterConfig(), we also
  // populate this "default" variable to update the configLocator.
  if ('default' in masterConfig) {
    if (typeof masterConfig.default === 'string')
      configLocator = masterConfig.default;
    delete masterConfig.default;
  }

  if (configLocator) {
    if (configLocator in masterConfig)
      workingConfig = masterConfig[configLocator];
    else
      throw new RangeError(`Requested base config "${configLocator}" was not found in master config.`);
  }
  
  // Else, determine finalConfig from keys
  let keys = Object.keys(masterConfig);

  if (keys.length === 1) {
    // If there's only one key, we have our sub-config
    configLocator = keys[0]; // for re-use
    workingConfig = masterConfig[configLocator];
  } else if (!keys.length && (typeof configFragment === 'object')) {
    // If the master config is empty, but the user specified a config fragment,
    // then the fragment becomes our working config.
    workingConfig = configFragment;
  } else
    throw new RangeError(`Cannot determine base config to use. Specify "configKey" parameter or set "default" name in the master config.`);

  // Merge appendConfig into finalConfig
  if (!workingConfig === configFragment)
    mergeWith__default['default'](workingConfig, configFragment, function(objValue, srcValue) {
      // Overwrite arrays, don't merge them
      if (Array.isArray(objValue))
        return srcValue;
      // Else, merge by default behavior (recursive for objects, assignment for other types)
    });

  // A config object must have a build type.
  // This also catches empty configs.
  if (!('type' in workingConfig))
    throw new RangeError(`Base config ${configLocator} does not have a valid build type. Specify "type": <"make"|"autotools"|"cmake"> in the base config.`);

  // Move EMSDK variables to final config, unless the final config already has them
  if (emsdkPath && !('emsdk' in workingConfig))
    workingConfig.emsdk = emsdkPath;

  if (emsdkVersion && !('emsdkVersion' in workingConfig))
    workingConfig.emsdkVersion = emsdkVersion;

  if (configPath && !('_configPath' in workingConfig))
    workingConfig.configPath = configPath;

  return workingConfig;
}

async function _callAction(actionName, a, b) {
  let workingConfig = await GetWorkingConfig(a, b);

  let bootstrap;
  switch (workingConfig.type.toLowerCase()) {
    case 'make':
      bootstrap = new Make(workingConfig);
      break;
    
    case 'autotools':
      bootstrap = new Autotools(workingConfig);
      break;
    
    case 'cmake':
      bootstrap = new CMake(workingConfig);
      break;
  }

  return bootstrap[actionName]();
}

/**
 * Configure the C/C++ project with a given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function configure(a, b) {
  return _callAction('configure', a, b);
}

/**
 * Build the C/C++ project with a given config. Also configure the project if necessary.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function build(a, b) {
  return _callAction('build', a, b);
}

/**
 * Clean the C/C++ project with a given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function clean(a, b) {
  return _callAction('clean', a, b);
}

/**
 * Install the C/C++ project with a given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function install(a, b) {
  return _callAction('install', a, b);
}

/**
 * Clean then configure the C/C++ project with a given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function reconfigure(a, b) {
  return _callAction('reconfigure', a, b);
}

/**
 * Clean, configure, then build the C/C++ project with a given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function rebuild(a, b) {
  return _callAction('rebuild', a, b);
}

/**
 * Build the C/C++ project with a given config. If the build fails, then clean, configure, and rebuild.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function compile(a, b) {
  return _callAction('compile', a, b);
}

/**
 * Install the given EMSDK version from the given config.
 * @param {string} [configLocator] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function installSDK(a, b) {
  throw new Error('emscripten-build::install() is not yet implemented.');

  // let workingConfig = GetWorkingConfig(a, b);
  
  // if (workingConfig) {
  //   // Do emsdk and emsdkVersion exist in this object?
  //   // Retrieve defaults then ActivateEmSDK(version, path)
  // }
}

/**
 * Run an arbitrary command within the EMSDK environment.
 * @param {string} command - The executable name of the command.
 * @param {string[]} [args=[]] - Command line arguments
 * @param {object} [opts=[]] - Options to pass to child_process.spawn()
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
