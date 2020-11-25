#!/usr/bin/env node
'use strict';

var emsdk = require('emsdk-npm');
var path$1 = require('path');
var shell = require('shelljs');
var fs$1 = require('fs');
var getInstalledPathCJS = require('get-installed-path');
var os = require('os');
var which = require('which');
var glob = require('glob');
var resolvePath = require('resolve-path');
var mergeWith = require('lodash.mergewith');
var JSONC = require('jsonc-parser');

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
var path__default = /*#__PURE__*/_interopDefaultLegacy(path$1);
var shell__default = /*#__PURE__*/_interopDefaultLegacy(shell);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs$1);
var getInstalledPathCJS__default = /*#__PURE__*/_interopDefaultLegacy(getInstalledPathCJS);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var which__default = /*#__PURE__*/_interopDefaultLegacy(which);
var glob__default = /*#__PURE__*/_interopDefaultLegacy(glob);
var resolvePath__default = /*#__PURE__*/_interopDefaultLegacy(resolvePath);
var mergeWith__default = /*#__PURE__*/_interopDefaultLegacy(mergeWith);
var JSONC__default = /*#__PURE__*/_interopDefaultLegacy(JSONC);

// activate.js

let _installed = [];
let _active = null;

function Activate(version = 'latest') {
  if (_active === version)
    return Promise.resolve();

  // Update and install if we haven't yet activated `version` in this
  // runtime session.
  // This does not "reinstall" a version forcibly.
  if (!_installed.includes(version))
    return emsdk__default['default'].update()
    .then(_ => emsdk__default['default'].install(version))
    .then(_ => {
      _installed.push(version);
      return emsdk__default['default'].activate(version);
    })
    .then(_ => { _active = version; });

  // Else, we're installed, but switching between activated versions.
  // Note we cannot have more than one version activated at the same time.
  else
    return emsdk__default['default'].activate(version)
    .then(_ => { _active = version; });
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
    let cleanDirs = [...this.config.clean.paths];

    if (cleanDirs.length < 1) {
      console.warn('bootstrap::clean() has no paths to clean up. Your build will not be cleaned!');
      return this;
    }

    for (const dir of cleanDirs) {
      if (!dir)
        continue;

      let rmDir = path__default['default'].resolve(dir);

      if (!fs__default['default'].lstatSync(rmDir).isDirectory()) {
        console.warn(`Dir ${rmDir} is not a directory. Skipping...`);
        continue;
      }

      console.log(`Cleaning dir ${rmDir}...`);

      try {
        shell__default['default'].rm('-rf', path__default['default'].join(rmDir, '*'));
      } catch(e) {
        console.warn(`Could not clean ${rmDir}`, e.message);
      }
    }

    return this;
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
    await Activate(this.config.emsdkVersion);
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

  // Subclasses should not need to implement this, but may do
  // so for special handling.
  async clean() {
    return this._clean();
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
    makeCommand = await which__default['default']('msbuild');
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
      this.config.configure.cachePath = path__default['default'].join(MainModuleDir(), 'build');
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
    if(!fs__default['default'].existsSync(path__default['default'].join(this.config.build.path, "CMakeCache.txt"))) {
      await this._bindConfigCommand(this._configure);
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
    await emsdk__default['default'].run(this.makeCommand, args,
      {cwd: this.config.build.path, shell: (process.platform === 'win32')}
    );
  }

////////////////////////////////////////////////////////////////////////
// Binding Helpers
////////////////////////////////////////////////////////////////////////

  __ensureMakeDirExists() {
    let result = shell__default['default'].mkdir('-p', this.config.build.path);
    if (result.code !== 0)
      throw new Error(result.stderr);
  }

  async _bindConfigCommand(impl, ...args) {
    // Throws error if CMake is not installed.
    await checkCMakeInstalled();
    this.configSubCommand = cMakeCommand;

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
    await checkCMakeInstalled();
    this.configSubCommand = cMakeCommand;

    await this.__determineMake(!!this.config.configure.generator);

    this.__ensureMakeDirExists();

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

    await emsdk__default['default'].run(this.makeCommand, args,
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

class Configure extends Bootstrap {
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
      await this._bindConfigCommand(this._configure);
    }
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async _configure() {
    await emsdk__default['default'].run(this.configCommand,
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

    await emsdk__default['default'].run(this.makeCommand, args,
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

function _getMasterConfig() {
  // Base configs are sourced from:
  // 1. <main_module>/emscripten.build.json(c)
  // 2. <main_module>/packages.json

  const mainScriptDir = MainModuleDir();

  // Because we can't reliably get the main module,
  // hack things and search CWD for our config
  const searchSet = [mainScriptDir, process.cwd()];

  for (const searchPath of searchSet) {
    // Try our JSON config
    const buildConfigPath = path__default['default'].join(searchPath, 'emscripten.build.json');
    let masterConfig = null;

    if(fs__default['default'].existsSync(buildConfigPath)) {
      masterConfig = JSON.parse(fs__default['default'].readFileSync(buildConfigPath, 'utf8'));
      masterConfig['_configPath'] = searchPath;
      return masterConfig;
    }

    // Same, but JSONC format
    const buildCConfigPath = path__default['default'].join(searchPath, 'emscripten.build.jsonc');

    if(fs__default['default'].existsSync(buildCConfigPath)) {
      masterConfig = JSONC__default['default'].parse(fs__default['default'].readFileSync(buildCConfigPath, 'utf8'));
      masterConfig['_configPath'] = searchPath;
      return masterConfig;
    }
    
    // Now try package.json
    // const packagePath = path.join(searchPath, 'package.json');

    // Node's ES6 module loader bugs out here, so dummy it out.
    // "Unexpected strict mode reserved word"
    // if(fs.existsSync(packagePath)) {
    //   const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    //   if ('emscriptenBuild' in package &&
    //     package.emscriptenBuild instanceof Object) {
    //     masterConfig = package.emscriptenBuild;
    //     masterConfig['_configPath'] = searchPath;
    //     return masterConfig;
    //   }
    // }
  }

  // Return an empty object
  return {};
}

/**
 * Get config to pass to Bootstrap object.
 * @param {string} [configName] - The name of a base config to use from your `emscripten.build.json` file.
 * @param {object} [configFragment] - An object fragment to merge to the base config.
 */
function GetWorkingConfig(a, b) {
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
  let baseConfigKey = null;
  let configFragment = {};

  switch (arguments.length) {
    case 0:
      break;
  
    case 1:
      if (typeof a === 'string')
        baseConfigKey = a || baseConfigKey;
      else
        configFragment = a || configFragment;
      break;
  
    case 2:
    default:
      baseConfigKey = a || baseConfigKey;
      configFragment = b || configFragment;
      break;
  }

  // Get configs to process
  let masterConfig = _getMasterConfig();
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
  // Don't overwrite input baseConfigKey.
  if ('default' in masterConfig) {
    if (!baseConfigKey && typeof masterConfig.default === 'string')
      baseConfigKey = masterConfig.default;
    delete masterConfig.default;
  }

  if (baseConfigKey) {
    if (baseConfigKey in masterConfig)
      workingConfig = masterConfig.configKey;
    else
      throw new RangeError(`Requested base config "${baseConfigKey}" was not found in master config.`);
  }
  
  // Else, determine finalConfig from keys
  let keys = Object.keys(masterConfig);

  if (keys.length === 1) {
    // If there's only one key, we have our sub-config
    baseConfigKey = keys[0]; // for re-use
    workingConfig = masterConfig[baseConfigKey];
  } else
    throw new RangeError(`Cannot determine base config to use. Specify "configKey" parameter or set "default" name in the master config.`);

  // Merge appendConfig into finalConfig
  mergeWith__default['default'](workingConfig, configFragment, function(objValue, srcValue) {
    // Overwrite arrays, don't merge them
    if (Array.isArray(objValue))
      return srcValue;
    // Else, merge by default behavior (recursive for objects, assignment for other types)
  });

  // A config object must have a build type.
  // This also catches empty configs.
  if (!('type' in workingConfig))
    throw new RangeError(`Base config ${baseConfigKey} does not have a valid build type. Specify "type": <"make"|"configure"|"cmake"> in the base config.`);

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
  let workingConfig = GetWorkingConfig(a, b);

  let bootstrap;
  switch (workingConfig.type.toLowerCase()) {
    case 'make':
      bootstrap = new Make(workingConfig);
      break;
    
    case 'configure':
      bootstrap = new Configure(workingConfig);
      break;
    
    case 'cmake':
      bootstrap = new CMake(workingConfig);
      break;
  }

  return bootstrap[actionName]();
}

/**
 * Configure the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function configure(a, b) {
  return _callAction('configure', a, b);
}

/**
 * Build the C/C++ project with a given config. Also configure the project if necessary.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function build(a, b) {
  return _callAction('build', a, b);
}

/**
 * Clean the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function clean(a, b) {
  return _callAction('clean', a, b);
}

/**
 * Clean then configure the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function reconfigure(a, b) {
  return _callAction('reconfigure', a, b);
}

/**
 * Clean, configure, then build the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function rebuild(a, b) {
  return _callAction('rebuild', a, b);
}

/**
 * Build the C/C++ project with a given config. If the build fails, then clean, configure, and rebuild.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function compile(a, b) {
  return _callAction('compile', a, b);
}

/**
 * Install the given EMSDK version from the given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
async function install(a, b) {
  throw new Error('emscripten-build::install() is not yet implemented.');

  // let workingConfig = GetWorkingConfig(a, b);
  
  // if (workingConfig) {
  //   // Do emsdk and emsdkVersion exist in this object?
  //   // Retrieve defaults then Activate(version, path)
  // }
}

/**
 * Run an arbitrary command within the EMSDK environment.
 * @param {string} command - The name of a sub-config to use from the base config.
 * @param {string[]} [args=[]] - Command line arguments
 * @param {object} [opts=[]] - Options to pass to child_process.spawn()
 */
async function run(command, args = [], opts = {}) {
  await Activate();
  return emsdk__default['default'].run(command, args, opts);
}

var emscripten = /*#__PURE__*/Object.freeze({
  __proto__: null,
  configure: configure,
  build: build,
  clean: clean,
  reconfigure: reconfigure,
  rebuild: rebuild,
  compile: compile,
  install: install,
  run: run
});

async function main(argv) {
  let args = argv.slice(2);
  let cmd = args.shift();

  if (typeof cmd === 'string')
    cmd = cmd.toLowerCase();

  // Valid invocations:
  //
  // emscripten configure [config_name]
  // emscripten build [config_name]
  // emscripten clean [config_name]
  // emscripten reconfigure [config_name]
  // emscripten rebuild [config_name]
  // emscripten compile [config_name]
  // emscripten install <version> [config_name]
  // emscripten run <command> [arg...]
  // emscripten <command> [arg...]

  // Check for unspecified commands.
  if (!cmd
    // Run cmd requires at least one parameter
    || (!args.length && (cmd === 'run'))
    || cmd === '--help' || cmd === '-h' || cmd === '-?' || cmd === 'help'
  )
    throw new RangeError(`
emscripten-build

Usage: 

emscripten configure [config_name]

    Configure the project.

emscripten build [config_name]

    Build the project and configure it first if necessary.

emscripten clean [config_name]

    Reset the project's build directories.

emscripten reconfigure [config_name]

    Clean the project then configure it.

emscripten rebuild [config_name]

    Clean the project, configure it, then build.

emscripten compile [config_name]

    Build the project. If the build fails, the project is cleaned then
    a rebuild is attempted.

emscripten install [config_name]

    Install the given EMSDK version into the given path. Path defaults
    to the user's NPM config.

emscripten run <command> [arg...]
emscripten <command> [arg...]

    Runs a given command within the context of the emsdk environment
    in the current node project.
`.trimLeft());

  // Call the standard commands
  let verbs = ['configure','build','clean',
    'reconfigure','rebuild','compile', 'install'];
  
  if (verbs.indexOf(cmd) >= 0) {
    let configKey = (args.length) ? args.shift() : null;
    return emscripten[cmd](configKey);
  }

  // Else, run an arbitrary command
  if (cmd === 'run')
    cmd = args.shift();

  return run(cmd, args,
    { shell: (process.platform === 'win32') }
  );
}

main(process.argv)
.then(_ => process.exit(0))
.catch(err => {
  console.error(err.message);
  process.exit(1);
});
