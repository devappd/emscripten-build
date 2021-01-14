# Installation

```sh
npm install --save-dev emscripten-build
```

Before you install this package, you must have at least Python 3.6 on your system. You may download it at [python.org](https://www.python.org/downloads/), or refer to your OS's package manager.

This package works with Node.js 12.x or later.

By default, the Emscripten SDK is installed into your `node_modules` tree. You may specify a custom path by
[modifying your NPM config](https://docs.npmjs.com/cli/v6/using-npm/config) via one of the commands below. Do this **before** you install the package:

|Action|Command
|------|-------
| Save the path to your project `.npmrc` | `npm config --userconfig "/your/project/root/.npmrc" set emsdk "/your/absolute/custom/path"`
| Save the path to your user `.npmrc` | `npm config set emsdk "/your/absolute/custom/path"`
| Set an environment variable | `set NPM_CONFIG_EMSDK=/your/absolute/custom/path`
| Use a config argument to NPM temporarily | `npm [command] --emsdk="/your/absolute/custom/path"`

You should specify your own path in order to save disk space. Otherwise, the SDK will be duplicated
across multiple dependency trees.

You may also specify an existing Emscripten SDK directory, but do not do this if you have modified your SDK.

## Dependencies

This package installs these dependencies into your `node_modules` tree:

* [emscripten-sdk-npm](https://github.com/devappd/emsdk-npm)
* [@devappd/cmake-binaries](https://github.com/devappd/cmake-binaries)
* [ninja-binaries](https://github.com/banno/ninja-binaries)

Usage of `make`, `configure`, `mingw32-make`, and any other build toolset, will
require you to install those systems by yourself. Have those commands available
in your PATH.

If you already have CMake and Ninja installed in your PATH, then those installations are used first. Note that both programs will still be downloaded into `node_modules`, albeit unused.

### Emscripten Version

If you wish to install a specific Emscripten version, you may do so by passing a `version` string
in `emscripten.settings.js`. See [Build Settings](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Build-Settings.md)
for more info.

## Note on Node 15.x dependency cache

Node 15.x and later may consolidate separate `node_modules` trees by symlinking each installation
of this package to a single cache folder. In this case, if different projects specify different
Emscripten SDK versions, those versions will install over whatever exists in the cache folder.

While there are no functionally negative effects of overwriting the installed tools, this behavior
will increase your build times. To manage this situation, you should set different install paths
by configuring `.npmrc` in each project root, as described above.

## Environment

If you have any issues with setting up your environment, you may refer to [issue #1](https://github.com/devappd/emscripten-build-npm/issues/1) and [Emscripten's prerequisites](https://emscripten.org/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk) for guidance.
