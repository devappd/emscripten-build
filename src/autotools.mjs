import Bootstrap from './bootstrap.mjs';
import emsdk from 'emscripten-sdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';
import { TryResolvePath } from './utils.mjs';
import path from 'path';
import fs from 'fs';

export default class Autotools extends Bootstrap {
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
    if(!fs.existsSync(path.join(this.settings.build.path, "Makefile")))
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
    let configSubCommand = path.join(this.settings.configure.path, this.configSubCommand);

    await emsdk.run(this.configCommand,
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
    fs.mkdirSync(this.settings.build.path, { recursive: true });
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
