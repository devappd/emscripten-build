# emscripten-build

[![e2e-test](https://github.com/devappd/emscripten-build-npm/workflows/e2e-test/badge.svg)](https://github.com/devappd/emscripten-build-npm/actions?query=workflow%3Ae2e-test) [![emscripten-build](https://img.shields.io/npm/v/emscripten-build)](https://www.npmjs.com/package/emscripten-build) [![mit-license](https://img.shields.io/github/license/devappd/emscripten-build-npm?color=yellow)](https://github.com/devappd/emscripten-build-npm/blob/master/LICENSE)

Build your C++ WebAssembly project inside your Node.js build workflow.

This package uses the [Emscripten SDK](https://emscripten.org/) to compile your C++ to WebAssembly. It
provides a command line and a JS interface that allows you to configure your builds and integrate your
WASM project into your packaging scripts.

## How to Use

This package assumes that you have a C/C++ project that can build with Emscripten via a Makefile. The recommended usage is to run builds with [CMake](https://cmake.org) and [Ninja](https://ninja-build.org). Support also exists for [GNU Make](https://www.gnu.org/software/make/manual/make.html) and [Autotools](https://www.gnu.org/software/automake/manual/html_node/index.html).

Building can be made as simple as switching to your project directory and entering in the command line:

```sh
npx emscripten --configure --build
```

or invoking from JavaScript:

```js
const emscripten = import('emscripten-build');

emscripten.configure()
    .then((em) => em.build())
    .then((em) => { /* ... */ });
```

Builds are configured by placing `emscripten.settings.js` in your project root. Here is a simple
settings file for a CMake project:

```js
module.exports = {
    myProject: {
        type: "cmake",

        configure: {
            path: "./src",
            generator: "Ninja",
            type: "Release",
            definitions: {
                DEFINE1: "Value1"
            }
        },

        build: {
            path: "./build"
        },

        install: {
            path: "./dist"
        }
    }
};
```

See the end of this document for detailed guides.

## Install

```sh
npm install --save-dev emscripten-build
```

Before you install this package, you must install Python 3.6+ on your system. You may download it at [python.org](https://www.python.org/downloads/) or your OS's package manager.

By default, the Emscripten SDK is installed into your `node_modules` tree. You may specify a custom path by
[modifying your NPM config](https://docs.npmjs.com/cli/v6/using-npm/config) via one of the commands below. Do this **before** you install the package:

|Action|Command
|------|-------
| Save the path to your project `.npmrc` | `npm config --userconfig "/your/project/root/.npmrc" set emsdk "/your/absolute/custom/path"`
| Save the path to your user `.npmrc` | `npm config set emsdk "/your/absolute/custom/path"`
| Set an environment variable | `set NPM_CONFIG_EMSDK=/your/absolute/custom/path`
| Use a config argument to NPM temporarily | `npm [command] --emsdk="/your/absolute/custom/path"`

The [Emscripten SDK](https://www.npmjs.com/package/emscripten-sdk), [CMake](https://www.npmjs.com/package/@devappd/cmake-binaries), and [Ninja](https://www.npmjs.com/package/@devappd/ninja-binaries-npm) programs are installed as NPM dependencies.

## See Also

For detailed information on how to use this package, see these guides:

* [Installation](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Installation.md)
* [Build Settings and Basic Usage](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Build-Settings.md)
* [Command Line](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Command-Line-Usage.md)
* [JavaScript API](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Javascript-API.md)

Visit this repository to see different examples on how to use this package:

* [emscripten-npm-examples](https://github.com/devappd/emscripten-npm-examples) -- Contains "Hello World" examples, an OpenGL demo, and a library project.

## License

MIT License.
