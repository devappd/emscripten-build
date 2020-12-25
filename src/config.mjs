import mergeWith from 'lodash.mergewith';
import path from 'path';
import fs from 'fs';
import { MainModuleDir, IsDir, IsFile, TryResolvePath } from './utils.mjs';

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

  
  let buildFileDir = path.dirname(buildFilePath);

  switch (config.type) {
    case 'make':
      config.build = {
        path: buildFileDir
      };
      break;

    default:
      config.configure = {
        path: buildFileDir
      }
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
  let masterConfig = (await import(filePath)).default;
  masterConfig['_configPath'] = path.dirname(filePath);

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
  // 1. The name of a config listed in `emscripten.config.js`
  // 2. A path to a folder that contains `emscripten.config.js`, `CMakeLists.txt`, `./configure`, or `Makefile`
  // 3. A path directly to one of the above files
  // 4. A config object

  // If null, don't search
  if (configLocator === null)
    return {};

  const mainScriptDir = MainModuleDir();

  let dirSearchSet;
  let testPath = path.resolve(configLocator);
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
      fileSearchSet = ['emscripten.config.js', 'CMakeLists.txt',
        'configure', 'Makefile', 'makefile']
        .map(val => path.join(dirPath, val));
    
    // Search for build/config files
    for (let filePath of fileSearchSet) {
      if (fs.existsSync(filePath)) {
        if (filePath.includes('emscripten.config.js'))
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
 * @param {string} [configLocator] - A name to a config listed in `emscripten.config.js`, or a path to a folder containing CMake/Autotools/Makefile configs, or a configuration object.
 * @param {object} [configFragment] - An object fragment to merge to the selected config. Not valid if `configLocator` is an object.
 */
export async function GetWorkingConfig(a, b) {
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
        // is to use configFragment as the sole config.
        configFragment = args[0] || configFragment;
      break;
  
    case 2:
    default:
      if (typeof args[0] === 'string') {
        // Don't default to process.cwd(); the intent is to explicitly
        // set configLocator. If null, then configFragment shall be
        // the sole config.
        configLocator = args[0] || configLocator;
        configFragment = args[1] || configFragment;
      } else
        // second arg is invalid, warn user
        throw new RangeError('Second argument (`configFragment`) is invalid if the first argument is also an object.');
      break;
  }

  // Get configs to process. Returns immediately if configLocator === null
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

  // At this point, we expect masterConfig.default to be populated because:
  //     * either the author set it, or
  //     * we set it ourselves when constructing a config from a build file, or
  //     * we set it ourselves when we found the configLocator as a named key in the masterConfig, or
  //     * we set it ourselves when there's only one config inside the masterConfig
  if ('default' in masterConfig) {
    if (typeof masterConfig.default === 'string') {
      if (masterConfig.default in masterConfig)
        workingConfig = masterConfig[masterConfig.default];
      else
        throw new RangeError(`Requested base config "${masterConfig.default}" was not found in master config.`);
    }
    delete masterConfig.default;
  }
  
  // Else, determine finalConfig from keys
  let keys = Object.keys(masterConfig);

  if (!keys.length && (typeof configFragment === 'object')) {
    // If the master config is empty, but the user specified a config fragment,
    // then the fragment becomes our working config.
    workingConfig = configFragment;
  }

  if (!workingConfig || !Object.keys(workingConfig).length)
    throw new RangeError('Cannot determine base config to use. Specify "configLocator" parameter or set "default" name in the master config.');

  // Merge configFragment into workingConfig
  if (!workingConfig === configFragment)
    mergeWith(workingConfig, configFragment, function(objValue, srcValue) {
      // Overwrite arrays, don't merge them
      if (Array.isArray(objValue))
        return srcValue;
      // Else, merge by default behavior (recursive for objects, assignment for other types)
    });

  // A config object must have a build type.
  // This also catches empty configs.
  if (!('type' in workingConfig))
    throw new RangeError(`Working config does not have a valid build type. Specify "type": <"make"|"autotools"|"cmake"> in the base config.`);

  // Move EMSDK variables to working config, unless the working config already has them
  if (emsdkPath && !('emsdk' in workingConfig))
    workingConfig.emsdk = emsdkPath;

  if (emsdkVersion && !('emsdkVersion' in workingConfig))
    workingConfig.emsdkVersion = emsdkVersion;

  if (configPath && !('_configPath' in workingConfig))
    workingConfig.configPath = configPath;

  return workingConfig;
}
