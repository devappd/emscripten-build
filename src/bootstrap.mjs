import { ActivateEmSDK } from './activate.mjs';
import emsdk from 'emsdk-npm';

export default class Bootstrap {
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
    await emsdk.run(command, args, opts);
    return this;
  }
}
