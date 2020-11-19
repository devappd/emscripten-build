// activate.js
// On first bootstrap instantiation, install and activate the EMSDK.

import emsdk from 'emsdk-npm';

let _installed = [];
let _active = null;

export default function Activate(version = 'latest') {
  if (_active === version)
    return Promise.resolve();

  // Update and install if we haven't yet activated `version` in this
  // runtime session.
  // This does not "reinstall" a version forcibly.
  if (!_installed.includes(version))
    return emsdk.update()
    .then(_ => emsdk.install(version))
    .then(_ => {
      _installed.push(version);
      return emsdk.activate(version);
    })
    .then(_ => { _active = version });

  // Else, we're installed, but switching between activated versions.
  // Note we cannot have more than one version activated at the same time.
  else
    return emsdk.activate(version)
    .then(_ => { _active = version });
}
