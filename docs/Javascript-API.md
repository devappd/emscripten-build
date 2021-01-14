# JavaScript API

This package provides a JavaScript API which maps to the command line interface:
    
* `emscripten.configure(configLocator, settingsFragment)`
    * Configure the project.
* `emscripten.build(configLocator, settingsFragment)`
    * Build the project and configure it first if there is no build cache.
* `emscripten.clean(configLocator, settingsFragment)`
    * Reset the project's build files.
* `emscripten.install(configLocator, settingsFragment)`
    * Copy the project's build output into a target directory.
* `emscripten.reconfigure(configLocator, settingsFragment)`
    * Clean the project then configure it.
* `emscripten.rebuild(configLocator, settingsFragment)`
    * Clean the project, configure it, then build.
* `emscripten.compile(configLocator, settingsFragment)`
    * Build the project. If the build fails, the project is cleaned then a rebuild is attempted.
* `emscripten.installSDK(configLocator, settingsFragment)`
    * Installs the requested EMSDK version from the given config.

For all methods, both parameters are optional.

| Parameter    | Description |
| ------------ | ------------|
| `configLocator` | A path that contains `emscripten.settings.js`, `CMakeLists.txt`, `Makefile`, or `./configure`; or the key of a settings object specified in `emscripten.settings.js`; or a [valid build settings object](https://github.com/devappd/emscripten-build-npm/blob/main/docs/Build-Settings.md).
| `settingsFragment` | An object with properties to overwrite on your selected settings object. This performs a deep merge on your settings object. This parameter is not valid if you specify `configLocator` as an object.

Calling these methods will perform the action and return a Promise that yields a Bootstrap object.
On the Bootstrap object, you can chain multiple calls while reusing the same settings.

```js
const emscripten = require('emscripten-build');

emscripten.configure()
    .then(em => em.build())
    .then(em => em.install());
    .then(em => em.clean());
```

However, you cannot select a new settings object in the chained bootstrap nor specify a fragment to edit it. If you wish to do so, you need to create a new bootstrap by calling a method on the `emscripten` module.

You can specify a settings fragment to override certain parameters in your config. Note in this example that we're not chaining calls on `bootstrap`, but we are calling `emscripten.build()` when we provide a settings fragment.

```js
const emscripten = require('emscripten-build');

emscripten.configure()
    .then(() => emscripten.build({
        "build": {
            "target": "MainProject"
        }
    }))
    .then(() => emscripten.build({
        "build": {
            "target": "SubProject"
        }
    }))
    .then(em => em.install());
```

## Emscripten SDK Usage

With `emscripten.run()`, you can run any command under the Emscripten SDK. This forces usage of
the `latest` SDK version. It does not return a bootstrap.

```js
const emscripten = require('emscripten-build');

emscripten.run('command',
    ['args1','args2','args3', /*...*/],
    { /* child_process.spawn options, e.g., cwd */ }
)
    .then(() => { /*...*/ });
```

You can also invoke `run()` on an existing bootstrap. In this case, it can be chained
with other bootstrap calls, and it uses the SDK version specified in your build settings:

```js
const emscripten = require('emscripten-build');

emscripten.build()
    .then(em => em.run('command', 
        ['args1', 'args2', 'args3', /*...*/],
        { /* child_process.spawn options, e.g., cwd */ }
    ));
```

By default, updates are checked for Emscripten SDK once per runtime. You may modify this
behavior as follows:

| API | Description
| ------- | -----------
| `emscripten.forceEmSDKUpdates()` | Check for EMSDK updates on every SDK call in the current runtime.
| `emscripten.disableEmSDKUpdates()` | Never check for EMSDK updates in the current runtime.
| `emscripten.resetEmSDKUpdates()` | Reset to default update check behavior.
