# emscripten-build-npm

Build a C/C++ WebAssembly component inside your Node.js project.

This package uses the [Emscripten SDK](https://emscripten.org/) to compile your C++ to WebAssembly. It
provides a CLI and a JS API to allow you to integrate your WASM component easily into your node.js project.

See example usage of this toolset in [emscripten-npm-examples](https://github.com/devappd/emscripten-npm-examples).

***This package is experimental! See [issues](https://github.com/devappd/emscripten-build-npm/issues) for current progress and [emscripten#5774](https://github.com/emscripten-core/emscripten/issues/5774) to discuss emscripten on NPM.***

## Example

Building is as simple as switching to your project directory and entering the command line:

```sh
npx emscripten --build
```

or invoking from JavaScript:

```js
const emscripten = import('emscripten-build');

emscripten.build()
    .then(_ => { /* ... */ });
```

## Configuration

You may pass a directory or file path that contains one of these build configuration files:

* `emscripten.settings.js`
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
npx emscripten --build /path/to/CMakeLists.txt
npx emscripten --install /path/to/CMakeLists.txt
```

One of the files you may pass is `emscripten.settings.js`. With this settings file, you may manually
set build paths and compiler flags. A simple settings file may look like this:

```js
// Relative paths are resolved from the directory of `emscripten.settings.js`

module.exports = {
    // This "settings object" is keyed by the unique name "myProject". Multiple settings
    // objects may be specified here.
    "myProject": {
        "type": "cmake",

        "configure": {
            "path": "./src",
            "generator": "Ninja",
            "type": "Release",
            "definitions": {
                "DEFINE1": "Value1"
            }
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

You may reference the settings file on the CLI:

```sh
# No need to set CWD here because default output path is resolved from
# emscripten.settings.js

npx emscripten --build /path/to/emscripten.settings.js
npx emscripten --install /path/to/emscripten.settings.js
```

You can also pass the same config to the JS API:

```js
const emscripten = require('emscripten-build');
const em_config = require('./emscripten.settings.js');

// "myProject" refers to the named key shown in the config above.
emscripten.build(em_config['myProject'])
    .then(bootstrap => bootstrap.install());
```

You may set different parameters for the `configure`, `build`, `install`, and `clean` steps. You may also list multiple settings objects in the `emscripten.settings.js` file. See later in this document for the settings format.

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

| Command | Description
| ------- | -----------
| `emscripten --configure [config_locator]` | Configure the project.
| `emscripten --build [config_locator]` | Build the project and configure it first if there is no build cache.
| `emscripten --clean [config_locator]` | Reset the project's build files.
| `emscripten --install [config_locator]` | Copy the project's build output into a target directory.
| `emscripten --reconfigure [config_locator]` | Clean the project then configure it.
| `emscripten --rebuild [config_locator]` | Clean the project, configure it, then build.
| `emscripten --compile [config_locator]` | Build the project. If the build fails, the project is cleaned then a rebuild is attempted.
| `emscripten --installSDK [config_locator]` | Installs the requested EMSDK version from the given config.

Each command can be chained left-to-right with the same build configuration.
For example, this will build and install the given config:

```sh
npx emscripten --build --install [config_locator]
```

For consistency with [node-gyp](https://github.com/nodejs/node-gyp), the first command may omit the `--` prefix.

In all commands, `config_locator` is optional and refers to either:
* The name of a settings object listed in `emscripten.settings.js`
* Path to a folder containing either `emscripten.settings.js`, `CMakeLists.txt`, `./configure`, or `Makefile`
* Path to one of these four files

If `config_locator` is a folder, it will search for `emscripten.settings.js`, `CMakeLists.txt`, `./configure`, or `Makefile` in that order.

If `config_locator` is not specified, it defaults to the `default` settings object name specified in
`emscripten.settings.js`. Or, if there's only one settings object listed in the file, then that sole object
will be selected.

### Emscripten SDK Usage

You may also run an arbitrary command under the Emscripten SDK. This forces
usage of the `latest` SDK version. This operation cannot be chained:

```sh
npx emscripten <command> [args...]
```

If you need to use a specific SDK version, use the [emsdk-npm](https://github.com/devappd/emsdk-npm)
commands instead:

```sh
npx emsdk-checkout
npx emsdk install [version]
npx emsdk activate [version]
npx emsdk-run <command> [args...]
```

## JavaScript Usage

This package also supplies JavaScript bindings for the above commands:
    
* `emscripten.configure(configLocator, settingsFragment)`

* `emscripten.build(configLocator, settingsFragment)` or `emscripten.make(configLocator, settingsFragment)`

* `emscripten.clean(configLocator, settingsFragment)`

* `emscripten.install(configLocator, settingsFragment)`

* `emscripten.reconfigure(configLocator, settingsFragment)`

* `emscripten.rebuild(configLocator, settingsFragment)`

* `emscripten.compile(configLocator, settingsFragment)`

* `emscripten.installSDK(configLocator, settingsFragment)`

For all methods, both parameters are optional.

| Parameter    | Description |
| ------------ | ------------|
| `configLocator` | Either a path to a folder containing `emscripten.settings.js`, `CMakeLists.txt`, `./configure`, or `Makefile`; or a path directly to these files; or a settings object name specified in `emscripten.settings.js`; or an object that conforms to `emscripten.settings.js` (see "Configuration Files", later). If a path to a folder is given, a build file is searched for in the above order.
| `settingsFragment` | An object with properties to overwrite on your selected settings object. This performs a deep merge on your selected settings object using this fragment. This parameter is not valid if you specify `configLocator` as an object.

Calling these methods will perform the action and return a Promise that yields a Bootstrap object.
On the Bootstrap object, you can chain multiple calls while reusing the same config.

```js
const emscripten = require('emscripten-build');

emscripten.configure()
    .then(bootstrap => bootstrap.build())
    .then(bootstrap => bootstrap.install());
    .then(bootstrap => bootstrap.clean());
```

However, you cannot select a new config in the chained bootstrap nor specify a fragment to edit it. If you wish to do so, you need to invoke a new bootstrap by calling a method on the `emscripten` module.

You can specify a settings fragment to override certain parameters in your config. Note in this example that we're not chaining calls on `bootstrap`, but we are calling `emscripten.build()` when we provide a settings fragment.

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

### Emscripten SDK Usage

With `emscripten.run()`, you can run any command under the Emscripten SDK. This forces usage of
the `latest` SDK version. It does not return a bootstrap.

```js
const emscripten = require('emscripten-build');

emscripten.run('command',
    ['args1','args2','args3', /*...*/],
    { /* child_process.spawn options, e.g., cwd */ }
)
    .then(_ => { /*...*/ });
```

You can also invoke `run()` on an existing bootstrap. In this case, it can be chained
with other bootstrap calls, and it uses the SDK version specified in your build settings:

```js
const emscripten = require('emscripten-build');

emscripten.build()
    .then(bootstrap => bootstrap.run('command', 
        ['args1', 'args2', 'args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    ));
```

## Settings Files

The below describes the parameters you can set for your build steps: `configure`, `build`, `install`, and `clean`.

Note that the only required parameters are `your_settings["type"]` and `your_settings["configure"]["path"]`. For Makefile, `your_settings["build"]["path"]` is used instead.
The other parameters have defaults as specified below.

### Relative Paths

If any relative paths are specified in `emscripten.settings.js`, they are resolved in relation to that file's directory.

If you are working from a build configuration file (e.g., `emscripten build /path/to/CMakeLists.txt`), the default paths are
relative to your current working directory.

## Top-Level

The settings file lists some top-level fields such as `emsdkVersion`, `default`, and your project's settings objects.

In this top-level object, you may list multiple settings objects by name:

```js
module.exports = {
    // Selects the EMSDK version to use. This can also be specified
    // inside a named config.
    // Default: "latest"
    "emsdkVersion": "latest",

    // Selects the settings object to use if one is not specified
    // on the command line.
    //
    // Default: Sole settings object if only one is listed, otherwise
    // this is required.
    "default": "named_settings",

    "named_settings": {
        // Selects the build toolset to use. Required.
        // Possible values: "make"|"autotools"|"cmake"
        "type": "cmake",

        "configure": { /* ... */ },
        "build": { /* ... */ },
        "install": { /* ... */ },
        "clean": { /* ... */ }
    },

    "other_named_settings": {
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

To specify a preprocessor definition without a value (e.g., `"CUSTOM1"`), specify the value as `null`.
`true` is expressed as `1` and `false` is expressed as `0`. All other values are stringified.

```js
{
    "type": "make",

    "build": {
        // Path which contains Makefile. Required.
        "path": "/path/to/dir/with/Makefile",

        // Target to pass to Make
        // Default: None
        "target": "targetName",

        // Macro definitions.
        // These are passed as "DEFINE1=VAL 1" with double quotes surrounding.
        // See "Variable Definitions" below for complete usage.
        // Default: {}
        "definitions": {
            "DEFINE1": "VAL 1",
            "DEFINE2": "VAL 2"
        }

        // Arguments to pass to Make.
        // These are passed before macro definitions.
        // Default: []
        "arguments": [
            "-j", "4"
        ]
    },

    "install": {
        // Target to pass to Make
        // Default: "install"
        "target": "targetName",

        // Macro definitions.
        // These are passed as "DEFINE1=VAL 1" with double quotes surrounding.
        // See "Variable Definitions" below for complete usage.
        // Default: {}
        "definitions": {
            "DEFINE1": "value1",
            "DEFINE2": "value2"
        }

        // Arguments to pass to Make
        // These are passed before macro definitions.
        // Default: []
        "arguments": [ /* ... */ ]
    },

    "clean": {
        // Target to pass to Make
        // Default: "clean"
        "target": "targetName",

        // Macro definitions.
        // These are passed as "DEFINE1=VAL 1" with double quotes surrounding.
        // See "Variable Definitions" below for complete usage.
        // Default: {}
        "definitions": {
            "DEFINE1": "VAL 1",
            "DEFINE2": "VAL 2"
        }

        // Arguments to pass to Make
        // These are passed before macro definitions.
        // Default: []
        "arguments": [ /* ... */ ]
    }
}
```

## Autotools Configuration

Preprocessor definitions are not supported for Autotools. Instead, specify the definitions as part of your `arguments`.

```js
{
    "type": "autotools",

    "configure": {
        // Path to your source directory which contains ./configure. Required.
        "path": "/path/to/dir/with/configure",

        // Command line arguments to pass to ./configure.
        // Default: []
        "arguments": [
            "CPPFLAGS=-DCUSTOM1=VAL"
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

When specifying a cache definition, the value `true` is expressed as `ON` and the value `false` is expressed as `OFF`. All other values are stringified.

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

        // Cache definitions.
        // These are passed as "-DCUSTOM1=VAL 1" with double quotes surrounding.
        // See "Variable Definitions" below for complete usage.
        // Default: {}
        "definitions": {
            "CUSTOM1": "VAL 1",
            "CUSTOM2": "VAL 2"
        }

        // Extra command line arguments.
        // These are passed before cache definitions.
        // Default: []
        "arguments": [ /* ... */ ]
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

## Variable Definitions

You may specify preprocessor definitions under Make and CMake settings like so:

```js
{
    /* ... */

    "definitions": {
        "CUSTOM1": "VAL 1",
        "CUSTOM2": "VAL 2"
    }
}
```

The above syntax presumes unique, case-sensitive keys, and order is not guaranteed. If you need the
definitions in a specific order, use this syntax:

```js
{
    /* ... */

    "definitions": [
        [ "CUSTOM1", "VAL 1" ],
        [ "CUSTOM2", "VAL 2" ]
    ]
}
```

CMake allows you to specify a variable type for each definition, which is passed as `"-D<key>:<type>=<value>"`.
Specify the type as follows:

```js
{
    /* ... */

    "definitions": {
        "CUSTOM1": {
            "type": "BOOL",
            "value": "ON"
        }
    }
}
```

You may specify preprocessor definitions for Make build, install, and clean steps; as well as CMake configure
steps.

## License

MIT License.
