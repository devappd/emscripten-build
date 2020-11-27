import ActivateEmSDK from './activate.mjs';
import CMake from './cmake.mjs';
import Make from './make.mjs';
import Autotools from './autotools.mjs';
import emsdk from 'emsdk-npm';
import { GetWorkingConfig } from './config.mjs';

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
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function configure(a, b) {
  return _callAction('configure', a, b);
}

/**
 * Build the C/C++ project with a given config. Also configure the project if necessary.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function build(a, b) {
  return _callAction('build', a, b);
}

/**
 * Clean the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function clean(a, b) {
  return _callAction('clean', a, b);
}

/**
 * Install the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function install(a, b) {
  return _callAction('install', a, b);
}

/**
 * Clean then configure the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function reconfigure(a, b) {
  return _callAction('reconfigure', a, b);
}

/**
 * Clean, configure, then build the C/C++ project with a given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function rebuild(a, b) {
  return _callAction('rebuild', a, b);
}

/**
 * Build the C/C++ project with a given config. If the build fails, then clean, configure, and rebuild.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function compile(a, b) {
  return _callAction('compile', a, b);
}

/**
 * Install the given EMSDK version from the given config.
 * @param {string} [configName] - The name of a sub-config to use from the base config.
 * @param {object} [appendConfig] - A supplemental config to merge to the sub-config.
 */
export async function installSDK(a, b) {
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
export async function run(command, args = [], opts = {}) {
  await ActivateEmSDK();
  return emsdk.run(command, args, opts);
}
