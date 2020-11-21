import mergeWith from 'lodash.mergewith';
import JSONC from 'jsonc-parser';
import path from 'path';
import fs from 'fs';

// https://github.com/tapjs/libtap/pull/21/files
function _mainScript(defaultName) {
  if (typeof repl !== 'undefined' || '_eval' in process) {
    return defaultName
  }

  return process.argv[1] || defaultName
}

function _mainModuleDir() {
  let mainScript = _mainScript('.');

  // Presume script path is <module>/src
  // \todo look for next highest package.json
  if (mainScript === '.')
    return path.resolve('.');
  else
    return path.resolve(path.dirname(mainScript));
}

function _getMasterConfig() {
  // Base configs are sourced from:
  // 1. <main_module>/emscripten.build.json(c)
  // 2. <main_module>/packages.json

  const mainScriptDir = _mainModuleDir();

  // Try our JSON config
  const buildConfigPath = path.join(mainScriptDir, 'emscripten.build.json');

  if(fs.existsSync(buildConfigPath))
    return JSON.parse(fs.readFileSync(buildConfigPath, 'utf8'));

  // Same, but JSONC format
  const buildCConfigPath = path.join(mainScriptDir, 'emscripten.build.jsonc');

  if(fs.existsSync(buildCConfigPath))
    return JSONC.parse(fs.readFileSync(buildCConfigPath, 'utf8'));
  
  // Now try package.json
  // const packagePath = path.join(mainScriptDir, 'package.json');

  // Node's ES6 module loader bugs out here, so dummy it out.
  // "Unexpected strict mode reserved word"
  // if(fs.existsSync(packagePath)) {
  //   const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  //   if ('emscriptenBuild' in package &&
  //     package.emscriptenBuild instanceof Object)
  //     return package.emscriptenBuild;
  // }

  // Return an empty object
  return {};
}

/**
 * Get config to pass to Bootstrap object.
 * @param {string} [configName] - The name of a base config to use from your `emscripten.build.json` file.
 * @param {object} [configFragment] - An object fragment to merge to the base config.
 */
export function GetWorkingConfig(a, b) {
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

  if ('emsdk' in masterConfig) {
    emsdkPath = masterConfig.emsdk;
    delete masterConfig.emsdk;
  }

  if ('emsdkVersion' in masterConfig) {
    emsdkVersion = masterConfig.emsdkVersion;
    delete masterConfig.emsdkVersion;
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
  mergeWith(workingConfig, configFragment, function(objValue, srcValue) {
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

  return workingConfig;
}
