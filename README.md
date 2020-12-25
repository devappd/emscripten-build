# emscripten-build-npm

Build a C/C++ WebAssembly component inside your Node.js project.

This package uses the [Emscripten SDK](https://emscripten.org/) to compile your C++ to WebAssembly. It
provides a CLI and a JS API to allow you to integrate your WASM component easily into your node.js project.

See example usage of this toolset in [emscripten-npm-examples](https://github.com/devappd/emscripten-npm-examples).

***This package is experimental! See [issues](https://github.com/devappd/emscripten-build-npm/issues) for current progress and [emscripten#5774](https://github.com/emscripten-core/emscripten/issues/5774) to discuss emscripten on NPM.***

## Example

Building is as simple as switching to your project directory and entering the command line:

```sh
npx emscripten build
```

or invoking from JavaScript:

```js
const emscripten = import('emscripten-build');

emscripten.build()
    .then(_ => { /* ... */ });
```

## Configuration

You may pass a directory or file path that contains a build configuration file:

* `emscripten.build.js`
* `CMakeLists.txt`
* `./configure`
* `Makefile`

If you do not specify a path, the above files will be searched in the current working directory.

This example will build a project from `/path/to/CMakeLists.txt`:

```js
const emscripten = require('emscripten-build');

emscripten.build('/path/to/CMakeLists.txt')
    .then(bootstrap => bootstrap.install());
```

Or on the CLI:

```sh
# The default output path is relative to your CWD, so you should set CWD
# to your JS <project_dir>.

cd <project_dir>
npx emscripten build /path/to/CMakeLists.txt
npx emscripten install /path/to/CMakeLists.txt
```

One of the files you may pass is `emscripten.config.js`. With this configuration file, you may manually
set build paths and compiler flags. A simple configuration file may look like this:

```js
// Relative paths are resolved from the directory of `emscripten.config.js`

module.exports = {
    "myProject": {
        "type": "cmake",

        "configure": {
            "path": "./src",
            "generator": "Ninja",
            "type": "Release",
            "arguments": [
                "-DDEFINE1=\"Value1\""
            ]
        },

        "build": {
            "path": "./build"
        },

        "install": {
            "path": "./dist"
        }
    }
}
```

Or on the CLI:

```sh
# No need to set CWD here because default output path is resolved from
# emscripten.config.js

npx emscripten build /path/to/emscripten.config.js
npx emscripten install /path/to/emscripten.config.js
```

You can also pass the same config to the JS API:

```js
const emscripten = require('emscripten-build');
const em_config = require('./emscripten.config.js');

// "myProject" refers to the named key shown in the config above.
emscripten.build(em_config['myProject'])
    .then(bootstrap => bootstrap.install());
```

You may set different parameters for the `configure`, `build`, `install`, and `clean` steps. You may also list multiple named configs in the `emscripten.config.js` file. See later in this document for the configuration format.

## Installation

Before you install this package, you must have at least Python 3.6 on your system. You may download it at [python.org](https://www.python.org/downloads/), or refer to your OS's package manager.

This package works with Node.js 12.x or later.

The install command is:

```sh
npm install --save-dev git+https://github.com/devappd/emscripten-build-npm.git
```

By default, EMSDK is installed into your `node_modules` tree. You may specify a custom path by
[modifying your NPM config](https://docs.npmjs.com/cli/v6/using-npm/config) via one of the following:

|Method|Command
|------|-------
| Commit the path to your user `.npmrc` | `npm config set emsdk "/your/install/path"`
| Set an environment variable | `set NPM_CONFIG_EMSDK=/your/install/path`
| Use a config argument to NPM temporarily | `npm [command] --emsdk="/your/install/path"`

You should specify your own path in order to save disk space. In addition, if you are running on Windows, EMSDK installation will fail if your install path is longer than 85 characters.

### Dependencies

This package installs these dependencies:

* [emsdk-npm](https://github.com/devappd/emsdk-npm) -- Installs EMSDK into a location of your choice.
* [cmake-binaries](https://github.com/devappd/cmake-binaries) -- Locates CMake on your system
or installs it into your `node_modules`.
* [ninja-binaries](https://github.com/Banno/ninja-binaries) -- Installs Ninja into your `node_modules`.
(Your system's Ninja will be used if it already exists.)
* [msbuild](https://github.com/jhaker/nodejs-msbuild) -- Locates MSBuild (Visual Studio) on your
system. If you wish to use Visual Studio, you'll need to have it installed on your system.

Usage of `make`, `configure`, `mingw32-make`, and any other build toolset, will
require you to install those systems by yourself. Have those commands available
in your PATH.

If you have any issues with the environment, you may refer to [issue #1](https://github.com/devappd/emscripten-build-npm/issues/1) and [Emscripten's prerequisites](https://emscripten.org/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk) for guidance.

## Command Line Usage

In all commands, `config_locator` is optional and refers to either:
* The name of a config listed in `emscripten.config.js`
* Path to a folder containing either `emscripten.config.js`, `CMakeLists.txt`, `./configure`, or `Makefile`
* Path to one of these four files

If `config_locator` is a folder, it will search for `emscripten.config.js`, `CMakeLists.txt`, `./configure`, or `Makefile` in that order.

If `config_locator` is not specified, it defaults to the `default` name specified in
`emscripten.config.js`. Or, if there's only one config specified, then that sole config
will be selected.

| Command | Description
| ------- | -----------
| `emscripten configure [config_locator]` | Configure the project.
| `emscripten build [config_locator]` | Build the project and configure it first if necessary.
| `emscripten clean [config_locator]` | Reset the project's build files.
| `emscripten install [config_locator]` | Copy the project's build output into a target directory.
| `emscripten reconfigure [config_locator]` | Clean the project then configure it.
| `emscripten rebuild [config_locator]` | Clean the project, configure it, then build.
| `emscripten compile [config_locator]` | Build the project. If the build fails, the project is cleaned then a rebuild is attempted.
| `emscripten installSDK [config_locator]` | Installs the requested EMSDK version from the given config.
| `emscripten run <command> [arg...]` | Runs a given command under the context of the EMSDK environment.

## JavaScript Usage

This package also supplies JavaScript bindings for the above commands:
    
* `emscripten.configure(configLocator, customConfig)`

* `emscripten.build(configLocator, customConfig)` or `emscripten.make(configLocator, customConfig)`

* `emscripten.clean(configLocator, customConfig)`

* `emscripten.install(configLocator, customConfig)`

* `emscripten.reconfigure(configLocator, customConfig)`

* `emscripten.rebuild(configLocator, customConfig)`

* `emscripten.compile(configLocator, customConfig)`

* `emscripten.installSDK(configLocator, customConfig)`

For all methods, both parameters are optional.

| Parameter    | Description |
| ------------ | ------------|
| `configLocator` | Either a path to a folder containing `emscripten.config.js`, `CMakeLists.txt`, `./configure`, or `Makefile`; or a path directly to these files; or a config name specified in `emscripten.config.js`; or an object that conforms to a top-level config (see "Configuration Files", later). If a path to a folder is given, a build file is searched for in the above order.
| `customConfig` | An object fragment with properties to overwrite on your selected config. This performs a deep merge on your selected config using this fragment. This parameter is not valid if you specify `configLocator` as a config object.

Calling these methods will perform the action and return a Promise that yields a Bootstrap object.
On the Bootstrap object, you can chain multiple calls while reusing the same config.

```js
const emscripten = require('emscripten-build');

emscripten.configure()
    .then(bootstrap => bootstrap.build())
    .then(bootstrap => bootstrap.install());
    .then(bootstrap => bootstrap.clean());
```

However, you cannot select a new config in the chained bootstrap nor specify a fragment to edit it. If you wish to do so, you need to call a method on the `emscripten` module.

You can specify an object fragment to override certain parameters in your config. Note in this example that we're not chaining calls on `bootstrap`, but we are calling `emscripten.build()` when we provide a config fragment.

```js
const emscripten = require('emscripten-build');

emscripten.configure()
    .then(_ => emscripten.build({
        "build": {
            "target": "MainProject"
        }
    }))
    .then(_ => emscripten.build({
        "build": {
            "target": "SubProject"
        }
    }))
    .then(bootstrap => bootstrap.install());
```

You want to structure the object not towards a top-level config (see below), but to a config
object with keys `type`, `configure`, `build`, etc.

With `emscripten.run()`, you can run any command inside the EMSDK environment. It does not return a bootstrap.

```js
const emscripten = require('emscripten-build');

emscripten.run('command',
    ['args1','args2','args3', /*...*/],
    { /* child_process.spawn options, e.g., cwd */ }
)
    .then(_ => { /*...*/ });
```

You can also invoke `run()` on an existing bootstrap. In this case, it can be chained
with other bootstrap calls.

```js
const emscripten = require('emscripten-build');

emscripten.build()
    .then(bootstrap => bootstrap.run('command', 
        ['args1', 'args2', 'args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    ));
```

## Configuration Files

The below describes the parameters you can set for your build steps: `configure`, `build`, `install`, and `clean`.

Note that the only required parameters are `your_config["type"]` and `your_config["configure"]["path"]` (for Makefile, `your_config["build"]["path"]` is used instead.)
The other parameters have defaults as specified below.

### Relative Paths

If any relative paths are specified in a config file, they are resolved in relation to the config file's directory.

If you are working from a build file (e.g., `emscripten build /path/to/CMakeLists.txt`), the default paths are
relative to your current working directory.

## Top-Level

The config file lists some top-level fields such as `emsdkVersion`, `default`, and your project's build configurations.

In this top-level object, you may list multiple configurations by name:

```js
module.exports = {
    // Selects the EMSDK version to use. This can also be specified
    // inside a named config.
    // Default: "latest"
    "emsdkVersion": "latest",

    // Selects the configuration to use if one is not specified
    // on the command line.
    //
    // Default: Sole config if only one is listed, otherwise
    // this is required.
    "default": "named_config",

    "named_config": {
        // Selects the build toolset to use. Required.
        // Possible values: "make"|"autotools"|"cmake"
        "type": "cmake",

        "configure": { /* ... */ },
        "build": { /* ... */ },
        "install": { /* ... */ },
        "clean": { /* ... */ }
    },

    "other_named_config": {
        "type": "make",

        "configure": { /* ... */ },
        "build": { /* ... */ },
        "install": { /* ... */ },
        "clean": { /* ... */ }
    }
}
```

## Make Configuration

Make does not have `configure` parameters. As such, the
`emscripten.configure()` call has no effect for Make configs.

```js
{
    "type": "make",

    "build": {
        // Path which contains Makefile. Required.
        "path": "/path/to/dir/with/Makefile",

        // Target to pass to Make
        // Default: None
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [
            "-j", "4", "-DFLAG", "-DDEFINE1=value1", "-DDEFINE2=value2"
        ]
    },

    "install": {
        // Target to pass to Make
        // Default: "install"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    },

    "clean": {
        // Target to pass to Make
        // Default: "clean"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    }
}
```

## Autotools Configuration

```js
{
    "type": "autotools",

    "configure": {
        // Path to your source directory which contains ./configure. Required.
        "path": "/path/to/dir/with/configure",

        // Command line arguments to pass to ./configure.
        // Default: []
        "arguments": [
            "-DCUSTOM1=\"VAL 1\"",
            "-DCUSTOM1=\"VAL 2\""
        ]
    },

    "build": {
        // Path to store Makefile and build cache
        // Default: <config_dir>/build
        "path": "/path/to/build/cache",

        // Target to pass to Make
        // Default: None
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [
            "-j", "4"
        ]
    },

    "install": {
        // Path to install executables to.
        // Default: <config_dir>/dist
        "path": "/path/to/install/destination",

        // Paths to install artifacts.
        // Relative paths are resolved to the config file directory, as normal.
        // Default: <install_path>/bin (lib, include...)
        "binaryPath": "/path/to/install/bin",
        "libraryPath": "/path/to/install/lib",
        "includePath": "/path/to/install/include",

        // Target to pass to Make
        // Default: "install"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    },

    "clean": {
        // Target to pass to Make
        // Default: "clean"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    }
}
```

## CMake Configuration

```js
{
    "type": "cmake",

    "configure": {
        // Path to your source directory which contains CMakeLists.txt. Required.
        "path": "/path/to/dir/with/CMakeLists",

        // Type of build files to generate. Specify as if you were passing -G to CMake.
        // Default: "Ninja"
        // Possible values: "Ninja"|"Unix Makefiles"|"Visual Studio 16"|etc.
        "generator": "Ninja",

        // Build type.
        // Default: "Release"
        // Possible: "Debug"|"Release"|"RelWithDebInfo"|etc.
        "type": "Release",

        // Extra command line arguments, e.g., cache defines.
        // Default: []
        "arguments": [
            "-DCUSTOM1=\"VAL 1\"",
            "-DCUSTOM1=\"VAL 2\""
        ]
    },

    "build": {
        // Path to build cache
        // Default: <config_dir>/build
        "path": "/path/to/build/cache",

        // Target to pass to Make
        // Default: None
        "target": "targetName",

        // Arguments to pass to ninja, make, etc.
        // Default: []
        "arguments": [
            "-j", "4"
        ]
    },

    "install": {
        // Path to install executables to.
        // Default: <config_dir>/dist
        "path": "/path/to/install/destination",

        // Paths to install artifacts.
        // Relative paths are resolved to the config file directory, as normal.
        // Default: <install_path>/bin (lib, include...)
        "binaryPath": "/path/to/install/bin",
        "libraryPath": "/path/to/install/lib",
        "includePath": "/path/to/install/include",

        // Target to pass to Make
        // Default: "install"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    },

    "clean": {
        // Target to pass to Make
        // Default: "clean"
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [ /* ... */ ]
    }
}
```

## License

MIT License.
