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
    const processTypes = false;
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
