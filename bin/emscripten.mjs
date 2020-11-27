#!/usr/bin/env node

import * as emscripten from '../src/index.mjs';

async function main(argv) {
  let args = argv.slice(2);
  let cmd = args.shift();

  if (typeof cmd === 'string')
    cmd = cmd.toLowerCase();

  // Valid invocations:
  //
  // emscripten configure [config_name]
  // emscripten build [config_name]
  // emscripten clean [config_name]
  // emscripten install [config_name]
  // emscripten reconfigure [config_name]
  // emscripten rebuild [config_name]
  // emscripten compile [config_name]
  // emscripten installSDK <version> [install_path]
  // emscripten run <command> [arg...]
  // emscripten <command> [arg...]

  // Check for unspecified commands.
  if (!cmd
    // Run cmd requires at least one parameter
    || (!args.length && (cmd === 'run'))
    || cmd === '--help' || cmd === '-h' || cmd === '-?' || cmd === 'help'
  )
    throw new RangeError(`
emscripten-build

Usage: 

emscripten configure [config_name]

    Configure the project.

emscripten build [config_name]

    Build the project and configure it first if necessary.

emscripten clean [config_name]

    Reset the project's build directories.

emscripten install [config_name]

    Install the project's build files per the Makefile target.

emscripten reconfigure [config_name]

    Clean the project then configure it.

emscripten rebuild [config_name]

    Clean the project, configure it, then build.

emscripten compile [config_name]

    Build the project. If the build fails, the project is cleaned then
    a rebuild is attempted.

emscripten installSDK [config_name]

    Install the given EMSDK version into the given path, per the build
    configuration.

emscripten run <command> [arg...]
emscripten <command> [arg...]

    Runs a given command within the context of the emsdk environment
    in the current node project.
`.trimLeft());

  // Call the standard commands
  let verbs = ['configure','build','clean',
    'reconfigure','rebuild','compile', 'install', 'installSDK'];
  
  if (verbs.indexOf(cmd) >= 0) {
    let configKey = (args.length) ? args.shift() : null;
    return emscripten[cmd](configKey);
  }

  // Else, run an arbitrary command
  if (cmd === 'run')
    cmd = args.shift();

  return emscripten.run(cmd, args,
    { shell: (process.platform === 'win32') }
  );
}

main(process.argv)
.then(_ => process.exit(0))
.catch(err => {
  console.error(err.message);
  process.exit(1);
});
