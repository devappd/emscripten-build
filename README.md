# emscripten-build-npm

Configure and build a C/C++ project with Emscripten by using node.js.

See example usage of this toolset in [emscripten-npm-examples](https://github.com/marcolovescode/emscripten-npm-examples).

***This package is experimental! API changes are expected (see [issue #11](https://github.com/marcolovescode/emscripten-build-npm/issues/11))!***

## Installation

```sh
npm install --emsdk='/your/install/path' --save-dev git+https://github.com/marcolovescode/emscripten-build-npm.git
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

* [emsdk-npm](https://github.com/marcolovescode/emsdk-npm) -- Installs EMSDK into a location of your choice.
* [cmake-binaries](https://github.com/marcolovescode/cmake-binaries) -- Locates CMake on your system
or installs it into your `node_modules`.
* [ninja-binaries](https://github.com/Banno/ninja-binaries) -- Locates ninja on your system
or installs it into your `node_modules`.
* [msbuild](https://github.com/jhaker/nodejs-msbuild) -- Locates MSBuild (Visual Studio) on your
system. If you wish to use Visual Studio, you'll need to have it installed on your system.

Usage of `make`, `configure`, `mingw32-make`, and any other build toolset, will
require you to install those systems by yourself. Have those commands available
in your PATH.

## Command Line Usage

You may run an arbitrary command under the EMSDK environment:

```sh
emscripten run <command> [args...]
```

Build commands such as `make`, `cmake`, and `configure`, are not yet implemented. See [issue #7](https://github.com/marcolovescode/emscripten-build-npm/issues/7).

## Node.js Usage

See examples below. Note that this package is an ECMAScript module. If you wish to use it from CommonJS,
you will need to call `await import()` instead of `require()`.

1. Instantiate a JS bootstrap using one of the below constructors. Instantiating a bootstrap does not commit any actions on your source files.

    * `emscripten.cmake()`
    * `emscripten.make()`
    * `emscripten.configure()`

2. Call one of these methods on the bootstrap.
    
    * `bootstrap.configure()`
    * `bootstrap.build()` or `bootstrap.make()`
    * `bootstrap.clean()`
    * `bootstrap.reconfigure()`
    * `bootstrap.rebuild()`
    * `bootstrap.compile()`

3. You can call multiple bootstrap methods as a Promise chain.

## CMake

Note that you need to specify the generator as part of your `options` arguments.

* `emscripten.cmake(configDir, cacheDir, options)`
    * `configDir` -- Path to `CMakeLists.txt` without the filename.
    * `cacheDir` -- Path to store CMake build files
    * `options` -- Array of command line argument strings when configuring.
* `emscripten.cmake(configDir, options)`
    * Same as above, but `cacheDir` defaults to a subdirectory `build/` of the main module you are running.

```js
async function ...() {
    const emscripten = await import('emscripten-build');

    let bootstrap = emscripten.cmake('path/to/dir/with/CMakeLists', 'path/to/build/dir', [
        '-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release', '-DCUSTOM=VAL', /*...*/
    ])

    return bootstrap.configure()
        .then(bs => bs.build());
}

// Or, you can call bootstrap.build() by itself.
// Your build will be configured automatically, but any changes
// to your options will not be reflected unless you configure() or clean().
```

## Makefile

Note that the `options` parameter applies to the `make` step instead of the `configure` step as with the other classes.

`bootstrap.configure()` has no effect in this class.

* `emscripten.make(makeDir, cleanDirs, options)`
    * `makeDir` -- Path to `Makefile` without the filename.
    * `cleanDirs` -- Array of directories to clear when calling `clean()`.
    * `options` -- Array of command line argument strings when calling `build()`.
* `emscripten.make(makeDir, options)`
    * Same as above, but `cleanDirs` will be empty. The `clean()` method will have no effect and emit a warning.

```js
async function ...() {
    const emscripten = await import('emscripten-build');

    let bootstrap = emscripten.make('path/to/dir/with/Makefile', [
        '-FLAGS', '-DDEFINE1=value1', '-DDEFINE2=value2'
    ])

    return bootstrap.build('target')
        .then(bs => { /* ... */ });
}
```

## Configure

* `emscripten.configure(configDir, makeDir, cleanDirs, options)`
    * `configDir` -- Path to `./configure` without the filename.
    * `makeDir` -- Path to output `Makefile` without the filename.
    * `cleanDirs` -- Array of directories to clear when calling `clean()`.
    * `options` -- Array of command line argument strings when configuring.
* `emscripten.configure(configDir, cleanDirs, options)`
    * Same as above, but `makeDir` defaults to the same value as `configDir`.
* `emscripten.configure(configDir, options)`
    * Same as above, but `cleanDirs` will be empty. The `clean()` method will have no effect and emit a warning.

```js
async function ...() {
    const emscripten = await import('emscripten-build');

    let bootstrap = emscripten.configure('path/to/dir/with/configure', [
        '-FLAGS', '-DEFINE1=value1', '-DEFINE2=value2'
    ])

    return bootstrap.configure()
        .then(bs => bs.build('target'));
}


// Or, you can call bootstrap.build() by itself.
// Your build will be configured automatically, but any changes
// to your options will not be reflected unless you configure() or clean().
```

## Custom Command

With `run()`, you can run any command inside the EMSDK environment. When you call this
method, it executes immediately. It does not return a bootstrap.

```js
async function ...() {
    const emscripten = await import('emscripten-build');

    return emscripten.run('command',
        ['args1','args2','args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    )
        .then(_ => { /*...*/ })
}
```

You can also invoke `run()` on an existing bootstrap. In this case, it can be chained
with other bootstrap calls.

```js
async function ...() {
    const emscripten = await import('emscripten-build');

    let bootstrap = emscripten.make(/*...*/);

    return bootstrap.run('command', 
        ['args1', 'args2', 'args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    )
        .then(bs => { /* ... */ });
}
```

## Bootstrap Methods

All parameters are optional.

* `bootstrap.configure(options)` -- Configure the project.
    * `options` -- Array of command line arguments for the `configure` step. Defaults to the `options` that you set during instantiation.

* `bootstrap.build(target, options)`, `bootstrap.build(options)` -- Build the project (will configure first if required). You may also use `bootstrap.make()` as an alias.
    * `target` -- Make build target, e.g., `install`. Defaults to no specified target.
    * `makeOptions` -- Array of command line arguments for the `make` step. Defaults to no arguments.

* `bootstrap.clean(cleanDirs)` -- Clean the project directory.
    * `cleanDirs` -- Array of directories to clean. Defaults to the `cleanDirs` that you set during instantiation.

* `bootstrap.reconfigure(options)` -- Clean the project directory then configure the project.
    * `options` -- Array of command line arguments for the `configure` step. If you specify options here, then they will be set as the new default configuration options. If this is not specified, this defaults to the previous default options, e.g., what you set during instantiation.

* `bootstrap.rebuild(target, makeOptions)`, `bootstrap.rebuild(makeOptions)` -- Clean the project directory then configure and build the project.
    * `target` -- Make build target, e.g., `install`. Defaults to no specified target.
    * `makeOptions` -- Array of command line arguments for the `make` step. Defaults to no arguments.

* `bootstrap.compile(target, makeOptions)`, `bootstrap.compile(makeOptions)` -- Build the project, and if build fails, try a full rebuild.
    * `target` -- Make build target, e.g., `install`. Defaults to no specified target.
    * `makeOptions` -- Array of command line arguments for the `make` step. Defaults to no arguments.

## To Do

* [ ] Command line scripts
* [ ] Accept an options object instead of a command line argument array.
* [ ] Cleanup
* [ ] Tests

## License

MIT License.
