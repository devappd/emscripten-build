# emscripten-build-npm

Configure and build a C/C++ project with Emscripten by using node.js.

See example usage of this toolset in [emscripten-npm-examples](https://github.com/devappd/emscripten-npm-examples).

***This package is experimental! See [issues](https://github.com/devappd/emscripten-build-npm/issues) for current progress.***

## Example

Building is as simple as switching to your project directory and entering the command line:

```sh
emscripten build
```

or invoking from JavaScript:

```js
async () => {
    const emscripten = await import('./node_modules/emscripten-build/src/index.mjs');

    return emscripten.build()
        .then(bootstrap => {
            // You can chain additional calls,
            // e.g., bootstrap.clean()
        });
}
```

You specify your build parameters in a configuration file; see below.

## Configuration

This package reads parameters from `<your_module>/emscripten.build.json`.

In the config file, you can list multiple configurations by name:

```jsonc
{
    // Selects the EMSDK version to use.
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
        // Possible values: "make"|"configure"|"cmake"
        "type": "cmake",

        "configure": { /* ... */ },
        "build": { /* ... */ },
        "clean": { /* ... */ },
    },

    "other_named_config": {
        "type": "make",

        "configure": { /* ... */ },
        "build": { /* ... */ },
        "clean": { /* ... */ },
    }
}
```

Your build parameters are listed under `configure`, `build`, and `clean`, corresponding to that specific build step. The fields change depending on your toolset. See later in this document for details.

## Installation

```sh
npm install --emsdk='/your/install/path' --save-dev git+https://github.com/devappd/emscripten-build-npm.git
```

You may also install this package globally.

The `--emsdk` switch allows you to specify your own install path for EMSDK. This path is saved to your `npmrc` user config. 

If the path is not specified, this package will warn you that EMSDK will be installed into your `node_modules`. You should specify a path to save disk space across duplicate modules. 

In addition, if you are running on Windows, this package will warn you that EMSDK installation will fail if your install path is longer than 85 characters.

You may also specify an install path as follows:

```sh
npm config set emsdk "/your/install/path"
```

This package installs these dependencies:

* [emsdk-npm](https://github.com/devappd/emsdk-npm) -- Installs EMSDK into a location of your choice.
* [cmake-binaries](https://github.com/devappd/cmake-binaries) -- Locates CMake on your system
or installs it into your `node_modules`.
* [ninja-binaries](https://github.com/Banno/ninja-binaries) -- Locates ninja on your system
or installs it into your `node_modules`.
* [msbuild](https://github.com/jhaker/nodejs-msbuild) -- Locates MSBuild (Visual Studio) on your
system. If you wish to use Visual Studio, you'll need to have it installed on your system.

Usage of `make`, `configure`, `mingw32-make`, and any other build toolset, will
require you to install those systems by yourself. Have those commands available
in your PATH.

## Command Line Usage

In all commands, `config_name` is optional and refers to the name of your config in
`emscripten.build.json`.

If `config_name` is not specified, it defaults to the `default` name specified in
`emscripten.build.json`. Or, if there's only one config specified, then that sole config
will be selected.

* `emscripten configure [config_name]` -- Configure the project.

* `emscripten build [config_name]` -- Build the project and configure it first if necessary.

* `emscripten clean [config_name]` -- Reset the project's build directories.

* `emscripten reconfigure [config_name]` -- Clean the project then configure it.

* `emscripten rebuild [config_name]` -- Clean the project, configure it, then build.

* `emscripten compile [config_name]` -- Build the project. If the build fails, the project is cleaned then a rebuild is attempted.

* `emscripten install [config_name]` -- Install the given EMSDK version into the given path. Path defaults to the user's NPM config.

* `emscripten run <command> [arg...]` -- Runs a given command under the context of the EMSDK environment.

## JavaScript Usage

This package also supplies JavaScript bindings for the above commands:
    
* `emscripten.configure(configName, customConfig)`

* `emscripten.build(configName, customConfig)` or `emscripten.make(configName, customConfig)`

* `emscripten.clean(configName, customConfig)`

* `emscripten.reconfigure(configName, customConfig)`

* `emscripten.rebuild(configName, customConfig)`

* `emscripten.compile(configName, customConfig)`

* `emscripten.install(configName, customConfig)`

For all methods, `configName` and `customConfig` are optional.

* `configName` -- Selects the named config in your `emscripten.build.json`. Defaults to the `default`
name specified in that file, or the sole config if there's only one listed.

* `customConfig` -- An object fragment with properties to overwrite on your selected config. This performs a deep merge on your selected config using this fragment.

Calling these methods will perform the action and return a Promise that yields a Bootstrap object.
On the Bootstrap object, you can chain multiple calls while reusing the same config.

```js
async () => {
    const emscripten = await import('./node_modules/emscripten-build/src/index.mjs');

    return emscripten.configure()
        .then(bootstrap => bootstrap.build())
        .then(bootstrap => bootstrap.clean())
};
```

However, you
cannot select a new config in the chained bootstrap nor specify a fragment to edit it. If you wish to do so, you need to call a method on the `emscripten` module.

You can specify an object fragment to override certain parameters
in your config. Note in this example that we're not chaining calls
on `bootstrap`, but we are calling `emscripten.build()` every time.

```js
async () => {
    const emscripten = await import('./node_modules/emscripten-build/src/index.mjs');

    return emscripten.configure()
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
        .then(_ => emscripten.clean({
            "clean": {
                "paths": [ "/path/to/obj" ]
            }
        }))
};
```

Note that this package is an ECMAScript module. If you wish to use it from CommonJS,
you will need to call `await import()` instead of `require()`.

## Custom Command

With `run()`, you can run any command inside the EMSDK environment. When you call this
method, it executes immediately. It does not return a bootstrap.

```js
async () => {
    const emscripten = await import('./node_modules/emscripten-build/src/index.mjs');

    return emscripten.run('command',
        ['args1','args2','args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    )
        .then(_ => { /*...*/ })
};
```

You can also invoke `run()` on an existing bootstrap. In this case, it can be chained
with other bootstrap calls.

```js
async () => {
    const emscripten = await import('./node_modules/emscripten-build/src/index.mjs');

    return emscripten.build()
        .then(bootstrap => bootstrap.run('command', 
            ['args1', 'args2', 'args3', /*...*/],
            { /* child_process.spawn options, e.g., cwd */ }
        ));
}
```

## Make Configuration

Make does not have `configure` parameters. As such, the
`emscripten.configure()` call has no effect for Make configs.

### Build

```jsonc
{
    "type": "make",

    "build": {
        // Path which contains Makefile.
        // Default: config["configure"]["path"]
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

    "clean": { /* ... */ }
}
```

### Clean

```jsonc
{
    "type": "make",

    "build": { /* ... */ },

    "clean": {
        // List of paths to clean, e.g., obj and bin directories.
        // Default: []
        "paths": [
            "/path/to/clean/1",
            "/path/to/clean/2",
            /* ... */
        ]
    }
}
```

## `./configure` Configuration

### Configure

```jsonc
{
    "type": "configure",

    "configure": {
        // Path to your source directory which contains ./configure. Required.
        "path": "/path/to/dir/with/CMakeLists",

        // Command line arguments to pass to ./configure.
        // Default: []
        "arguments": [
            "-DCUSTOM1=\"VAL 1\"",
            "-DCUSTOM1=\"VAL 2\""
        ]
    },

    "build": { /* ... */ },
    "clean": { /* ... */ }
}
```

### Build

```jsonc
{
    "type": "configure",

    "configure": { /* ... */ },

    "build": {
        // Path which contains Makefile.
        // Default: config["configure"]["path"]
        "path": "/path/to/dir/with/Makefile",

        // Target to pass to Make
        // Default: None
        "target": "targetName",

        // Arguments to pass to Make
        // Default: []
        "arguments": [
            "-j", "4"
        ]
    },

    "clean": { /* ... */ }
}
```

### Clean

```jsonc
{
    "type": "configure",

    "configure": { /* ... */ },
    "build": { /* ... */ },

    "clean": {
        // List of paths to clean, e.g., obj and bin directories.
        // Default: []
        "paths": [
            "/path/to/clean/1",
            "/path/to/clean/2",
            /* ... */
        ]
    }
}
```

## CMake Configuration

### Configure

```jsonc
{
    "type": "cmake",

    "configure": {
        // Path to your source directory which contains CMakeLists.txt. Required.
        "path": "/path/to/dir/with/CMakeLists",

        // Path to your CMake cache directory.
        // Default: <your_module>/build
        "cachePath": "/path/to/cache/dir",

        // Type of build files to generate. Specify as if you were passing to -G to CMake.
        // Default: "Ninja"
        // Possible values: "Ninja"|"* Makefiles"|"Visual Studio *"
        "generator": "Ninja",

        // Build type.
        // Default: "Release"
        // Possible: "Debug"|"Release"|"RelWithDebInfo"|etc.
        "type": "Release",

        // Path to write output executables. Applies to RUNTIME, LIBRARY, and ARCHIVE targets.
        // Default: <cachePath>
        "outputPath": "/path/to/output/dir",

        // Extra command line arguments, e.g., cache defines.
        // Default: []
        "arguments": [
            "-DCUSTOM1=\"VAL 1\"",
            "-DCUSTOM1=\"VAL 2\""
        ]
    },

    "build": { /* ... */ },
    "clean": { /* ... */ }
}
```

### Build

```jsonc
{
    "type": "cmake",

    "configure": { /* ... */ },

    "build": {
        // The build "path" is hardcoded to config["configure"]["cachePath"].

        // Arguments to pass to ninja, make, etc.
        // Default: []
        "arguments": [
            "-j", "4"
        ]
    },

    "clean": { /* ... */ }
}
```

### Clean

```jsonc
{
    "type": "cmake",

    "configure": { /* ... */ },
    "build": { /* ... */ },

    "clean": {
        // List of paths to clean.
        // Default: [ config["configure"]["cachePath"] ]
        "paths": [
            "/path/to/clean/1",
            "/path/to/clean/2",
            /* ... */
        ]
    }
}
```

## To Do

* [ ] Command line scripts
* [ ] Accept an options object instead of a command line argument array.
* [ ] Cleanup
* [ ] Tests

## License

MIT License.
