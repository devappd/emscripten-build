import Activate from './activate.mjs';
import CMake from './cmake.mjs';
import Make from './make.mjs';
import Configure from './configure.mjs';
import emsdk from 'emsdk-npm';

export function cmake(configDir, cacheDir, options = null) {
    return new CMake(configDir, cacheDir, options);
}

export function make(makeDir, cleanDirs, options = null) {
    return new Make(makeDir, cleanDirs, options);
}

export function configure(configDir, makeDir, cleanDirs = null, options = null) {
    return new Configure(configDir, makeDir, cleanDirs, options);
}

export async function run(command, args = [], opts = {}) {
    await Activate();
    return emsdk.run(command, args, opts);
}
