import path from 'path';
import Activate from './activate.mjs';
import emsdk from 'emsdk-npm';
import shell from 'shelljs';
import fs from 'fs';

export default class Bootstrap {
  constructor(configDir, makeDir, cleanDirs, options) {
    this.configDir = path.resolve(configDir);
    this.makeDir = path.resolve(makeDir);
    // validation is done in clean().
    this.cleanDirs = cleanDirs;
    this.options = options;

    this.configCommand = null;
    this.configSubCommand = null;

    this.makeCommand = null;
    this.makeSubCommand = null;
  }

  _processOptions(options) {
    options = options || this.options;

    if (options instanceof Array)
      return options;
    throw new TypeError('Options for this class must be an array of command args.');
  }

  async __preCommand() {
    await Activate();
  }

  async _bindCommand(ctx, impl, ...args) {
    await this.__preCommand();
    await impl.call(ctx, ...args);
    return ctx;
  }

  async configure(options) {
    // Implemented by child class
    console.warn(configure.name + ' is not implemented in this class.');
    return this;
  }

  async build(target, options) {
    // Implemented by child class
    console.warn(build.name + ' is not implemented in this class.');
    return this;
  }

  async make(target, options) {
    // Alias for build. Subclasses should not implement this.
    return this.build(target, options);
  }

  // Subclasses should not need to implement this, but may do
  // so for special handling.
  async clean(cleanDirs) {
    if (!cleanDirs)
      cleanDirs = this.cleanDirs;

    if (typeof cleanDirs === 'string')
      cleanDirs = [cleanDirs];

    if (!(cleanDirs instanceof Array) || cleanDirs.length < 1) {
      console.warn('bootstrap::clean() has no paths to clean up. Your build will not be cleaned!');
      return this;
    }

    for (const dir of cleanDirs) {
      if (!dir)
        continue;

      let rmDir = path.resolve(dir);

      if (!fs.lstatSync(rmDir).isDirectory()) {
        console.warn(`Dir ${rmDir} is not a directory. Skipping...`);
        continue;
      }

      console.log(`Cleaning dir ${rmDir}...`);

      try {
        shell.rm('-rf', path.join(rmDir, '*'));
      } catch(e) {
        console.warn(`Could not clean ${rmDir}`, e.message);
      }
    }

    return this;
  }

  async reconfigure(options) {
    // Implemented by child class
    console.warn(reconfigure.name + ' is not implemented in this class.');
    return this;
  }

  async rebuild(target, makeOptions) {
    // Implemented by child class
    console.warn(rebuild.name + ' is not implemented in this class.');
    return this;
  }

  async compile(target, makeOptions) {
    // Implemented by child class
    console.warn(compile.name + ' is not implemented in this class.');
    return this;
  }

  // Special command available to all bootstrap chains.
  // Subclasses should not define this.
  async run(command, args, opts = {}) {
    await this.__preCommand();
    await emsdk.run(command, args, opts);
    return this;
  }
}
