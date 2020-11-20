#!/usr/bin/env node

import * as emscripten from '../src/index.mjs';

// \todo Replace with yargs implementation
// See https://github.com/marcolovescode/emscripten-build-npm/issues/7

async function main(argv) {
  let args = argv.slice(2);
  let cmd = args.shift();

  // Valid invocations:
  // emscripten run <command> [arg...]
  // emscripten <command> [arg...]
  //
  // NOT emscripten [make|configure|cmake] etc.
  // Will be implemented later.
 
  let missingCmds = ['make', 'configure', 'cmake',
    'build', 'clean', 'reconfigure', 'rebuild', 'compile'];

  // Check for unimplemented commands.
  if (cmd && missingCmds.includes(cmd.toLowerCase()))
    throw new RangeError(`
Error: Command ${cmd} is not implemented.
If you meant to run a program, try:
emscripten run ${cmd} ${args.join(' ')}
    `.trim());

  // Check for unspecified commands.
  if (!cmd ||
    // Empty args is valid for arbitrary commands
    (!args.length && (missingCmds.includes(cmd.toLowerCase()) || cmd === 'run'))
  )
    throw new RangeError(`
emscripten
Usage: emscripten run <command> [arg...]
Runs a given command within the context of the emsdk environment
in the current node project.
    `.trim());

  // Do the command.

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
