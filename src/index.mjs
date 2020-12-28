import { ActivateEmSDK, InstallEmSDK } from './activate.mjs';
import CMake from './cmake.mjs';
import Make from './make.mjs';
import Autotools from './autotools.mjs';
import emsdk from 'emsdk-npm';
import { GetWorkingConfig } from './config.mjs';

async function _getBootstrap(a, b) {
  let workingSettings = await GetWorkingConfig(a, b);

  let bootstrap;
  switch (workingSettings.type.toLowerCase()) {
    case 'make':
      bootstrap = new Make(workingSettings);
      break;
    
    case 'autotools':
      bootstrap = new Autotools(workingSettings);
      break;
    
    case 'cmake':
      bootstrap = new CMake(workingSettings);
      break;
  }

  return bootstrap;
}

async function _callAction(actionName, a, b, ...args) {
  const bootstrap = await _getBootstrap(a, b);

  return bootstrap[actionName](...args);
}

/**
 * Configure the C/C++ project. Invokes CMake, `./configure`, etc.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function configure(a, b) {
  return _callAction('configure', a, b);
}

/**
 * Build the C/C++ project. Also configure the project if necessary. Invokes Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function build(a, b) {
  return _callAction('build', a, b);
}

/**
 * Clean the C/C++ project. Invokes the "clean" target on Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function clean(a, b) {
  return _callAction('clean', a, b);
}

/**
 * Install the C/C++ project. Invokes the "install" target on Make.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function install(a, b) {
  return _callAction('install', a, b);
}

/**
 * Clean then configure the C/C++ project.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function reconfigure(a, b) {
  return _callAction('reconfigure', a, b);
}

/**
 * Clean, configure, then build the C/C++ project.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function rebuild(a, b) {
  return _callAction('rebuild', a, b);
}

/**
 * Build the C/C++ project. If the build fails, then clean, configure, and rebuild.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function compile(a, b) {
  return _callAction('compile', a, b);
}

/**
 * Install the given EMSDK version as specified in the config.
 * @param {string} [configLocator] - Path to a settings or build file, or a folder containing the same, or the name of a settings object in `<cwd>/emscripten.settings.js`, or a settings object. Default: `<cwd>`
 * @param {object} [settingsFragment] - A settings object to overwrite properties in the active settings object.
 */
export async function installSDK(a, b) {
  const bootstrap = _getBootstrap(a, b);
  let version = 'latest';

  if (('emsdkVersion' in bootstrap.config)
        && !!bootstrap.config.emsdkVersion)
    version = bootstrap.config.emsdkVersion;

  await InstallEmSDK(version);

  return bootstrap;
}

/**
 * Run an arbitrary command within the EMSDK environment.
 * @param {string} command - The executable name of the command.
 * @param {string[]} [args=[]] - Command line arguments
 * @param {object} [opts={}] - Options to pass to child_process.spawn()
 */
export async function run(command, args = [], opts = {}) {
  await ActivateEmSDK();
  return emsdk.run(command, args, opts);
}
