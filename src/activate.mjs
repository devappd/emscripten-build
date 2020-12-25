// activate.js
// On first bootstrap instantiation, install and activate the EMSDK.

import emsdk from 'emsdk-npm';

let _installed = [];
let _active = null;

export async function InstallEmSDK(version = 'latest') {
  // This does not "reinstall" a version forcibly, as it checks whether
  // the version files already exist.
  if (!_installed.includes(version)) {
    await emsdk.update();
    await emsdk.install(version);
    _installed.push(version);
  }
}

export async function ActivateEmSDK(version = 'latest') {
  if (_active === version)
    return;

  // Update and install if we haven't yet activated `version` in this
  // runtime session.
  await InstallEmSDK(version);
  
  // Switch to `version`.
  // Note we cannot have more than one version activated at the same time.
  await emsdk.activate(version);
  _active = version;
}
