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
    const buildConfigPath = path.join(searchPath, 'emscripten.config.js');
    

    if(fs.existsSync(buildConfigPath)) {
      masterConfig = (await import(buildConfigPath)).default;
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
        if (IsFile(path.join(testPath, fileName))) {
          let config = _constructMasterConfig(path.join(testPath, fileName));
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
    mergeWith(workingConfig, configFragment, function(objValue, srcValue) {
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
