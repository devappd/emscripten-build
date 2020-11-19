import Bootstrap from './bootstrap.mjs';
import path from 'path';
import * as environment from './environment.mjs';
import glob from 'glob';
import fs from 'fs';
import emsdk from 'emsdk-npm';
import shelljs from 'shelljs';

// https://github.com/tapjs/libtap/pull/21/files
function _mainScript(defaultName) {
  if (typeof repl !== 'undefined' || '_eval' in process) {
    return defaultName
  }

  return process.argv[1] || defaultName
}

// https://stackoverflow.com/a/53530146
function _isDir(path) {
  try {
      var stat = fs.lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      return false;
  }
}

export default class CMake extends Bootstrap {
  constructor(configDir, cacheDir, options = null) {
    // two-args: (configDir, options)
    if (options === null) {
      options = cacheDir;

      // cacheDir defaults to build/ relative to the
      // main script or to the CWD if interactive shell.
      let mainScriptDir = path.resolve(_mainScript('.'));
      if (!_isDir(path))
        mainScriptDir = path.dirname(mainScriptDir);
      cacheDir = path.join(mainScriptDir, 'build');
    }

    let cleanDirs = [cacheDir];

    super(configDir, cacheDir, cleanDirs, options);

    this.configCommand = 'emcmake';
    this.configSubCommand = 'cmake';
  }

  async __ensureConfigure() {
    if(!fs.existsSync(path.join(this.makeDir, "CMakeCache.txt"))) {
      await this.__configure();
      // make sure to reload the make variables after configuring
      await this.__determineMakeFromCache();
    }
  }

  // Populate this.makeCommand from options so we can configure CMake
  // with the correct make toolset.
  async __determineMakeFromOptions(options) {
    // Populate this.makeCommand instead of this.makeSubCommand
    // because we call these executables directly
    // instead of thru an emsdk script.

    let args = this._processOptions(options);

    // Ninja
    let hasNinja = (args.filter(x => {
      let test = x.toLowerCase();
      // test for 'Ninja' and '-G"Ninja"'
      return (test === 'ninja' || (test.includes('ninja') && test.startsWith('-g')));
    }).length > 0);

    if (hasNinja) {
      await environment.checkNinjaInstalled();
      this.makeCommand = environment.ninjaCommand;
      this.makeSubCommand = null;
      return;
    }

    // Makefiles
    // test for 'Unix Makefiles', 'MinGW Makefiles', etc.
    let hasMake = (args.filter(x => x.toLowerCase().includes('makefiles')).length > 0);

    if (hasMake) {
      await environment.checkMakeInstalled();
      this.makeCommand = environment.makeCommand;
      this.makeSubCommand = null;
      return;
    }

    // MSBuild
    // test for 'Visual Studio 14', etc.
    let hasVS = (args.filter(x => x.toLowerCase().includes('visual studio ')).length > 0);

    if (hasVS) {
      await environment.checkMSBuildInstalled();
      this.makeCommand = environment.msbuildCommand;
      this.makeSubCommand = null;
      return;
    }
  }

  // Populate this.makeCommand from a configured cache so we can use
  // the correct build toolset to make the project.
  async __determineMakeFromCache() {
    // Populate this.makeCommand instead of this.makeSubCommand
    // because we call these executables directly
    // instead of thru an emsdk script.

    // Ninja
    let hasNinja = fs.existsSync(path.join(this.makeDir, 'build.ninja'));

    if (hasNinja) {
      await environment.checkNinjaInstalled();
      this.makeCommand = environment.ninjaCommand;
      this.makeSubCommand = null;
      return;
    }

    // Makefiles
    let hasMake = fs.existsSync(path.join(this.makeDir, 'Makefile'));

    if (hasMake) {
      await environment.checkMakeInstalled();
      this.makeCommand = environment.makeCommand;
      this.makeSubCommand = null;
      return;
    }

    // MSBuild
    let hasVS = (glob.sync("*.sln", { cwd: this.makeDir }).length > 0);

    if (hasVS) {
      await environment.checkMSBuildInstalled();
      this.makeCommand = environment.msbuildCommand;
      this.makeSubCommand = null;
      return;
    }
  }

  __ensureMakeDirExists() {
    let result = shelljs.mkdir('-p', this.makeDir);
    if (result.code !== 0)
      throw new Error(result.stderr);
  }

  async __bindConfigCommand(ctx, impl, ...args) {
    // Throws error if CMake is not installed.
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    this.__ensureMakeDirExists();

    return super._bindCommand(ctx, impl, ...args);
  }

  async __bindMakeCommand(ctx, impl, ...args) {
    // Throws error if build command is not found.
    await this.__determineMakeFromCache();

    this.__ensureMakeDirExists();

    return super._bindCommand(ctx, impl, ...args);
  }

  async __bindCommand(ctx, impl, ...args) {
    // Check both config and build commands
    await environment.checkCMakeInstalled();
    this.configSubCommand = environment.cMakeCommand;

    await this.__determineMakeFromCache();

    this.__ensureMakeDirExists();

    return super._bindCommand(ctx, impl, ...args);
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async __configure(options) {
    options = this._processOptions(options);

    await this.__determineMakeFromOptions(options);

    if (this.makeCommand)
      options = options.concat([`-DCMAKE_MAKE_PROGRAM="${this.makeCommand}"`])

    await emsdk.run(this.configCommand,
      [this.configSubCommand, this.configDir, ...options],
      {cwd: this.makeDir, shell: (process.platform === 'win32')}
    );
  }

  async __build(target, options) {
    // one-arg: (options)
    if (target instanceof Object) {
      options = target;
      target = null;
    }

    // Make sure everything's configured before building
    await this.__ensureConfigure();

    // make options are not the same as configure options,
    // so do not default to those.
    options = options ? this._processOptions(options) : [];

    // build args
    // note we do not use this.makeSubCommand because
    // we call the makeCommand directly instead of thru
    // an emsdk script.
    let args;
    if (target)
      args = [target, ...options];
    else
      args = [...options];

    await emsdk.run(this.makeCommand, args,
      {cwd: this.makeDir, shell: (process.platform === 'win32')}
    );
  }

  async __reconfigure(options) {
    // Process options here so we can replace the
    // default ones.
    options = this._processOptions(options);
    await this.clean();
    await this.__configure(options);
    this.args = options;
  }

  async __rebuild(target, makeOptions) {
    await this.clean();
    await this.__build(target, makeOptions);
  }

  async __compile(target, makeOptions) {
    try {
      await this.__build(target, makeOptions);
    }
    catch (e) {
      console.log("Build has been failed, trying to do a full rebuild.");
      await this.__rebuild(target, makeOptions);
    }
  }

////////////////////////////////////////////////////////////////////////
// Bindings
////////////////////////////////////////////////////////////////////////

  async configure(options) {
    return this.__bindConfigCommand(this, this.__configure, options);
  }

  async build(target, options) {
    return this.__bindMakeCommand(this, this.__build, target, options);
  }

  async reconfigure(options) {
    return this.__bindConfigCommand(this, this.__reconfigure, options);
  }

  async rebuild(target, makeOptions) {
    return this.__bindCommand(this, this.__rebuild, target, makeOptions);
  }

  async compile(target, makeOptions) {
    return this.__bindCommand(this, this.__compile, target, makeOptions);
  }
}
