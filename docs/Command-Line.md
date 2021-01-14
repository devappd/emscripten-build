# Command Line Usage

| Command | Description
| ------- | -----------
| `emscripten --configure [--no-update] [config_locator]` | Configure the project.
| `emscripten --build [--no-update] [config_locator]` | Build the project and configure it first if there is no build cache.
| `emscripten --clean [--no-update] [config_locator]` | Reset the project's build files.
| `emscripten --install [--no-update] [config_locator]` | Copy the project's build output into a target directory.
| `emscripten --reconfigure [--no-update] [config_locator]` | Clean the project then configure it.
| `emscripten --rebuild [--no-update] [config_locator]` | Clean the project, configure it, then build.
| `emscripten --compile [--no-update] [config_locator]` | Build the project. If the build fails, the project is cleaned then a rebuild is attempted.
| `emscripten --installSDK [--no-update] [config_locator]` | Installs the requested Emscripten SDK version from the given config.

## Skip Updates

Use the `--no-update` flag to skip checking for Emscripten SDK updates. This speeds up your build times where
you call the CLI multiple times. It must be specified as the last parameter before `config_locator`.

## Specifying the config location

In all commands, `config_locator` is optional and refers to either:
* The name of a settings object listed in `emscripten.settings.js`
* Path that contains either `emscripten.settings.js`, `CMakeLists.txt`, `./configure`, or `Makefile`

If `config_locator` is a folder, it will search for the above four files in that order.

If `config_locator` is not specified, it defaults to the `default` settings object name specified in
`emscripten.settings.js`. Or, if there's only one settings object listed in the file, then that sole object
will be selected.

## Chaining Commands

Each command can be chained left-to-right with the same build configuration. This saves on your
build time by eliminating the setup performed when entering separate commands.

For example, this will build and install the given config:

```sh
npx emscripten --build --install [config_locator]
```

For consistency with [node-gyp](https://github.com/nodejs/node-gyp), the first command may omit the `--` prefix.

## Emscripten SDK Usage

You may also run an arbitrary command under the Emscripten SDK. This forces
usage of the `latest` SDK version. This operation cannot be chained with the
above commands:

```sh
npx emscripten <command> [args...]
```

If you need to use a specific SDK version, use the [emscripten-sdk-npm](https://github.com/devappd/emsdk-npm)
commands instead:

```sh
npx emsdk-checkout
# To update SDK tags, run both `npx emsdk-pull` and `npx emsdk update-tags`
npx emsdk install <version>
npx emsdk activate <version>
npx emsdk-run <command> [args...]
```
