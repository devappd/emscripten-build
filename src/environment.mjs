// environment.js
// Discover commands for certain build toolsets.

import getInstalledPathCJS from 'get-installed-path';
import os from 'os';
import fs from 'fs';
import path from 'path';
import which from 'which';

const getInstalledPath = getInstalledPathCJS.getInstalledPath;

async function _tryImport(packageName) {
  try {
    let { default: mod } = await import(packageName);
    return mod;
  } catch (e) {
    // Presume package is not installed
    console.error(`The ${packageName} package is not installed!`);
    throw e;
  }
}

////////////////////////////////////////////////////////////////////////
// CMake
////////////////////////////////////////////////////////////////////////

let _CMakeExists = false;
export let cMakeCommand = 'cmake';

export async function checkCMakeInstalled() {
  if (_CMakeExists)
    return true;
  
  // Check if CMake is installed
  let cmake;
  try {
    cmake = await _tryImport('cmake-binaries');
  } catch (e) {
    // doesn't exist, try which
    try {
      cmakeCommand = await which('cmake');
      _CMakeExists = true;
      return true;
    } catch (e) {
      // presume not in PATH
      _CMakeExists = false;
      return false;
    }
  }

  // Check node_modules
  if (!cmake.exists())
    throw new Error('CMake was not found! Try running '
      + '`npm explore cmake-binaries -- npm run install -- --force`');

  // While we're here, populate the CMake command
  cMakeCommand = cmake.getCommand();

  // If successful, persist this check per runtime session
  _CMakeExists = true;
  
  return true;
}

////////////////////////////////////////////////////////////////////////
// MSBuild
////////////////////////////////////////////////////////////////////////

let _MSBuildExists = false;
export let msbuildCommand = 'msbuild';

export async function checkMSBuildInstalled() {
  if (_MSBuildExists)
    return true;

  // Check if MSBuild is in path
  try {
    msbuildCommand = await which('msbuild');
    _MSBuildExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // No results? Rely on `msbuild` package
  var msbuild = await _tryImport('msbuild');

  // This always returns a path, whether or not it exists
  let msbuildPath = msbuild.buildexe();

  if (!fs.existsSync(msbuildPath))
    throw new Error('MSBuild was not found!');

  // While we're here, populate the MSBuild command
  msbuildCommand = msbuildPath;

  // If successful, persist this check per runtime session
  _MSBuildExists = true;
}

////////////////////////////////////////////////////////////////////////
// Ninja
////////////////////////////////////////////////////////////////////////

let _NinjaExists = false;
export let ninjaCommand = 'ninja';

export async function checkNinjaInstalled() {
  if (_NinjaExists)
    return true;

  // Check if ninja is in path
  try {
    ninjaCommand = await which('ninja');
    _NinjaExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // No results? Rely on `ninja-binaries` package
  let ninjaPath;
  try {
    // Prefer local node_modules
    ninjaPath = await getInstalledPath('ninja-binaries', { local: true });
  } catch (e) {
    try {
      // Try global node_modules
      ninjaPath = await getInstalledPath('ninja-binaries');
    } catch (e) {
      throw new Error('ninja was not found! To resolve, you may install `npm install -g ninja-binaries`.')
    }
  }

  if (os.platform() === 'win32')
    ninjaPath = path.join(ninjaPath, 'binaries', 'ninja-win.exe');
  else if (os.platform() === 'darwin')
    ninjaPath = path.join(ninjaPath, 'binaries', 'ninja-mac');
  else if (os.platform() === 'linux' || os.platform() === 'cygwin')
    ninjaPath = path.join(ninjaPath, 'binaries', 'ninja-linux');
  else
    throw new Error(`ninja was not found for your platform (${os.platform()}!`);

  if (!fs.existsSync(ninjaPath))
    throw new Error('ninja was not found!');

  // While we're here, populate the ninja command
  ninjaCommand = ninjaPath;

  // If successful, persist this check per runtime session
  _NinjaExists = true;
}

////////////////////////////////////////////////////////////////////////
// Make
////////////////////////////////////////////////////////////////////////

let _MakeExists = false;
export let makeCommand = 'make';

export async function checkMakeInstalled() {
  if (_MakeExists)
    return true;

  // Check if Make is in path
  try {
    makeCommand = await which('make');
    _MakeExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  // If we're Windows, also check for mingw32-make
  try {
    makeCommand = await which('mingw32-make');
    _MakeExists = true;
    return true;
  } catch (e) {
    // fall through, presume not in PATH
  }

  throw new Error('Make was not found!');
}
