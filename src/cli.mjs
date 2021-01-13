#!/usr/bin/env node

import * as emscripten from './index.mjs';

async function main(argv) {
  let args = argv.slice(2);

  let firstCmd = true;
  let cmd = args.shift();

  if (typeof cmd === 'string')
    cmd = cmd.toLowerCase();

  // Check for unspecified commands.
  if (!cmd
    // Run cmd requires at least one parameter
    || (!args.length && (cmd === 'run'))
    || cmd === '--help' || cmd === '-h' || cmd === '-?' || cmd === 'help'
  )
    throw new RangeError(`
emscripten-build

Build Usage: 

emscripten --configure [--no-update] [config_locator]

    Configure the project.

emscripten --build [--no-update] [config_locator]

    Build the project and configure it first if necessary.

emscripten --clean [--no-update] [config_locator]

    Reset the project's build directories.

emscripten --install [--no-update] [config_locator]

    Install the project's build files per the Makefile target.

emscripten --reconfigure [--no-update] [config_locator]

    Clean the project then configure it.

emscripten --rebuild [--no-update] [config_locator]

    Clean the project, configure it, then build.

emscripten --compile [--no-update] [config_locator]

    Build the project. If the build fails, the project is cleaned then
    a rebuild is attempted.

emscripten --installSDK [--no-update] [config_locator]

    Install the given EMSDK version into the given path, per the build
    settings.

Specify --no-update to skip updating the Emscripten SDK. By default,
this command will check for updates on every call.

A [config_locator] is the path to a settings or build configuration; or
the path to a directory containing such a file; or the name of a
settings object listed in "emscripten.settings.js". Default: "<cwd>"

Each command can be chained left-to-right with the same configuration.
For example, this builds and installs the given project without
updating the SDK:

    emscripten --build --install --no-update [config_locator]

------------------------------------------------------------------------

Emscripten SDK Usage:

emscripten run <command> [arg...]
emscripten <command> [arg...]

    Runs an arbitrary command within the context of the Emscripten SDK
    environment. Forces the "latest" SDK version. This command cannot be
    chained.
`.trimLeft());

  let configLocator = null;
  let bootstrap;

  do {
    // Check for standard command.
    let verbs = ['configure','build','clean',
      'reconfigure','rebuild','compile', 'install', 'installsdk'];
    
    let verbCmd = cmd.toLowerCase().replace(/^-{2}/g, '');

    // Verbs start with --, but OPTIONALLY the first verb can omit the --
    // for consistency with node-gyp.
    if ((cmd.startsWith('--') || firstCmd)
        && verbs.indexOf(verbCmd) >= 0
    ) {
      if (firstCmd) {
        // Now that we know we're running build settings, handle --no-update
        let noUpdate = args.findIndex(item => '--no-update' === item.toLowerCase());
        if (noUpdate >= 0) {
          args.splice(noUpdate, 1);
          emscripten.disableEmSDKUpdates();
        }

        // Get the configLocator at the end of the cmd string. This never
        // starts with --
        if (args.length) {
          let test = args[args.length-1];
          if (!test.startsWith('--'))
            configLocator = args.pop();
        }
      }

      // installSDK is not a bootstrap verb itself, but it does return
      // a bootstrap.
      if (verbCmd === 'installsdk')
        bootstrap = await emscripten.installSDK(configLocator);
      else if (firstCmd)
        bootstrap = await emscripten[verbCmd](configLocator);
      else
        bootstrap = await bootstrap[verbCmd]();

      // Chain next command
      firstCmd = false;
      continue;
    } else if (firstCmd) {
      // Run an arbitrary command
      if (verbCmd === 'run')
        cmd = args.shift();

      return emscripten.run(cmd, args,
        { shell: (process.platform === 'win32') }
      );
    } else
      throw new RangeError(`Invalid argument: ${cmd}`);
  } while((cmd = args.shift()) && typeof cmd === 'string');
}

main(process.argv)
.then(_ => process.exit(0))
.catch(err => {
  console.error(err.message);
  process.exit(1);
});
