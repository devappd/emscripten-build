// activate.js
// On first bootstrap instantiation, install and activate the EMSDK.

import emsdk from 'emsdk-npm';

let alwaysUpdate = false, neverUpdate = false;
let hasUpdated = false;
let _active = null;

export async function InstallEmSDK(version = 'latest') {
  // Retrieve the latest tags from git.
  // Never update if specified, otherwise update once per runtime
  // unless alwaysUpdate is true.
  if (!neverUpdate && (alwaysUpdate || !hasUpdated)) {
    hasUpdated = true;
    await emsdk.checkout();
    await emsdk.update();
  }
  
  // Check if the requested EMSDK version is currently on disk. Only
  // one version is "installed" at a time, and no other versions are cached.
  if (!emsdk.getInstalled(version)) {
    await emsdk.install(version, true);

    // Also activate upon install, as this writes files to set up
    // the environment scripts.
    //
    // Activation is only necessary upon install. Presuming the environment
    // scripts aren't modified by user, subsequent calls need only
    // invoke the `emsdk_env` script -- see emsdk.run().
    await emsdk.activate(version);
  }
}

export async function ActivateEmSDK(version = 'latest') {
  if (_active === version && !alwaysUpdate)
    return;

  // Update, install, and activate if the requested version is not on-disk.
  await InstallEmSDK(version);
  _active = version;
}

/**
 * Always check server for Emscripten SDK updates for the current runtime session.
 */
export function ForceEmSDKUpdates() {
  alwaysUpdate = true;
  neverUpdate = false;
}

/**
 * Never check server for Emscripten SDK updates for the current runtime session.
 */
export function DisableEmSDKUpdates() {
  alwaysUpdate = false;
  neverUpdate = true;
}

/**
 * Resets forcing/disabling of Emscripten SDK updates.
 */
export function ResetEmSDKUpdates() {
  alwaysUpdate = false;
  neverUpdate = false;
}
