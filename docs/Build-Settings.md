# Build Configuration

This package assumes that you have a C/C++ project whose build files already support
Emscripten. The recommended usage is to run builds with [CMake](https://cmake.org) and [Ninja](https://ninja-build.org),
both of which are installed by this package. You may also build projects with [Makefile](https://www.gnu.org/software/make/manual/make.html) and [Autotools](https://www.gnu.org/software/automake/manual/html_node/index.html).

The below examples use the `install` command which refers to the copying of program files to a
user-supplied directory. To support this feature, your build files must support copying of the
*.js, *.html, *.wasm, and *.data artifacts during the `install` operation.

## Basic Usage

When using the CLI and API, you may pass a directory or path to one of these build configuration files:

* `emscripten.settings.js`
* `CMakeLists.txt`
* `Makefile`
* `./configure`

If you do not specify any path, the above files will be searched in the current working directory.

This example will build a project from `/path/to/CMakeLists.txt`:

```js
const emscripten = require('emscripten-build');

emscripten.build('/path/to/CMakeLists.txt')
    .then((em) => em.install());
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
    // objects may be specified alongside this one.
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
# No need to set CWD here because the default output path is resolved from
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

## Settings File

The below describes the parameters you can set for your build steps: `configure`, `build`, `install`, and `clean`.

Note that the only required parameters are `your_settings["type"]` and `your_settings["configure"]["path"]`. For Makefile, `your_settings["build"]["path"]` is required instead.
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
        // Possible values: "Ninja"|"Unix Makefiles"|etc.
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

## GNU Make Configuration

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
