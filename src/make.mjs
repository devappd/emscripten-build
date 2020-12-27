import Bootstrap from './bootstrap.mjs';
import emsdk from 'emsdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';
import { TryResolvePath } from './utils.mjs';

export default class Make extends Bootstrap {
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
